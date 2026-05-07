import Anthropic from '@anthropic-ai/sdk';
import { ExtractedFields, VerificationResult } from '../pipeline';

const client = new Anthropic();

const VERIFICATION_PROMPT = (docType: string, fields: Record<string, unknown>) => {
  const today = new Date().toISOString().split('T')[0];
  return `
You are a KYC compliance verification agent for an Indian fintech.

Today's date: ${today}
Document type: ${docType}
Extracted fields: ${JSON.stringify(fields, null, 2)}

When evaluating recency checks (e.g. "within X months"), use the date above as the current date. Do NOT assume the year is anything other than what's stated above. If a document is dated within the recency window relative to today's date, treat it as recent.

Run verification checks appropriate for this document type. For each check:
- Determine if it passes or fails based on the extracted data
- Add a short note if it fails or needs review

Return ONLY a JSON object with this exact structure:
{
  "verdict": "PASS" | "NEEDS_REVIEW" | "FAIL",
  "score": <0-100 integer>,
  "checks": [
    { "label": "<check name>", "passed": true/false, "note": "<optional short note>" }
  ],
  "summary": "<1-2 sentence plain English summary of the verification result>"
}

Scoring guide:
- 85–100 → PASS
- 60–84 → NEEDS_REVIEW  
- 0–59 → FAIL

Checks to run based on doc type:

For bank_statement:
- Sufficient average balance (>= ₹10,000)
- Salary credits detected
- No unusual round-tripping
- No negative balance instances
- Statement is recent (within 3 months)
- Consistent transaction history

For salary_slip:
- Net salary > 0
- TDS deducted (indicates formal employment)
- PF deducted (indicates formal employment)
- Month is recent (within 2 months)
- Employer name present
- No unusual deductions

For form_26as:
- TDS deducted by at least one deductor
- Tax paid amount reasonable
- Assessment year is current or previous
- No mismatches flagged

For rent_agreement:
- Stamp duty present
- Lease duration reasonable (6–36 months)
- Monthly rent stated clearly
- Both landlord and tenant names present
- Address is specific

For emandate:
- Account number present
- IFSC code present
- Debit amount stated
- Signature present
- Bank name present

Respond ONLY with the JSON. No markdown, no explanation.
`;
};

export async function runAgent02(extraction: ExtractedFields): Promise<VerificationResult> {
  const response = await client.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 1500,
    messages: [
      {
        role: 'user',
        content: VERIFICATION_PROMPT(extraction.documentType, extraction.fields),
      },
    ],
  });

  const rawText = response.content[0].type === 'text' ? response.content[0].text : '{}';

  try {
    const clean = rawText.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);
    return parsed as VerificationResult;
  } catch {
    return {
      verdict: 'NEEDS_REVIEW',
      score: 50,
      checks: [{ label: 'Parse verification response', passed: false, note: 'Could not parse agent response' }],
      summary: 'Verification could not be completed automatically. Manual review required.',
    };
  }
}
