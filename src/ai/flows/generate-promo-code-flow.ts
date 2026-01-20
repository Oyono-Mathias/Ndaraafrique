
'use server';
/**
 * @fileOverview A Genkit flow that acts as an internal admin assistant (Mathias).
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { adminDb } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { generateAnnouncement, GenerateAnnouncementInputSchema, GenerateAnnouncementOutputSchema } from './generate-announcement-flow';
import type { GenerateAnnouncementInput, GenerateAnnouncementOutput } from './generate-announcement-flow';
import { grantCourseAccessFromIdentifiers } from '@/actions/aiActions';


// Define the tool's input schema using Zod
const PromoCodeSchema = z.object({
  code: z.string().describe("The unique promo code string. Must be uppercase, e.g., 'WELCOME25'."),
  discountPercentage: z.number().describe('The percentage discount, e.g., 25 for 25%.'),
  isActive: z.boolean().describe('Whether the code is currently active.'),
  expiresAt: z.string().optional().describe('Optional expiration date for the code in ISO 8601 format.'),
});

// Define the tool that the AI can use to create promo codes
const createPromoCodeTool = ai.defineTool(
  {
    name: 'createPromoCode',
    description: 'Creates a new promotional code in the database. Use this tool ONLY when the user explicitly asks to CREATE a promo code, discount, or coupon.',
    inputSchema: PromoCodeSchema,
    outputSchema: z.object({
      success: z.boolean(),
      code: z.string(),
    }),
  },
  async (input) => {
    if (!adminDb) {
      console.error("Admin DB not initialized, cannot create promo code.");
      return { success: false, code: input.code };
    }
    try {
      const promoRef = adminDb.collection('promoCodes').doc(input.code);
      const dataToSet: any = { ...input, createdAt: FieldValue.serverTimestamp() };
      
      if (input.expiresAt) {
        dataToSet.expiresAt = new Date(input.expiresAt);
      }

      await promoRef.set(dataToSet);
      return { success: true, code: input.code };
    } catch (e: any) {
        console.error("Error creating promo code:", e);
        return { success: false, code: input.code };
    }
  }
);

// Define the tool for generating announcements
const generateAnnouncementTool = ai.defineTool(
    {
        name: 'generateAnnouncement',
        description: "Generates or improves a marketing announcement. Use this tool ONLY when the user's prompt is about WRITING an announcement, marketing message, or any other text content.",
        inputSchema: GenerateAnnouncementInputSchema,
        outputSchema: GenerateAnnouncementOutputSchema,
    },
    async (input: GenerateAnnouncementInput) => {
        return await generateAnnouncement(input);
    }
);

// New tool for granting course access
const grantCourseAccessTool = ai.defineTool(
    {
        name: 'grantCourseAccess',
        description: "Grants free access to a course for a specific student. Use this tool when the admin asks to 'give' or 'offer' a course to a user.",
        inputSchema: z.object({
            studentEmail: z.string().describe("The email address of the student receiving access."),
            courseTitle: z.string().describe("The exact title of the course to grant."),
            reason: z.string().describe("The reason for granting access, inferred from the prompt (e.g., 'reward', 'partnership')."),
            expirationInDays: z.number().optional().describe("Optional duration of access in days."),
        }),
        outputSchema: z.object({
            success: z.boolean(),
            error: z.string().optional(),
        }),
    },
    async (input, context) => {
        const { adminId } = context.auth as { adminId: string };
        if (!adminId) {
            return { success: false, error: "Admin ID is missing. Cannot perform this action." };
        }
        return await grantCourseAccessFromIdentifiers({ ...input, adminId });
    }
);


// Define the input and output schemas for the main flow
const AdminAssistantInputSchema = z.object({
  prompt: z.string().describe("The user's marketing request, e.g., 'Create a 20% discount for Easter' or 'Write an announcement for a new course'"),
  adminId: z.string().describe("The UID of the administrator making the request."),
});
export type AdminAssistantInput = z.infer<typeof AdminAssistantInputSchema>;

export const AdminAssistantOutputSchema = z.object({
  response: z.string().describe("A confirmation or generated message back to the user, in French."),
});
export type AdminAssistantOutput = z.infer<typeof AdminAssistantOutputSchema>;


// Define the prompt that uses the tools
const adminAssistantPrompt = ai.definePrompt({
    name: 'adminAssistantPrompt',
    input: { schema: z.object({ prompt: z.string() }) },
    output: { schema: AdminAssistantOutputSchema },
    tools: [createPromoCodeTool, generateAnnouncementTool, grantCourseAccessTool],
    prompt: `You are Mathias, an AI assistant for Ndara Afrique's administrators. Your task is to help with daily management tasks.
    - First, determine the user's primary intent from their prompt. Are they creating a promo code, writing an announcement, or granting course access?

    - If the user's prompt is to CREATE a promotional code, discount, or coupon:
      - Analyze the prompt for code name, discount percentage, and expiration.
      - Make reasonable assumptions if details are missing.
      - You MUST use the 'createPromoCodeTool'.
      - After a successful call, respond in French: "C'est fait ! Le code promo [CODE] offrant [XX]% de réduction a été créé."
      - If it fails, say: "Désolé, je n'ai pas pu créer le code promo."

    - If the user's prompt is to WRITE text (announcement, message, etc.):
      - You MUST call the 'generateAnnouncementTool' with the prompt as the 'topic'.
      - The tool returns \`{"announcement": "..."}\`. Your response must be an object \`{"response": "value of announcement field"}\`.

    - If the user's prompt is to GRANT access, give a course, or enroll a student for free:
      - Analyze the prompt for the student's email, the course title, and optionally a reason and duration.
      - You MUST use the 'grantCourseAccessTool'.
      - After a successful call, respond in French: "C'est fait ! L'accès au cours a été accordé."
      - If it fails, respond with the error message: "Désolé, l'opération a échoué. Raison : [error message]".

    User's request: {{{prompt}}}
    `,
});


// Define the main flow that orchestrates the process
export const adminAssistantFlow = ai.defineFlow(
    {
        name: 'adminAssistantFlow',
        inputSchema: AdminAssistantInputSchema,
        outputSchema: AdminAssistantOutputSchema,
    },
    async (input) => {
        const { output } = await adminAssistantPrompt(
            { prompt: input.prompt },
            { auth: { adminId: input.adminId } }
        );
        return output!;
    }
);

export async function adminAssistant(input: AdminAssistantInput): Promise<AdminAssistantOutput> {
  return adminAssistantFlow(input);
}
