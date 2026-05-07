import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import Link from 'next/link';

export default async function ApplicantsPage() {
  const user = await requireUser();

  const applicants = await db.applicant.findMany({
    where: { userId: user.id, status: { not: 'DRAFT' } },
    orderBy: { updatedAt: 'desc' },
    include: {
      _count: {
        select: {
          documents: true,
          incidents: { where: { resolved: false } },
        },
      },
    },
  });

  return (
    <div className="max-w-5xl mx-auto px-8 py-12">
      <div className="mb-8 flex items-end justify-between gap-6 flex-wrap">
        <div>
          <p className="text-zinc-500 text-xs font-mono uppercase tracking-widest mb-2">
            Applicants
          </p>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            All applicants ({applicants.length})
          </h1>
        </div>
        <Link
          href="/app/applicants/new"
          className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black text-sm font-mono font-semibold transition-colors"
        >
          + New applicant
        </Link>
      </div>

      {applicants.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-zinc-800 bg-zinc-900/30 p-16 text-center">
          <p className="text-zinc-200 text-base font-medium">No applicants yet</p>
          <p className="text-zinc-500 text-sm mt-1">
            Create one manually, or drop a document on the dashboard for Quick Verify.
          </p>
        </div>
      ) : (
        <div className="rounded-xl bg-zinc-900 border border-zinc-800 divide-y divide-zinc-800/60">
          {applicants.map((a) => (
            <Link
              key={a.id}
              href={`/app/applicants/${a.id}`}
              className="flex items-center justify-between px-4 py-4 hover:bg-zinc-800/40 transition-colors"
            >
              <div className="min-w-0 flex-1">
                <p className="text-zinc-100 text-sm font-medium truncate">{a.name}</p>
                <p className="text-zinc-500 text-xs font-mono mt-0.5">
                  {a.panNumber || '— no PAN —'} · {a._count.documents} doc
                  {a._count.documents !== 1 ? 's' : ''}
                  {a._count.incidents > 0 && (
                    <span className="text-amber-400 ml-2">
                      · {a._count.incidents} open incident
                      {a._count.incidents !== 1 ? 's' : ''}
                    </span>
                  )}
                </p>
              </div>
              <StatusPill status={a.status} />
            </Link>
          ))}
        </div>
      )}
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
      className={`shrink-0 ml-4 text-[10px] font-mono uppercase tracking-widest px-2 py-1 rounded-md border ${cls}`}
    >
      {status.replace('_', ' ')}
    </span>
  );
}
