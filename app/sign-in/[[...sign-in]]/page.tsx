import { SignIn } from '@clerk/nextjs';

export default function SignInPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-zinc-950 px-6">
      <div className="w-full max-w-md flex flex-col items-center">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center text-black font-bold text-sm">
            C
          </div>
          <span className="font-mono font-semibold text-zinc-200 text-lg tracking-tight">
            ComplianceOS
          </span>
        </div>
        <SignIn signUpUrl="/sign-up" forceRedirectUrl="/app/dashboard" />
      </div>
    </main>
  );
}
