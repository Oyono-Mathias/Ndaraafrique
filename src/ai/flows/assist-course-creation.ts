'use server';

/**
 * @fileOverview Implements a Genkit flow to assist instructors with course creation.
 *
 * - assistCourseCreation - The main function to generate course details.
 * - AssistCourseCreationInput - Input type for the function.
 * - AssistCourseCreationOutput - Output type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const AssistCourseCreationInputSchema = z.object({
  courseTitle: z.string().describe('The title of the course provided by the instructor.'),
});
export type AssistCourseCreationInput = z.infer<typeof AssistCourseCreationInputSchema>;

const AssistCourseCreationOutputSchema = z.object({
  description: z.string().describe('A detailed and engaging marketing description for the course.'),
  category: z.string().describe('A suggested primary category for the course.'),
  tags: z.array(z.string()).describe('A list of relevant keywords (tags) for SEO and discoverability.'),
});
export type AssistCourseCreationOutput = z.infer<typeof AssistCourseCreationOutputSchema>;

export async function assistCourseCreation(input: AssistCourseCreationInput): Promise<AssistCourseCreationOutput> {
  return assistCourseCreationFlow(input);
}

const assistCourseCreationPrompt = ai.definePrompt({
  name: 'assistCourseCreationPrompt',
  input: { schema: AssistCourseCreationInputSchema },
  output: { schema: AssistCourseCreationOutputSchema },
  prompt: `You are a marketing copywriter and content strategist specializing in online courses.
  Your task is to generate a compelling course description, a primary category, and relevant SEO tags based on a course title.
  The target audience is in French-speaking Africa. The tone should be professional, encouraging, and clear.

  Course Title: {{{courseTitle}}}

  Generate the description, category, and tags based on this title.`,
});

const assistCourseCreationFlow = ai.defineFlow(
  {
    name: 'assistCourseCreationFlow',
    inputSchema: AssistCourseCreationInputSchema,
    outputSchema: AssistCourseCreationOutputSchema,
  },
  async (input) => {
    const { output } = await assistCourseCreationPrompt(input);
    return output!;
  }
);
