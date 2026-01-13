'use server';
/**
 * @fileOverview A Genkit flow that acts as a junior fraud analyst.
 * It analyzes transaction data and flags suspicious activity.
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
    isFirstTransaction: z.boolean().describe('Whether this is the user\'s first-ever transaction on the platform.'),
    emailDomain: z.string().describe('The domain of the user\'s email address (e.g., gmail.com, yahoo.fr, yopmail.com).'),
  }),
});
export type DetectFraudInput = z.infer<typeof DetectFraudInputSchema>;

const DetectFraudOutputSchema = z.object({
  isSuspicious: z
    .boolean()
    .describe('Whether the transaction is deemed suspicious.'),
  riskScore: z
    .number()
    .describe('A risk score from 0 (not risky) to 100 (very risky).'),
  reason: z
    .string()
    .describe(
      'A brief, clear explanation in French of why the transaction is or is not considered suspicious.'
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
  prompt: `You are a junior fraud analyst for an e-learning platform in Africa. Your task is to analyze a new transaction and provide a risk assessment.

  **CRITICAL RULES:**
  1.  **Be Pragmatic:** Focus on clear, strong signals. Not all new users are fraudsters.
  2.  **Account Age is Key:** The time between account creation and first purchase is the strongest signal. A purchase within minutes (e.g., less than 300 seconds) is **very suspicious**. A purchase after several hours or days is normal.
  3.  **Disposable Emails:** Email domains like 'yopmail.com', 'temp-mail.org', or similar are a **major red flag**, especially for a first transaction.
  4.  **First Transaction Risk:** The very first transaction of any new user is inherently riskier than a subsequent one from an established user. Combine this with other signals.

  **Analysis Checklist:**
  - **Account Age:** Is 'accountAgeInSeconds' very low (e.g., < 300)? This is a HIGH risk signal.
  - **Email Domain:** Is 'emailDomain' a known disposable email provider? This is a HIGH risk signal.
  - **First Transaction:** Is 'isFirstTransaction' true? If so, other signals are more important. If false, the risk is much lower unless other signals are present.

  **Your Task:**
  Based on the following transaction data, determine if it's suspicious, assign a risk score, and provide a clear reason in French.

  **Transaction Data:**
  - Amount: {{{amount}}}
  - Course: {{{courseTitle}}}
  - User ID: {{{user.id}}}
  - Account Age: {{{user.accountAgeInSeconds}}} seconds
  - First Ever Transaction: {{{user.isFirstTransaction}}}
  - User Email Domain: {{{user.emailDomain}}}

  **Example Output for a suspicious transaction:**
  {
    "isSuspicious": true,
    "riskScore": 85,
    "reason": "Premier achat effectué seulement 45 secondes après la création du compte, ce qui est un comportement très inhabituel et à haut risque."
  }

  **Example Output for a normal transaction:**
  {
    "isSuspicious": false,
    "riskScore": 10,
    "reason": "L'utilisateur est inscrit depuis plusieurs jours. Comportement normal."
  }
  `,
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
