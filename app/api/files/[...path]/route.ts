import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { readFile } from '@/lib/storage';
import path from 'path';

export const runtime = 'nodejs';

/**
 * Streams a file from local storage. Auth-checked: file must belong to an
 * applicant owned by the calling user.
 *
 * URL shape: /api/files/<applicantId>/<filename>
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const user = await requireUser();
    const { path: pathParts } = await params;

    if (!pathParts || pathParts.length < 2) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
    }

    const [applicantId] = pathParts;

    // Auth: applicant must belong to this user
    const applicant = await db.applicant.findFirst({
      where: { id: applicantId, userId: user.id },
    });
    if (!applicant) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const storagePath = pathParts.join('/');
    const buffer = await readFile(storagePath);

    const ext = path.extname(pathParts[pathParts.length - 1]).toLowerCase();
    const mimeMap: Record<string, string> = {
      '.pdf': 'application/pdf',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.webp': 'image/webp',
    };
    const contentType = mimeMap[ext] || 'application/octet-stream';

    return new Response(new Uint8Array(buffer), {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch (err) {
    if (err instanceof Error && err.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('GET /api/files error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
