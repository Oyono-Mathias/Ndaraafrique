
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
        description: 'Get the list of available courses on the Ndara Afrique platform, including their titles and prices.',
        inputSchema: z.object({}),
        outputSchema: z.array(z.object({
            title: z.string(),
            price: z.number(),
        })),
    },
    async () => {
        if (!adminDb) throw new Error("Database not connected");
        try {
            const coursesRef = adminDb.collection('courses');
            const snapshot = await coursesRef.where('status', '==', 'Published').get();
            if (snapshot.empty) return [];
            return snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    title: data.title,
                    price: data.price
                }
            });
        } catch (e) {
            console.error("Error fetching course catalog:", e);
            return []; // Return empty on error to not break the flow
        }
    }
);

const searchFaq = ai.defineTool(
    {
        name: 'searchFaq',
        description: 'Searches the FAQ for a given query to find a relevant answer.',
        inputSchema: z.object({
            query: z.string().describe("The user's question to search for in the FAQ."),
        }),
        outputSchema: z.object({
            answer: z.string().optional().describe("The answer found in the FAQ, if any."),
        }),
    },
    async ({ query }) => {
        if (!adminDb) throw new Error("Database not connected");
       try {
            const keywords = query.toLowerCase().split(/\s+/).filter(k => k.length > 2);
            if (keywords.length === 0) return { answer: undefined };
            
            const faqsRef = adminDb.collection('faqs');
            // Firestore 'array-contains-any' is limited to 10 values in the array.
            const q = faqsRef.where('tags', 'array-contains-any', keywords.slice(0, 10));
            const snapshot = await q.get();

            if (!snapshot.empty) {
                // Simple strategy: return the first match.
                const bestMatch = snapshot.docs[0].data();
                return { answer: bestMatch.answer_fr };
            }
            return { answer: undefined };
        } catch(e) {
            console.error("Error searching FAQ:", e);
            return { answer: undefined };
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
  tools: [getCourseCatalog, searchFaq],
  prompt: `You are MATHIAS, an AI tutor for a platform called Ndara Afrique, targeting students in French-speaking Africa.
  Your role is to act as an educational tutor.
  **You must respond exclusively in French.**

  **Your process is as follows:**
  1.  **First, ALWAYS use the 'searchFaq' tool** to check if the user's question can be answered by the Frequently Asked Questions.
  2.  If the 'searchFaq' tool returns an answer, provide that exact answer to the user, starting with "J'ai trouvé une réponse dans notre FAQ :".
  3.  If the 'searchFaq' tool does not return an answer, then proceed to answer the question yourself based on your general knowledge and the provided context.
  4.  If the user asks about available courses, their prices, or the catalog, you MUST use the 'getCourseCatalog' tool to get the most up-to-date information. Do not invent courses or prices.
  
  Be encouraging, clear, and professional. Always refer to yourself as MATHIAS.
  
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
