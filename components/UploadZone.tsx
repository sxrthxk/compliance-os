'use client';

import { useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';

export default function UploadZone() {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const handleFile = useCallback(async (file: File) => {
    setError(null);
    setUploading(true);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/process', { method: 'POST', body: formData });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Upload failed');

      router.push(`/review/${data.jobId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
      setUploading(false);
    }
  }, [router]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div className="w-full max-w-xl mx-auto">
      <div
        className={`
          relative border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer
          transition-all duration-200
          ${dragging ? 'border-emerald-400 bg-emerald-950/30 scale-[1.02]' : 'border-zinc-700 hover:border-zinc-500 bg-zinc-900/50'}
          ${uploading ? 'pointer-events-none opacity-60' : ''}
        `}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => !uploading && inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept=".pdf,.jpg,.jpeg,.png,.webp"
          onChange={onInputChange}
        />

        {uploading ? (
          <div className="flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
            <p className="text-zinc-300 font-mono text-sm">Uploading document...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-zinc-800 flex items-center justify-center text-2xl">
              📄
            </div>
            <div>
              <p className="text-zinc-200 font-medium text-lg">Drop document here</p>
              <p className="text-zinc-500 text-sm mt-1">or click to browse</p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center mt-2">
              {['Bank Statement', 'Salary Slip', 'Form 26AS', 'Rent Agreement', 'eMandate'].map((t) => (
                <span key={t} className="text-xs px-2 py-1 rounded-full bg-zinc-800 text-zinc-400 font-mono">
                  {t}
                </span>
              ))}
            </div>
            <p className="text-zinc-600 text-xs mt-1">PDF, JPG, PNG · Max 10MB</p>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-4 p-3 rounded-lg bg-red-950/50 border border-red-800 text-red-300 text-sm text-center">
          {error}
        </div>
      )}
    </div>
  );
}
