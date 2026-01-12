
'use server';

/**
 * @fileOverview Implements the MATHIAS AI Tutor Chat flow for student assistance.
 *
 * - mathiasTutor - The main function to initiate the AI tutor chat.
 * - MathiasTutorInput - Input type for the mathiasTutor function.
 * - MathiasTutorOutput - Output type for the mathiasTutor function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';
import { adminDb } from '@/firebase/admin';

const MathiasTutorInputSchema = z.object({
  query: z.string().describe('The student’s question or request for the AI tutor.'),
  courseContext: z.string().optional().describe('The ID or content of the course the student is currently viewing.'),
});
export type MathiasTutorInput = z.infer<typeof MathiasTutorInputSchema>;

const MathiasTutorOutputSchema = z.object({
  response: z.string().describe('The AI tutor’s response to the student’s query.'),
});
export type MathiasTutorOutput = z.infer<typeof MathiasTutorOutputSchema>;

const getCourseCatalog = ai.defineTool(
    {
        name: 'getCourseCatalog',
        description: 'Get the list of available courses on the FormaAfrique platform, including their titles and prices.',
        inputSchema: z.object({}),
        outputSchema: z.array(z.object({
            title: z.string(),
            price: z.number(),
        })),
    },
    async () => {
        if (!adminDb) {
            console.error("TOOL ERROR: Firestore admin is not initialized. Check firebase/admin.ts.");
            return [];
        }

        try {
            console.log('Tool "getCourseCatalog" triggered. Fetching published courses...');
            const coursesCol = adminDb.collection('courses');
            // OPTIMIZATION: Only query for published courses to keep the context relevant and the query fast.
            const q = coursesCol.where('status', '==', 'Published');
            const courseSnapshot = await q.get();

            if (courseSnapshot.empty) {
                console.log('Tool "getCourseCatalog": No published courses found.');
                return [];
            }
            
            const courseList = courseSnapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    title: data.title,
                    price: data.price
                };
            });
            
            console.log(`Tool "getCourseCatalog": Found ${courseList.length} courses.`);
            return courseList;

        } catch (error) {
            console.error('TOOL ERROR: Failed to fetch course catalog from Firestore:', error);
            // Return an empty array to the LLM to indicate no data is available, preventing a crash.
            return [];
        }
    }
);


export async function mathiasTutor(input: MathiasTutorInput): Promise<MathiasTutorOutput> {
  return mathiasTutorFlow(input);
}

const mathiasTutorPrompt = ai.definePrompt({
  name: 'mathiasTutorPrompt',
  input: {schema: MathiasTutorInputSchema},
  output: {schema: MathiasTutorOutputSchema},
  tools: [getCourseCatalog],
  prompt: `You are MATHIAS, an AI tutor for a platform called FormaAfrique, targeting students in French-speaking Africa.
  Your role is to act as an educational tutor.
  **You must respond exclusively in French.**
  Answer questions, explain complex concepts, and provide additional context strictly related to the course content.
  Be encouraging, clear, and professional. Always refer to yourself as MATHIAS.
  
  If the user asks about available courses, their prices, or the catalog, you MUST use the 'getCourseCatalog' tool to get the most up-to-date information. Do not invent courses or prices.
  
  If the user asks a question about a specific course he is currently on, use the provided course context to answer.
  
  {{#if courseContext}}
  Course Context: {{{courseContext}}}
  {{/if}}

  Student's Question: {{{query}}}

  Your Response (as MATHIAS, in French):`,
});

const mathiasTutorFlow = ai.defineFlow(
  {
    name: 'mathiasTutorFlow',
    inputSchema: MathiasTutorInputSchema,
    outputSchema: MathiasTutorOutputSchema,
  },
  async input => {
    const {output} = await mathiasTutorPrompt(input);
    return output!;
  }
);
