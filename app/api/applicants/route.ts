import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { findApplicantByPan, normalizePan } from '@/lib/applicants';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const user = await requireUser();

    const applicants = await db.applicant.findMany({
      where: { userId: user.id, status: { not: 'DRAFT' } },
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: { select: { documents: true, incidents: { where: { resolved: false } } } },
      },
    });

    return NextResponse.json({ applicants });
  } catch (err) {
    if (err instanceof Error && err.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('GET /api/applicants error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json();

    const name = (body.name || '').trim();
    const email = (body.email || '').trim() || null;
    const phone = (body.phone || '').trim() || null;
    const panNumber = normalizePan(body.panNumber);

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    // Dedup: if PAN is provided and already exists for this user, return that one with a flag
    if (panNumber) {
      const existing = await findApplicantByPan(user.id, panNumber);
      if (existing) {
        return NextResponse.json(
          { applicant: existing, existed: true },
          { status: 200 }
        );
      }
    }

    const applicant = await db.applicant.create({
      data: {
        userId: user.id,
        name,
        email,
        phone,
        panNumber,
        status: 'PENDING',
        source: 'MANUAL',
      },
    });

    return NextResponse.json({ applicant, existed: false }, { status: 201 });
  } catch (err) {
    if (err instanceof Error && err.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('POST /api/applicants error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
