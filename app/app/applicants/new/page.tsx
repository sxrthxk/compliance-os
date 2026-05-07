import NewApplicantForm from '@/components/NewApplicantForm';
import Link from 'next/link';

export default function NewApplicantPage() {
  return (
    <div className="max-w-xl mx-auto px-8 py-12">
      <Link
        href="/app/applicants"
        className="text-zinc-500 hover:text-zinc-300 text-sm font-mono mb-8 inline-block transition-colors"
      >
        ← Back to applicants
      </Link>

      <div className="mb-8">
        <p className="text-zinc-500 text-xs font-mono uppercase tracking-widest mb-2">
          New applicant
        </p>
        <h1 className="text-2xl font-bold text-white tracking-tight">Create applicant</h1>
        <p className="text-zinc-500 text-sm mt-1">
          You&apos;ll be able to add documents on the next page.
        </p>
      </div>

      <NewApplicantForm />
    </div>
  );
}
