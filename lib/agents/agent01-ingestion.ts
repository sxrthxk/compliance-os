import Anthropic from '@anthropic-ai/sdk';
import { ExtractedFields } from '../pipeline';

const client = new Anthropic();

const DOC_PROMPTS: Record<string, string> = {
  bank_statement: `You are a financial document parser. Extract the following from this bank statement:
- account_holder_name
- account_number (last 4 digits only)
- bank_name
- statement_period_from (YYYY-MM-DD)
- statement_period_to (YYYY-MM-DD)
- opening_balance (number, INR)
- closing_balance (number, INR)
- total_credits (number, INR)
- total_debits (number, INR)
- average_monthly_balance (number, INR, compute if not stated)
- salary_credits_detected (boolean — true if regular salary-like credits found)
- salary_amount (number or null)
- emi_debits_detected (boolean)
- num_transactions (number)
- unusual_flags (array of strings — e.g. large cash withdrawals, round-tripping, negative balance)

Respond ONLY with a valid JSON object. No markdown, no explanation.`,

  salary_slip: `You are a payroll document parser. Extract the following from this salary slip:
- employee_name
- employee_id
- employer_name
- designation
- month_year (MM-YYYY)
- basic_salary (number, INR)
- gross_salary (number, INR)
- net_salary (number, INR)
- pf_deducted (number, INR)
- tds_deducted (number, INR)
- total_deductions (number, INR)
- pan_number (masked if present)
- uan_number (masked if present)
- unusual_flags (array of strings)

Respond ONLY with a valid JSON object. No markdown, no explanation.`,

  form_26as: `You are a tax document parser. Extract the following from this Form 26AS:
- pan_number (masked — show only last 4 chars)
- assessment_year
- taxpayer_name
- total_tds_deducted (number, INR)
- tds_deductors (array of objects: {name, tan, amount})
- advance_tax_paid (number or null)
- self_assessment_tax (number or null)
- total_tax_paid (number, INR)
- unusual_flags (array of strings — mismatches, high TDS, etc.)

Respond ONLY with a valid JSON object. No markdown, no explanation.`,

  rent_agreement: `You are a legal document parser. Extract the following from this rent agreement:
- landlord_name
- tenant_name
- property_address
- city
- monthly_rent (number, INR)
- security_deposit (number, INR)
- lease_start_date (YYYY-MM-DD)
- lease_end_date (YYYY-MM-DD)
- lease_duration_months (number)
- stamp_duty_present (boolean)
- notarized (boolean)
- registered (boolean)
- unusual_flags (array of strings)

Respond ONLY with a valid JSON object. No markdown, no explanation.`,

  emandate: `You are a banking form parser. Extract the following from this eMandate/NACH form:
- account_holder_name
- bank_name
- account_number (last 4 digits only)
- account_type (savings/current/OD)
- ifsc_code
- debit_amount (number, INR)
- debit_frequency (monthly/quarterly/annual/as_and_when)
- start_date (YYYY-MM-DD or null)
- end_date (YYYY-MM-DD or null)
- purpose
- signature_present (boolean)
- unusual_flags (array of strings)

Respond ONLY with a valid JSON object. No markdown, no explanation.`,
};

function detectDocType(fileName: string, mimeType: string): string {
  const name = fileName.toLowerCase();
  if (name.includes('bank') || name.includes('statement') || name.includes('passbook')) return 'bank_statement';
  if (name.includes('salary') || name.includes('payslip') || name.includes('pay_slip')) return 'salary_slip';
  if (name.includes('26as') || name.includes('form26') || name.includes('tds')) return 'form_26as';
  if (name.includes('rent') || name.includes('lease') || name.includes('agreement')) return 'rent_agreement';
  if (name.includes('nach') || name.includes('mandate') || name.includes('ecs')) return 'emandate';
  return 'bank_statement'; // fallback
}

function docTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    bank_statement: 'Bank Statement',
    salary_slip: 'Salary Slip',
    form_26as: 'Form 26AS',
    rent_agreement: 'Rent Agreement',
    emandate: 'eMandate / NACH Form',
  };
  return labels[type] || type;
}

export async function runAgent01(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string
): Promise<ExtractedFields> {
  const docType = detectDocType(fileName, mimeType);
  const prompt = DOC_PROMPTS[docType];

  // Convert buffer to base64
  const base64Data = fileBuffer.toString('base64');

  // Determine media type for Anthropic API
  let mediaType: 'application/pdf' | 'image/jpeg' | 'image/png' | 'image/webp' = 'application/pdf';
  if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') mediaType = 'image/jpeg';
  else if (mimeType === 'image/png') mediaType = 'image/png';
  else if (mimeType === 'image/webp') mediaType = 'image/webp';

  const contentBlock =
    mediaType === 'application/pdf'
      ? {
          type: 'document' as const,
          source: { type: 'base64' as const, media_type: mediaType, data: base64Data },
        }
      : {
          type: 'image' as const,
          source: { type: 'base64' as const, media_type: mediaType, data: base64Data },
        };

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    messages: [
      {
        role: 'user',
        content: [
          contentBlock,
          { type: 'text', text: prompt },
        ],
      },
    ],
  });

  const rawText = response.content[0].type === 'text' ? response.content[0].text : '{}';

  let fields: Record<string, string | number | boolean | null> = {};
  try {
    const clean = rawText.replace(/```json|```/g, '').trim();
    fields = JSON.parse(clean);
  } catch {
    fields = { parse_error: true, raw: rawText.slice(0, 500) };
  }

  return {
    documentType: docTypeLabel(docType),
    fields,
    rawText,
  };
}
