import UploadZone from '@/components/UploadZone';

export default function Home() {
  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <div className="max-w-2xl mx-auto px-6 py-20">
        <div className="mb-16 text-center">
          <div className="inline-flex items-center gap-2 mb-6">
            <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center text-black font-bold text-sm">C</div>
            <span className="font-mono font-semibold text-zinc-200 text-lg tracking-tight">ComplianceOS</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-3 tracking-tight">KYC Document Verification</h1>
          <p className="text-zinc-400 text-base leading-relaxed max-w-md mx-auto">
            Upload any KYC document. Multi-agent AI extracts fields, runs compliance checks, and delivers a verdict — in seconds.
          </p>
        </div>
        <UploadZone />
        <p className="text-center text-zinc-600 text-xs mt-10 font-mono">
          Supports Bank Statements · Salary Slips · Form 26AS · Rent Agreements · eMandate Forms
        </p>
      </div>
    </main>
  );
}
