import Link from 'next/link';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

export default async function Home() {
  const { userId } = await auth();
  // Already signed in? Skip the marketing page.
  if (userId) redirect('/app/dashboard');

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      {/* Top nav */}
      <nav className="absolute top-0 right-0 px-6 py-5 flex items-center gap-4">
        <Link
          href="/sign-in"
          className="text-zinc-400 hover:text-zinc-100 text-sm font-mono transition-colors"
        >
          Sign in
        </Link>
        <Link
          href="/sign-up"
          className="px-3 py-1.5 rounded-md bg-emerald-500 hover:bg-emerald-400 text-black text-sm font-mono font-semibold transition-colors"
        >
          Sign up
        </Link>
      </nav>

      <div className="max-w-2xl mx-auto px-6 py-32 text-center">
        <div className="inline-flex items-center gap-2 mb-8">
          <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center text-black font-bold text-sm">
            C
          </div>
          <span className="font-mono font-semibold text-zinc-200 text-lg tracking-tight">
            ComplianceOS
          </span>
        </div>

        <h1 className="text-4xl md:text-5xl font-bold text-white mb-5 tracking-tight">
          KYC document verification, <br className="hidden md:inline" />
          end to end.
        </h1>
        <p className="text-zinc-400 text-base md:text-lg leading-relaxed max-w-lg mx-auto mb-10">
          Multi-agent AI for Indian fintechs. Extract, verify, and cross-check identity, income, and banking documents — in seconds.
        </p>

        <div className="flex items-center justify-center gap-3 flex-wrap">
          <Link
            href="/sign-up"
            className="px-5 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black text-sm font-mono font-semibold transition-colors"
          >
            Get started
          </Link>
          <Link
            href="/sign-in"
            className="px-5 py-2.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-100 border border-zinc-800 text-sm font-mono transition-colors"
          >
            Sign in
          </Link>
        </div>

        <div className="mt-16 flex flex-wrap items-center justify-center gap-2">
          {['Bank Statements', 'Salary Slips', 'Form 26AS', 'Rent Agreements', 'eMandate'].map((t) => (
            <span
              key={t}
              className="text-xs px-2.5 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-500 font-mono"
            >
              {t}
            </span>
          ))}
        </div>
      </div>
    </main>
  );
}
