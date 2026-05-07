import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';

/**
 * File storage abstraction. Phase 3 uses local disk under ./storage/.
 * Phase 6+ will swap this to Vercel Blob — same function signatures.
 */

const STORAGE_ROOT = path.join(process.cwd(), 'storage');

async function ensureRoot() {
  await fs.mkdir(STORAGE_ROOT, { recursive: true });
}

/**
 * Save a file buffer to storage. Returns a URL/path that can be stored in DB.
 * For local dev, this is a relative path served by /api/files/[...path].
 */
export async function saveFile(
  buffer: Buffer,
  originalName: string,
  applicantId: string
): Promise<{ url: string; storagePath: string }> {
  await ensureRoot();

  const ext = path.extname(originalName) || '';
  const id = crypto.randomBytes(12).toString('hex');
  const fileName = `${id}${ext}`;

  const applicantDir = path.join(STORAGE_ROOT, applicantId);
  await fs.mkdir(applicantDir, { recursive: true });

  const fullPath = path.join(applicantDir, fileName);
  await fs.writeFile(fullPath, buffer);

  // The "url" we store is a route on our own server that streams the file back.
  const url = `/api/files/${applicantId}/${fileName}`;
  const storagePath = path.join(applicantId, fileName);

  return { url, storagePath };
}

/**
 * Read a file from storage by its relative storage path.
 */
export async function readFile(storagePath: string): Promise<Buffer> {
  // Defense: prevent path traversal
  const normalized = path.normalize(storagePath);
  if (normalized.includes('..') || path.isAbsolute(normalized)) {
    throw new Error('Invalid storage path');
  }
  const fullPath = path.join(STORAGE_ROOT, normalized);
  return fs.readFile(fullPath);
}

/**
 * Delete a file from storage. Idempotent.
 */
export async function deleteFile(storagePath: string): Promise<void> {
  const normalized = path.normalize(storagePath);
  if (normalized.includes('..') || path.isAbsolute(normalized)) return;
  const fullPath = path.join(STORAGE_ROOT, normalized);
  try {
    await fs.unlink(fullPath);
  } catch {
    // Already gone — fine
  }
}
