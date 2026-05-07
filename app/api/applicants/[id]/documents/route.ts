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
const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id: applicantId } = await params;

    // Verify the applicant belongs to this user
    const applicant = await db.applicant.findFirst({
      where: { id: applicantId, userId: user.id },
    });
    if (!applicant) {
      return NextResponse.json({ error: 'Applicant not found' }, { status: 404 });
    }

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

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { url } = await saveFile(buffer, file.name, applicantId);
    const docType = detectDocType(file.name);

    const document = await db.document.create({
      data: {
        applicantId,
        fileName: file.name,
        fileUrl: url,
        fileType: file.type,
        docType,
      },
    });

    const jobId = await startPipelineForDocument(document.id);

    return NextResponse.json({
      document,
      jobId,
    });
  } catch (err) {
    if (err instanceof Error && err.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('POST /api/applicants/[id]/documents error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
