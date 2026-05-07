import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { findApplicantByPan, normalizePan } from '@/lib/applicants';

export const runtime = 'nodejs';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;

    const applicant = await db.applicant.findFirst({
      where: { id, userId: user.id },
      include: {
        documents: {
          orderBy: { createdAt: 'desc' },
          include: {
            jobs: { orderBy: { createdAt: 'desc' }, take: 1 },
          },
        },
        incidents: { orderBy: { createdAt: 'desc' } },
        crossDocChecks: { orderBy: { runAt: 'desc' } },
      },
    });

    if (!applicant) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({ applicant });
  } catch (err) {
    if (err instanceof Error && err.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('GET /api/applicants/[id] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const body = await req.json();

    const existing = await db.applicant.findFirst({ where: { id, userId: user.id } });
    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updates: any = {};
    if (typeof body.name === 'string' && body.name.trim()) updates.name = body.name.trim();
    if ('email' in body) updates.email = body.email?.trim() || null;
    if ('phone' in body) updates.phone = body.phone?.trim() || null;
    if ('status' in body) updates.status = body.status;

    if ('panNumber' in body) {
      const normalized = normalizePan(body.panNumber);
      // If PAN is being added/changed, dedup-check against this user's other applicants
      if (normalized && normalized !== existing.panNumber) {
        const conflict = await findApplicantByPan(user.id, normalized);
        if (conflict && conflict.id !== id) {
          return NextResponse.json(
            {
              error: 'pan_conflict',
              message: 'Another applicant already has this PAN',
              conflictingApplicantId: conflict.id,
            },
            { status: 409 }
          );
        }
      }
      updates.panNumber = normalized;
    }

    // If this is a DRAFT being confirmed, flip to PENDING
    if (existing.status === 'DRAFT' && body.confirm === true) {
      updates.status = 'PENDING';
    }

    const applicant = await db.applicant.update({
      where: { id },
      data: updates,
    });

    return NextResponse.json({ applicant });
  } catch (err) {
    if (err instanceof Error && err.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('PATCH /api/applicants/[id] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;

    const existing = await db.applicant.findFirst({ where: { id, userId: user.id } });
    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    await db.applicant.delete({ where: { id } });

    return NextResponse.json({ deleted: true });
  } catch (err) {
    if (err instanceof Error && err.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('DELETE /api/applicants/[id] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
