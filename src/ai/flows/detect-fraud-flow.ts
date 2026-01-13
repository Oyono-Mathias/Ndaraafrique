
'use server';
/**
 * @fileOverview A Genkit flow that acts as a junior fraud analyst.
 * It analyzes transaction data and flags suspicious activity based on a risk scoring model.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const DetectFraudInputSchema = z.object({
  transactionId: z.string().describe('The unique ID of the transaction.'),
  amount: z.number().describe('The monetary value of the transaction.'),
  courseTitle: z.string().describe('The title of the course being purchased.'),
  user: z.object({
    id: z.string().describe('The unique ID of the user.'),
    accountAgeInSeconds: z.number().describe('How long ago the user account was created, in seconds.'),
    isFirstTransaction: z.boolean().describe("Whether this is the user's first-ever transaction on the platform."),
    emailDomain: z.string().describe("The domain of the user's email address (e.g., gmail.com, yahoo.fr, yopmail.com)."),
  }),
});
export type DetectFraudInput = z.infer<typeof DetectFraudInputSchema>;

const DetectFraudOutputSchema = z.object({
  isSuspicious: z
    .boolean()
    .describe('Whether the transaction is deemed suspicious (risk score >= 40).'),
  riskScore: z
    .number()
    .describe('A risk score from 0 (not risky) to 100 (very risky), based on the provided scoring model.'),
  reason: z
    .string()
    .describe(
      'A brief, clear explanation in French of why the transaction is or is not considered suspicious, referencing the specific rules that contributed to the score.'
    ),
});
export type DetectFraudOutput = z.infer<typeof DetectFraudOutputSchema>;

export async function detectFraud(input: DetectFraudInput): Promise<DetectFraudOutput> {
  return detectFraudFlow(input);
}


const fraudDetectionPrompt = ai.definePrompt({
  name: 'fraudDetectionPrompt',
  input: { schema: DetectFraudInputSchema },
  output: { schema: DetectFraudOutputSchema },
  prompt: `You are an expert fraud analyst for an e-learning platform in Africa. Your task is to analyze a new transaction and provide a risk score based on a strict set of rules.

  **RISK SCORING MODEL:**
  You will start with a base score of 0 and add points for each risky signal.

  1.  **Transaction Velocity (Time between sign-up and first purchase):**
      *   If \`accountAgeInSeconds\` < 300 (5 minutes): **+50 points**. This is a major red flag.
      *   If \`accountAgeInSeconds\` is between 300 and 3600 (1 hour): **+20 points**.
      *   If \`accountAgeInSeconds\` > 86400 (24 hours): **-10 points** (sign of trust).

  2.  **User History:**
      *   If \`isFirstTransaction\` is true: **+15 points**. All first-time transactions carry some inherent risk.

  3.  **Email Reputation:**
      *   If \`emailDomain\` is a known disposable email provider (like yopmail.com, temp-mail.org, etc.): **+40 points**.

  **YOUR TASK:**
  1.  Calculate the final \`riskScore\` by summing the points based on the rules above.
  2.  Set \`isSuspicious\` to \`true\` if the final \`riskScore\` is 40 or higher. Otherwise, set it to \`false\`.
  3.  Write a clear, concise \`reason\` in **French**. This reason MUST explain the final score by referencing the rules you applied.

  **Transaction Data to Analyze:**
  - Transaction ID: {{{transactionId}}}
  - Amount: {{{amount}}}
  - Course: {{{courseTitle}}}
  - User ID: {{{user.id}}}
  - Account Age: {{{user.accountAgeInSeconds}}} seconds
  - First Ever Transaction: {{{user.isFirstTransaction}}}
  - User Email Domain: {{{user.emailDomain}}}

  **Example 1 (High Risk):**
  *Input: accountAgeInSeconds: 60, isFirstTransaction: true, emailDomain: 'yopmail.com'*
  *Calculation: +50 (velocity) + 15 (first tx) + 40 (disposable email) = 105*
  *Output:*
  {
    "isSuspicious": true,
    "riskScore": 105,
    "reason": "Score élevé. Achat effectué 60s après inscription (+50), première transaction (+15), et utilisation d'une adresse email jetable (+40)."
  }

  **Example 2 (Low Risk):**
  *Input: accountAgeInSeconds: 90000, isFirstTransaction: false, emailDomain: 'gmail.com'*
  *Calculation: -10 (old account)*
  *Output:*
  {
    "isSuspicious": false,
    "riskScore": 0,
    "reason": "Score faible. Compte ancien (-10) et ce n'est pas la première transaction. Comportement normal."
  }
  
  Now, perform the analysis on the provided transaction data.`,
});


const detectFraudFlow = ai.defineFlow(
  {
    name: 'detectFraudFlow',
    inputSchema: DetectFraudInputSchema,
    outputSchema: DetectFraudOutputSchema,
  },
  async (input) => {
    const { output } = await fraudDetectionPrompt(input);
    return output!;
  }
);
