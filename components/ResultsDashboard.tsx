import { ExtractedFields, VerificationResult } from '@/lib/store';
import StatusBadge from './StatusBadge';

interface Props {
  fileName: string;
  extraction: ExtractedFields;
  verification: VerificationResult;
}

function formatValue(val: unknown): string {
  if (val === null || val === undefined) return '—';
  if (typeof val === 'boolean') return val ? 'Yes' : 'No';
  if (Array.isArray(val)) {
    if (val.length === 0) return 'None';
    return val.map((v) => (typeof v === 'object' ? JSON.stringify(v) : String(v))).join(', ');
  }
  if (typeof val === 'number') {
    // Format large numbers as currency if they look like INR amounts
    if (val > 1000) return `₹${val.toLocaleString('en-IN')}`;
    return String(val);
  }
  return String(val);
}

function fieldLabel(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

const SKIP_FIELDS = ['parse_error', 'raw', 'unusual_flags'];

export default function ResultsDashboard({ fileName, extraction, verification }: Props) {
  const mainFields = Object.entries(extraction.fields).filter(
    ([k]) => !SKIP_FIELDS.includes(k) && !Array.isArray(extraction.fields[k])
  );
  const flags = extraction.fields.unusual_flags as unknown as string[] | undefined;

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-zinc-500 text-xs font-mono uppercase tracking-widest mb-1">Document</p>
          <h2 className="text-white text-xl font-semibold">{extraction.documentType}</h2>
          <p className="text-zinc-500 text-sm mt-0.5 font-mono">{fileName}</p>
        </div>
      </div>

      {/* Verdict */}
      <StatusBadge verdict={verification.verdict} score={verification.score} />

      {/* Summary */}
      <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4">
        <p className="text-zinc-400 text-xs font-mono uppercase tracking-widest mb-2">Summary</p>
        <p className="text-zinc-200 text-sm leading-relaxed">{verification.summary}</p>
      </div>

      {/* Verification Checks */}
      <div className="rounded-xl bg-zinc-900 border border-zinc-800 overflow-hidden">
        <div className="px-4 py-3 border-b border-zinc-800">
          <p className="text-zinc-400 text-xs font-mono uppercase tracking-widest">Verification Checks</p>
        </div>
        <div className="divide-y divide-zinc-800/60">
          {verification.checks.map((check, i) => (
            <div key={i} className="flex items-start gap-3 px-4 py-3">
              <span className={`mt-0.5 text-sm ${check.passed ? 'text-emerald-400' : 'text-red-400'}`}>
                {check.passed ? '✓' : '✗'}
              </span>
              <div className="flex-1 min-w-0">
                <span className="text-zinc-200 text-sm">{check.label}</span>
                {check.note && (
                  <p className="text-zinc-500 text-xs mt-0.5">{check.note}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Extracted Fields */}
      <div className="rounded-xl bg-zinc-900 border border-zinc-800 overflow-hidden">
        <div className="px-4 py-3 border-b border-zinc-800">
          <p className="text-zinc-400 text-xs font-mono uppercase tracking-widest">Extracted Fields</p>
        </div>
        <div className="divide-y divide-zinc-800/60">
          {mainFields.map(([key, value]) => (
            <div key={key} className="flex items-start justify-between gap-4 px-4 py-2.5">
              <span className="text-zinc-500 text-xs font-mono shrink-0">{fieldLabel(key)}</span>
              <span className="text-zinc-200 text-sm text-right break-all">{formatValue(value)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Flags */}
      {flags && flags.length > 0 && (
        <div className="rounded-xl bg-amber-950/30 border border-amber-800/50 p-4">
          <p className="text-amber-400 text-xs font-mono uppercase tracking-widest mb-3">⚠ Flags Detected</p>
          <ul className="space-y-1.5">
            {flags.map((flag, i) => (
              <li key={i} className="text-amber-300 text-sm flex items-start gap-2">
                <span className="shrink-0 mt-0.5">•</span>
                {flag}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
