'use client';

import { useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  applicantId: string;
}

export default function ApplicantDocUpload({ applicantId }: Props) {
  const router = useRouter();
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      setUploading(true);

      const formData = new FormData();
      formData.append('file', file);

      try {
        const res = await fetch(`/api/applicants/${applicantId}/documents`, {
          method: 'POST',
          body: formData,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Upload failed');

        router.push(`/app/applicants/${applicantId}/docs/${data.document.id}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Upload failed');
        setUploading(false);
      }
    },
    [applicantId, router]
  );

  return (
    <div>
      <div
        className={`
          relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-200
          ${dragging ? 'border-emerald-400 bg-emerald-950/30' : 'border-zinc-700 hover:border-zinc-500 bg-zinc-900/40'}
          ${uploading ? 'pointer-events-none opacity-60' : ''}
        `}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const file = e.dataTransfer.files[0];
          if (file) handleFile(file);
        }}
        onClick={() => !uploading && inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept=".pdf,.jpg,.jpeg,.png,.webp"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />

        {uploading ? (
          <div className="flex items-center justify-center gap-3">
            <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
            <p className="text-zinc-300 font-mono text-sm">Uploading...</p>
          </div>
        ) : (
          <p className="text-zinc-300 text-sm">
            Drop a document, or <span className="text-emerald-400">click to browse</span>
          </p>
        )}
      </div>

      {error && (
        <div className="mt-2 p-2.5 rounded-lg bg-red-950/50 border border-red-800 text-red-300 text-xs">
          {error}
        </div>
      )}
    </div>
  );
}
