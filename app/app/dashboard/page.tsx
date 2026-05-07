import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import Link from 'next/link';
import QuickVerifyDropZone from '@/components/QuickVerifyDropZone';

export default async function DashboardPage() {
  const user = await requireUser();

  const [totalApplicants, pendingApplicants, openIncidents, approvedApplicants, recentApplicants] =
    await Promise.all([
      db.applicant.count({ where: { userId: user.id, status: { not: 'DRAFT' } } }),
      db.applicant.count({
        where: { userId: user.id, status: { in: ['PENDING', 'IN_REVIEW'] } },
      }),
      db.incident.count({
        where: { applicant: { userId: user.id }, resolved: false },
      }),
      db.applicant.count({ where: { userId: user.id, status: 'APPROVED' } }),
      db.applicant.findMany({
        where: { userId: user.id, status: { not: 'DRAFT' } },
        orderBy: { updatedAt: 'desc' },
        take: 5,
        include: { _count: { select: { documents: true } } },
      }),
    ]);

  const stats = [
    { label: 'Total applicants', value: totalApplicants },
    { label: 'Pending review', value: pendingApplicants },
    { label: 'Open incidents', value: openIncidents },
    { label: 'Approved', value: approvedApplicants },
  ];

  return (
    <div className="max-w-5xl mx-auto px-8 py-12">
      {/* Header */}
      <div className="mb-10 flex items-end justify-between gap-6 flex-wrap">
        <div>
          <p className="text-zinc-500 text-xs font-mono uppercase tracking-widest mb-2">
            Dashboard
          </p>
          <h1 className="text-3xl font-bold text-white tracking-tight">Welcome back</h1>
          <p className="text-zinc-500 text-sm mt-1 font-mono">{user.email}</p>
        </div>
        <Link
          href="/app/applicants/new"
          className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black text-sm font-mono font-semibold transition-colors"
        >
          + New applicant
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-10">
        {stats.map(({ label, value }) => (
          <div key={label} className="rounded-xl bg-zinc-900 border border-zinc-800 p-4">
            <p className="text-zinc-500 text-xs font-mono uppercase tracking-widest mb-2">{label}</p>
            <p className="text-2xl font-semibold text-zinc-100">{value}</p>
          </div>
        ))}
      </div>

      {/* Quick Verify */}
      <div className="mb-10">
        <p className="text-zinc-400 text-xs font-mono uppercase tracking-widest mb-3">
          Quick verify
        </p>
        <QuickVerifyDropZone />
      </div>

      {/* Recent applicants */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-zinc-400 text-xs font-mono uppercase tracking-widest">
            Recent applicants
          </p>
          {recentApplicants.length > 0 && (
            <Link href="/app/applicants" className="text-zinc-500 hover:text-zinc-300 text-xs font-mono">
              View all →
            </Link>
          )}
        </div>

        {recentApplicants.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-zinc-800 bg-zinc-900/30 p-10 text-center">
            <p className="text-zinc-300 text-sm">No applicants yet</p>
            <p className="text-zinc-500 text-xs mt-1">
              Create one above, or drop a document to Quick Verify.
            </p>
          </div>
        ) : (
          <div className="rounded-xl bg-zinc-900 border border-zinc-800 divide-y divide-zinc-800/60">
            {recentApplicants.map((a) => (
              <Link
                key={a.id}
                href={`/app/applicants/${a.id}`}
                className="flex items-center justify-between px-4 py-3 hover:bg-zinc-800/40 transition-colors"
              >
                <div>
                  <p className="text-zinc-100 text-sm font-medium">{a.name}</p>
                  <p className="text-zinc-500 text-xs font-mono mt-0.5">
                    {a.panNumber || '— no PAN —'} · {a._count.documents} doc
                    {a._count.documents !== 1 ? 's' : ''}
                  </p>
                </div>
                <StatusPill status={a.status} />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    PENDING: 'bg-amber-500/15 border-amber-500/40 text-amber-300',
    IN_REVIEW: 'bg-orange-500/15 border-orange-500/40 text-orange-300',
    APPROVED: 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300',
    REJECTED: 'bg-red-500/15 border-red-500/40 text-red-300',
    DRAFT: 'bg-zinc-700/40 border-zinc-600/40 text-zinc-400',
  };
  const cls = map[status] || map.PENDING;
  return (
    <span
      className={`text-[10px] font-mono uppercase tracking-widest px-2 py-1 rounded-md border ${cls}`}
    >
      {status.replace('_', ' ')}
    </span>
  );
}
