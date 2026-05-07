import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import DocumentReview from '@/components/DocumentReview';

export default async function DocumentDetailPage({
  params,
}: {
  params: Promise<{ id: string; docId: string }>;
}) {
  const user = await requireUser();
  const { id: applicantId, docId } = await params;

  const document = await db.document.findFirst({
    where: { id: docId, applicant: { userId: user.id, id: applicantId } },
    include: {
      jobs: { orderBy: { createdAt: 'desc' }, take: 1 },
      applicant: true,
    },
  });

  if (!document) notFound();

  const job = document.jobs[0];

  return (
    <div className="max-w-2xl mx-auto px-8 py-12">
      <Link
        href={`/app/applicants/${applicantId}`}
        className="text-zinc-500 hover:text-zinc-300 text-sm font-mono mb-8 inline-block transition-colors"
      >
        ← {document.applicant.name}
      </Link>

      <div className="mb-8">
        <p className="text-zinc-500 text-xs font-mono uppercase tracking-widest mb-2">
          Document
        </p>
        <h1 className="text-2xl font-bold text-white tracking-tight break-all">
          {document.fileName}
        </h1>
      </div>

      {job ? (
        <DocumentReview
          jobId={job.id}
          fileName={document.fileName}
          initialStatus={job.status}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          initialExtraction={job.extraction as any}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          initialVerification={job.verification as any}
          initialError={job.error}
        />
      ) : (
        <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-6 text-center text-zinc-400">
          No job has been started for this document yet.
        </div>
      )}
    </div>
  );
}
