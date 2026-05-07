import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import ApplicantConfirmBanner from '@/components/ApplicantConfirmBanner';
import ApplicantDocUpload from '@/components/ApplicantDocUpload';

export default async function ApplicantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;

  const applicant = await db.applicant.findFirst({
    where: { id, userId: user.id },
    include: {
      documents: {
        orderBy: { createdAt: 'desc' },
        include: { jobs: { orderBy: { createdAt: 'desc' }, take: 1 } },
      },
      incidents: {
        where: { resolved: false },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!applicant) notFound();

  const isDraft = applicant.status === 'DRAFT';

  return (
    <div className="max-w-3xl mx-auto px-8 py-12">
      <Link
        href="/app/applicants"
        className="text-zinc-500 hover:text-zinc-300 text-sm font-mono mb-8 inline-block transition-colors"
      >
        ← Back to applicants
      </Link>

      {/* Draft confirmation banner */}
      {isDraft && (
        <div className="mb-8">
          <ApplicantConfirmBanner
            applicantId={applicant.id}
            initialName={applicant.name}
            initialEmail={applicant.email}
            initialPhone={applicant.phone}
            initialPan={applicant.panNumber}
          />
        </div>
      )}

      {/* Header */}
      <div className="mb-8 flex items-start justify-between gap-6 flex-wrap">
        <div>
          <p className="text-zinc-500 text-xs font-mono uppercase tracking-widest mb-2">
            Applicant
          </p>
          <h1 className="text-2xl font-bold text-white tracking-tight">{applicant.name}</h1>
          <p className="text-zinc-500 text-sm mt-1 font-mono">
            {applicant.panNumber || '— no PAN —'}
            {applicant.email && ` · ${applicant.email}`}
            {applicant.phone && ` · ${applicant.phone}`}
          </p>
        </div>
        <StatusPill status={applicant.status} />
      </div>

      {/* Open incidents banner */}
      {applicant.incidents.length > 0 && (
        <div className="rounded-xl bg-amber-950/30 border border-amber-800/50 p-4 mb-8">
          <p className="text-amber-400 text-xs font-mono uppercase tracking-widest mb-2">
            ⚠ {applicant.incidents.length} open incident
            {applicant.incidents.length !== 1 ? 's' : ''}
          </p>
          <ul className="space-y-1">
            {applicant.incidents.slice(0, 3).map((inc) => (
              <li key={inc.id} className="text-amber-200 text-sm">
                · {inc.type.replace(/_/g, ' ').toLowerCase()}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Upload zone */}
      <div className="mb-8">
        <p className="text-zinc-400 text-xs font-mono uppercase tracking-widest mb-3">
          Add document
        </p>
        <ApplicantDocUpload applicantId={applicant.id} />
      </div>

      {/* Document timeline */}
      <div>
        <p className="text-zinc-400 text-xs font-mono uppercase tracking-widest mb-3">
          Documents ({applicant.documents.length})
        </p>

        {applicant.documents.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-zinc-800 bg-zinc-900/30 p-10 text-center">
            <p className="text-zinc-400 text-sm">No documents yet</p>
            <p className="text-zinc-600 text-xs mt-1 font-mono">
              Drop a document above to start verification
            </p>
          </div>
        ) : (
          <div className="rounded-xl bg-zinc-900 border border-zinc-800 divide-y divide-zinc-800/60">
            {applicant.documents.map((doc) => {
              const lastJob = doc.jobs[0];
              return (
                <Link
                  key={doc.id}
                  href={`/app/applicants/${applicant.id}/docs/${doc.id}`}
                  className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-zinc-800/40 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-zinc-100 text-sm font-medium truncate">{doc.fileName}</p>
                    <p className="text-zinc-500 text-xs font-mono mt-0.5">
                      {prettyDocType(doc.docType)} ·{' '}
                      {new Date(doc.createdAt).toLocaleString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                  {lastJob && <JobPill job={lastJob} />}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function prettyDocType(t: string): string {
  const map: Record<string, string> = {
    bank_statement: 'Bank Statement',
    salary_slip: 'Salary Slip',
    form_26as: 'Form 26AS',
    rent_agreement: 'Rent Agreement',
    emandate: 'eMandate',
  };
  return map[t] || t;
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
      className={`text-[10px] font-mono uppercase tracking-widest px-2.5 py-1 rounded-md border ${cls}`}
    >
      {status.replace('_', ' ')}
    </span>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function JobPill({ job }: { job: any }) {
  if (job.status === 'PROCESSING' || job.status === 'PENDING') {
    return (
      <span className="text-[10px] font-mono uppercase tracking-widest px-2 py-1 rounded-md border bg-amber-500/15 border-amber-500/40 text-amber-300">
        Running
      </span>
    );
  }
  if (job.status === 'ERROR') {
    return (
      <span className="text-[10px] font-mono uppercase tracking-widest px-2 py-1 rounded-md border bg-red-500/15 border-red-500/40 text-red-300">
        Error
      </span>
    );
  }
  const verdict = job.verification?.verdict;
  const score = job.verification?.score;
  const map: Record<string, string> = {
    PASS: 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300',
    NEEDS_REVIEW: 'bg-amber-500/15 border-amber-500/40 text-amber-300',
    FAIL: 'bg-red-500/15 border-red-500/40 text-red-300',
  };
  const cls = map[verdict] || 'bg-zinc-700/40 border-zinc-600/40 text-zinc-400';
  return (
    <span
      className={`text-[10px] font-mono uppercase tracking-widest px-2 py-1 rounded-md border ${cls}`}
    >
      {verdict?.replace('_', ' ') || 'Done'} {score !== undefined && `· ${score}`}
    </span>
  );
}
