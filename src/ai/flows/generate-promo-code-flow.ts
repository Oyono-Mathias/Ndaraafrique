'use server';
/**
 * @fileOverview A Genkit flow that uses a tool to create promo codes in Firestore.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { addDoc, collection, serverTimestamp, Timestamp } from 'firebase/firestore';
import { adminDb } from '@/firebase/admin';

// Define the tool's input schema using Zod
const PromoCodeSchema = z.object({
  code: z.string().describe("The unique promo code string. Must be uppercase, e.g., 'WELCOME25'."),
  discountPercentage: z.number().describe('The percentage discount, e.g., 25 for 25%.'),
  isActive: z.boolean().describe('Whether the code is currently active.'),
  expiresAt: z.string().optional().describe('Optional expiration date for the code in ISO 8601 format.'),
});

// Define the tool that the AI can use
const createPromoCode = ai.defineTool(
  {
    name: 'createPromoCode',
    description: 'Creates a new promotional code in the database.',
    inputSchema: PromoCodeSchema,
    outputSchema: z.object({
      success: z.boolean(),
      code: z.string(),
    }),
  },
  async (input) => {
    try {
      const promoCodeData: any = {
        code: input.code.toUpperCase(),
        discountPercentage: input.discountPercentage,
        isActive: input.isActive,
        createdAt: serverTimestamp(),
      };
      if (input.expiresAt) {
        promoCodeData.expiresAt = Timestamp.fromDate(new Date(input.expiresAt));
      }

      await addDoc(collection(adminDb, 'promoCodes'), promoCodeData);
      
      return { success: true, code: input.code };
    } catch (error) {
      console.error('Tool Error: Failed to create promo code', error);
      return { success: false, code: input.code };
    }
  }
);

// Define the input and output schemas for the main flow
const GeneratePromoCodeInputSchema = z.object({
  prompt: z.string().describe("The user's request for a promo code, e.g., 'Create a 20% discount for Easter'"),
});
export type GeneratePromoCodeInput = z.infer<typeof GeneratePromoCodeInputSchema>;

const GeneratePromoCodeOutputSchema = z.object({
  response: z.string().describe("A confirmation message back to the user, in French, stating whether the code was created."),
});
export type GeneratePromoCodeOutput = z.infer<typeof GeneratePromoCodeOutputSchema>;


// Define the prompt that uses the tool
const generatePromoCodePrompt = ai.definePrompt({
    name: 'generatePromoCodePrompt',
    input: { schema: GeneratePromoCodeInputSchema },
    output: { schema: GeneratePromoCodeOutputSchema },
    tools: [createPromoCode],
    prompt: `You are Mathias, an AI assistant for FormaAfrique.
    Your task is to help an administrator create promotional codes.
    - Analyze the user's prompt to determine the code name, discount percentage, and any expiration details.
    - If the user is vague, make reasonable assumptions (e.g., a 'welcome' code is active indefinitely, a holiday code might expire after the holiday).
    - You MUST use the 'createPromoCode' tool to save the new code to the database.
    - After calling the tool, respond to the user in French to confirm what you have done.
    - If the tool call is successful, say something like: "C'est fait ! Le code promo [CODE] offrant [XX]% de réduction a été créé et activé."
    - If the tool call fails, say: "Je suis désolé, je n'ai pas pu créer le code promo pour une raison technique."

    User's request: {{{prompt}}}
    `,
});


// Define the main flow that orchestrates the process
export const generatePromoCode = ai.defineFlow(
    {
        name: 'generatePromoCodeFlow',
        inputSchema: GeneratePromoCodeInputSchema,
        outputSchema: GeneratePromoCodeOutputSchema,
    },
    async (input) => {
        const { output } = await generatePromoCodePrompt(input);
        return output!;
    }
);
