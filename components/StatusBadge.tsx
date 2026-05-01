interface Props {
  verdict: 'PASS' | 'NEEDS_REVIEW' | 'FAIL';
  score: number;
}

const config = {
  PASS: {
    label: 'PASS',
    bg: 'bg-emerald-950/60',
    border: 'border-emerald-700',
    text: 'text-emerald-300',
    dot: 'bg-emerald-400',
    bar: 'bg-emerald-500',
  },
  NEEDS_REVIEW: {
    label: 'NEEDS REVIEW',
    bg: 'bg-amber-950/60',
    border: 'border-amber-700',
    text: 'text-amber-300',
    dot: 'bg-amber-400',
    bar: 'bg-amber-500',
  },
  FAIL: {
    label: 'FAIL',
    bg: 'bg-red-950/60',
    border: 'border-red-800',
    text: 'text-red-300',
    dot: 'bg-red-500',
    bar: 'bg-red-500',
  },
};

export default function StatusBadge({ verdict, score }: Props) {
  const c = config[verdict];

  return (
    <div className={`rounded-xl border p-5 ${c.bg} ${c.border}`}>
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-3 h-3 rounded-full ${c.dot}`} />
        <span className={`text-xl font-bold tracking-wider font-mono ${c.text}`}>{c.label}</span>
        <span className="ml-auto text-zinc-400 text-sm font-mono">Score: <span className={c.text}>{score}/100</span></span>
      </div>

      {/* Score bar */}
      <div className="w-full bg-zinc-800 rounded-full h-1.5">
        <div
          className={`h-1.5 rounded-full transition-all duration-1000 ${c.bar}`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}
