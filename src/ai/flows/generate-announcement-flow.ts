'use server';

/**
 * @fileOverview Implements a Genkit flow to assist admins with marketing announcements.
 *
 * - generateAnnouncement - The main function to generate a marketing message.
 * - GenerateAnnouncementInput - Input type for the function.
 * - GenerateAnnouncementOutput - Output type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GenerateAnnouncementInputSchema = z.object({
  topic: z.string().describe('The topic or goal of the announcement message. For example: "a flash sale for the weekend", "a new course about AI", "a happy new year message".'),
});
export type GenerateAnnouncementInput = z.infer<typeof GenerateAnnouncementInputSchema>;

const GenerateAnnouncementOutputSchema = z.object({
  announcement: z.string().describe('The generated marketing announcement message, tailored for a pan-african audience. It should be engaging, professional, and concise.'),
});
export type GenerateAnnouncementOutput = z.infer<typeof GenerateAnnouncementOutputSchema>;

export async function generateAnnouncement(input: GenerateAnnouncementInput): Promise<GenerateAnnouncementOutput> {
  return generateAnnouncementFlow(input);
}

const generateAnnouncementPrompt = ai.definePrompt({
  name: 'generateAnnouncementPrompt',
  input: { schema: GenerateAnnouncementInputSchema },
  output: { schema: GenerateAnnouncementOutputSchema },
  prompt: `You are a marketing expert for FormaAfrique, an online learning platform for French-speaking Africa.
  Your task is to generate a short, engaging, and professional announcement message based on a given topic.
  The message will be displayed in a banner on top of the website.
  The tone should be exciting and create a sense of urgency or opportunity.
  You MUST respond in French.

  Annonce Topic: {{{topic}}}

  Generate the announcement message based on this topic.`,
});

const generateAnnouncementFlow = ai.defineFlow(
  {
    name: 'generateAnnouncementFlow',
    inputSchema: GenerateAnnouncementInputSchema,
    outputSchema: GenerateAnnouncementOutputSchema,
  },
  async (input) => {
    const { output } = await generateAnnouncementPrompt(input);
    return output!;
  }
);
