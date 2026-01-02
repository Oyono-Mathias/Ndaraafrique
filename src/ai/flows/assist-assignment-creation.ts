'use server';

/**
 * @fileOverview Implements a Genkit flow to assist instructors with assignment creation.
 *
 * - assistAssignmentCreation - The main function to generate an assignment description.
 * - AssistAssignmentCreationInput - Input type for the function.
 * - AssistAssignmentCreationOutput - Output type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const AssistAssignmentCreationInputSchema = z.object({
  assignmentTitle: z.string().describe('The title of the assignment provided by the instructor.'),
});
export type AssistAssignmentCreationInput = z.infer<typeof AssistAssignmentCreationInputSchema>;

const AssistAssignmentCreationOutputSchema = z.object({
  description: z.string().describe('A detailed and clear description for the assignment, including instructions and objectives for students in French-speaking Africa.'),
});
export type AssistAssignmentCreationOutput = z.infer<typeof AssistAssignmentCreationOutputSchema>;

export async function assistAssignmentCreation(input: AssistAssignmentCreationInput): Promise<AssistAssignmentCreationOutput> {
  return assistAssignmentCreationFlow(input);
}

const assistAssignmentCreationPrompt = ai.definePrompt({
  name: 'assistAssignmentCreationPrompt',
  input: { schema: AssistAssignmentCreationInputSchema },
  output: { schema: AssistAssignmentCreationOutputSchema },
  prompt: `You are an expert curriculum designer specializing in creating engaging assignments for online courses.
  Your task is to generate a detailed assignment description based on a given title.
  The target audience is students in French-speaking Africa. The tone should be encouraging, clear, and professional.
  The description should clearly explain the task, the objectives, and what is expected from the student.

  Assignment Title: {{{assignmentTitle}}}

  Generate the description based on this title.`,
});

const assistAssignmentCreationFlow = ai.defineFlow(
  {
    name: 'assistAssignmentCreationFlow',
    inputSchema: AssistAssignmentCreationInputSchema,
    outputSchema: AssistAssignmentCreationOutputSchema,
  },
  async (input) => {
    const { output } = await assistAssignmentCreationPrompt(input);
    return output!;
  }
);
