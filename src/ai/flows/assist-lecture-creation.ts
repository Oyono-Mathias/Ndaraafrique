
'use server';
/**
 * @fileOverview Implements a Genkit flow to assist instructors with lecture creation.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

export const AssistLectureCreationInputSchema = z.object({
  courseTitle: z.string().describe("The title of the course this lecture belongs to."),
  lectureTitle: z.string().describe('The title of the lecture provided by the instructor.'),
});
export type AssistLectureCreationInput = z.infer<typeof AssistLectureCreationInputSchema>;

export const AssistLectureCreationOutputSchema = z.object({
  description: z.string().describe('A detailed and clear description for the lecture, including a summary of key points and what the student will learn. For an audience in French-speaking Africa.'),
});
export type AssistLectureCreationOutput = z.infer<typeof AssistLectureCreationOutputSchema>;

export async function assistLectureCreation(input: AssistLectureCreationInput): Promise<AssistLectureCreationOutput> {
  return assistLectureCreationFlow(input);
}

const assistLectureCreationPrompt = ai.definePrompt({
  name: 'assistLectureCreationPrompt',
  input: { schema: AssistLectureCreationInputSchema },
  output: { schema: AssistLectureCreationOutputSchema },
  prompt: `You are an expert curriculum designer.
  Your task is to generate a detailed description for a specific lecture within a course.
  The target audience is students in French-speaking Africa. The tone should be encouraging, clear, and professional.
  The description should summarize the key points of the lecture and set clear expectations for the student.

  Course Title: {{{courseTitle}}}
  Lecture Title: {{{lectureTitle}}}

  Generate a compelling lecture description based on these titles.`,
});

const assistLectureCreationFlow = ai.defineFlow(
  {
    name: 'assistLectureCreationFlow',
    inputSchema: AssistLectureCreationInputSchema,
    outputSchema: AssistLectureCreationOutputSchema,
  },
  async (input) => {
    const { output } = await assistLectureCreationPrompt(input);
    return output!;
  }
);
