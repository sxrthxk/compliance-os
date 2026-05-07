'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  applicantId: string;
  initialName: string;
  initialEmail: string | null;
  initialPhone: string | null;
  initialPan: string | null;
}

export default function ApplicantConfirmBanner({
  applicantId,
  initialName,
  initialEmail,
  initialPhone,
  initialPan,
}: Props) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail || '');
  const [phone, setPhone] = useState(initialPhone || '');
  const [pan, setPan] = useState(initialPan || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onConfirm = async () => {
    setError(null);
    setSaving(true);

    try {
      const res = await fetch(`/api/applicants/${applicantId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          phone,
          panNumber: pan,
          confirm: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === 'pan_conflict') {
          setError('Another applicant in your workspace already uses this PAN.');
        } else {
          setError(data.message || data.error || 'Failed to confirm');
        }
        setSaving(false);
        return;
      }
      router.refresh();
    } catch {
      setError('Failed to confirm');
      setSaving(false);
    }
  };

  return (
    <div className="rounded-xl bg-emerald-950/30 border border-emerald-700/40 p-5">
      <div className="flex items-start gap-3 mb-4">
        <span className="text-emerald-400 mt-0.5">⚡</span>
        <div>
          <p className="text-emerald-300 text-sm font-semibold">
            We extracted this identity from the uploaded document
          </p>
          <p className="text-emerald-200/70 text-xs mt-1">
            Please verify and edit if needed, then confirm to start verification.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        <FieldInput label="Name" value={name} onChange={setName} required />
        <FieldInput label="PAN" value={pan} onChange={(v) => setPan(v.toUpperCase())} mono maxLength={10} />
        <FieldInput label="Email" value={email} onChange={setEmail} type="email" />
        <FieldInput label="Phone" value={phone} onChange={setPhone} type="tel" />
      </div>

      {error && (
        <div className="p-2.5 rounded-lg bg-red-950/50 border border-red-800 text-red-300 text-xs mb-3">
          {error}
        </div>
      )}

      <button
        onClick={onConfirm}
        disabled={saving || !name.trim()}
        className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:bg-zinc-800 disabled:text-zinc-500 disabled:cursor-not-allowed text-black text-sm font-mono font-semibold transition-colors"
      >
        {saving ? 'Confirming...' : 'Confirm identity'}
      </button>
    </div>
  );
}

function FieldInput({
  label,
  value,
  onChange,
  type = 'text',
  required,
  mono,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  mono?: boolean;
  maxLength?: number;
}) {
  return (
    <label className="block">
      <div className="text-emerald-300/80 text-[10px] font-mono uppercase tracking-widest mb-1">
        {label}
        {required && <span className="text-emerald-400 ml-1">*</span>}
      </div>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={maxLength}
        className={`w-full px-2.5 py-1.5 rounded-md bg-zinc-950/60 border border-zinc-700 text-zinc-100 text-sm focus:outline-none focus:border-emerald-500/60 ${
          mono ? 'font-mono' : ''
        }`}
      />
    </label>
  );
}
