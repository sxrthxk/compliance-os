import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { saveFile } from '@/lib/storage';
import { startPipelineForDocument } from '@/lib/pipeline';
import { detectDocType } from '@/lib/applicants';

export const runtime = 'nodejs';
export const maxDuration = 60;

const ALLOWED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
];
const MAX_SIZE = 10 * 1024 * 1024;

/**
 * Quick Verify entry point.
 * Creates a DRAFT applicant with a placeholder name (e.g. "New applicant — Sept 30").
 * After Agent 01 finishes, the client navigates to the applicant page where the
 * confirmation banner lets the operator review extracted identity, edit if needed,
 * and confirm. PAN-based dedup runs at confirm time.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();

    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Unsupported file type. Please upload a PDF or image.' },
        { status: 400 }
      );
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'File too large. Max 10MB.' }, { status: 400 });
    }

    // Create a draft applicant first so we have an ID for the file path.
    const placeholderName = `New applicant — ${new Date().toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })}`;

    const applicant = await db.applicant.create({
      data: {
        userId: user.id,
        name: placeholderName,
        status: 'DRAFT',
        source: 'AUTO_EXTRACTED',
      },
    });

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { url } = await saveFile(buffer, file.name, applicant.id);
    const docType = detectDocType(file.name);

    const document = await db.document.create({
      data: {
        applicantId: applicant.id,
        fileName: file.name,
        fileUrl: url,
        fileType: file.type,
        docType,
      },
    });

    const jobId = await startPipelineForDocument(document.id);

    return NextResponse.json({
      applicantId: applicant.id,
      documentId: document.id,
      jobId,
    });
  } catch (err) {
    if (err instanceof Error && err.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('POST /api/quick-verify error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
