'use server';

/**
 * @fileOverview Implements the MATHIAS AI grading flow for student assignments.
 *
 * - gradeAssignment - The main function to grade a student's work.
 * - GradeAssignmentInput - Input type for the function.
 * - GradeAssignmentOutput - Output type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

export const GradeAssignmentInputSchema = z.object({
  correctionGuide: z.string().describe("The instructor's guidelines on what to look for and how to grade the assignment."),
  studentWork: z.string().describe("The student's submitted work, which could be text or a URL to a file."),
});
export type GradeAssignmentInput = z.infer<typeof GradeAssignmentInputSchema>;

export const GradeAssignmentOutputSchema = z.object({
  note: z.string().describe("The grade formatted as 'XX/20'."),
  points_forts: z.string().describe("What the student did well, highlighting their understanding."),
  points_amelioration: z.string().describe("Constructive feedback on what could be improved."),
  commentaire_fr: z.string().describe("An encouraging mentor comment in French."),
  commentaire_sg: z.string().describe("A short, encouraging summary in Sango."),
});
export type GradeAssignmentOutput = z.infer<typeof GradeAssignmentOutputSchema>;


export async function gradeAssignment(input: GradeAssignmentInput): Promise<GradeAssignmentOutput> {
  return gradeAssignmentFlow(input);
}

const gradeAssignmentPrompt = ai.definePrompt({
  name: 'gradeAssignmentPrompt',
  input: { schema: GradeAssignmentInputSchema },
  output: { schema: GradeAssignmentOutputSchema },
  prompt: `You are MATHIAS, a fair and encouraging AI tutor for FormaAfrique, an online learning platform for French-speaking Africa.
  Your mission is to grade a student's assignment based STRICTLY on the instructor's provided guidelines.

  **Correction Rules:**
  1.  **FAIRNESS:** Be supportive. If the student understands the core concept but makes minor mistakes, focus on encouragement.
  2.  **STRUCTURE:** Your response MUST follow this structure:
      -   A grade out of 20 (e.g., "16/20").
      -   Strong Points: What the student did well.
      -   Areas for Improvement: Constructive feedback.
      -   Mentor's Comment (in French): An encouraging closing remark.
      -   Sango Summary: A very short, encouraging phrase in Sango (e.g., "Mo sara kua nzoni!").
  3.  **SPECIAL CASE:** If the work is completely off-topic, gently explain why it doesn't meet the requirements, suggest they review the course material, and give a grade of "5/20". Do not be harsh.

  **Instructor's Correction Guide:**
  {{{correctionGuide}}}

  **Student's Submitted Work:**
  {{{studentWork}}}

  Now, provide the structured evaluation in the required JSON format.`,
});

const gradeAssignmentFlow = ai.defineFlow(
  {
    name: 'gradeAssignmentFlow',
    inputSchema: GradeAssignmentInputSchema,
    outputSchema: GradeAssignmentOutputSchema,
  },
  async (input) => {
    const { output } = await gradeAssignmentPrompt(input);
    return output!;
  }
);
