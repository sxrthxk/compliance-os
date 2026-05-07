import { db } from './db';
import type { Applicant } from '@prisma/client';

/**
 * Normalize a PAN for comparison/dedup. PANs are 10 chars, uppercase, no spaces.
 */
export function normalizePan(pan: string | null | undefined): string | null {
  if (!pan) return null;
  const trimmed = pan.replace(/\s+/g, '').toUpperCase();
  // Don't enforce regex strictly — operators may enter partial / masked PANs
  return trimmed || null;
}

/**
 * Look up an existing applicant for this user by PAN.
 * Returns null if no match (or if pan is empty/null).
 */
export async function findApplicantByPan(
  userId: string,
  pan: string | null | undefined
): Promise<Applicant | null> {
  const normalized = normalizePan(pan);
  if (!normalized) return null;

  return db.applicant.findUnique({
    where: { userId_panNumber: { userId, panNumber: normalized } },
  });
}

/**
 * Doc type detection from filename — same heuristic as Agent 01.
 * Centralized here so we can use it before kicking off the agent.
 */
export function detectDocType(fileName: string): string {
  const name = fileName.toLowerCase();
  if (name.includes('bank') || name.includes('statement') || name.includes('passbook'))
    return 'bank_statement';
  if (name.includes('salary') || name.includes('payslip') || name.includes('pay_slip'))
    return 'salary_slip';
  if (name.includes('26as') || name.includes('form26') || name.includes('tds'))
    return 'form_26as';
  if (name.includes('rent') || name.includes('lease') || name.includes('agreement'))
    return 'rent_agreement';
  if (name.includes('nach') || name.includes('mandate') || name.includes('ecs'))
    return 'emandate';
  return 'bank_statement';
}
