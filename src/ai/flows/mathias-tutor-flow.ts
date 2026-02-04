'use server';

/**
 * @fileOverview Implements the MATHIAS AI Tutor Chat flow for student assistance.
 *
 * - mathiasTutor - The main function to initiate the AI tutor chat.
 * - MathiasTutorInput - Input type for the mathiasTutor function.
 * - MathiasTutorOutput - Output type for the mathiasTutor function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
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
        if (!adminDb) return [];
        try {
            const coursesRef = adminDb.collection('courses');
            const snapshot = await coursesRef.where('status', '==', 'Published').get();
            if (snapshot.empty) return [];
            return snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    title: data.title || 'Cours sans titre',
                    price: data.price || 0
                }
            });
        } catch (e) {
            console.error("Error fetching course catalog:", e);
            return [];
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
        if (!adminDb) return { answer: undefined };
       try {
            const keywords = query.toLowerCase().split(/\s+/).filter(k => k.length > 3);
            if (keywords.length === 0) return { answer: undefined };
            
            const faqsRef = adminDb.collection('faqs');
            // Limitation Firestore array-contains-any à 10 éléments
            const q = faqsRef.where('tags', 'array-contains-any', keywords.slice(0, 10));
            const snapshot = await q.get();

            if (!snapshot.empty) {
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
  prompt: `You are MATHIAS, the wise and encouraging AI tutor for Ndara Afrique, a pan-african e-learning platform.
  Your role is to guide students towards success with patience and local cultural relevance.
  
  **IMPORTANT RULES:**
  1. Respond EXCLUSIVELY in French.
  2. Always refer to yourself as MATHIAS.
  3. Use the 'searchFaq' tool FIRST if the user asks a practical question about the platform (certificates, payments, etc.).
  4. Use the 'getCourseCatalog' tool if the user asks about available courses or prices.
  5. If no FAQ answer is found, answer based on your knowledge and the course context.
  
  {{#if courseContext}}
  CONTEXTE DU COURS ACTUEL: {{{courseContext}}}
  {{/if}}

  QUESTION DE L'ÉTUDIANT: {{{query}}}

  RÉPONSE DE MATHIAS (en Français):`,
});

const mathiasTutorFlow = ai.defineFlow(
  {
    name: 'mathiasTutorFlow',
    inputSchema: MathiasTutorInputSchema,
    outputSchema: MathiasTutorOutputSchema,
  },
  async input => {
    try {
        const {output} = await mathiasTutorPrompt(input);
        if (!output) throw new Error("L'IA n'a pas généré de réponse.");
        return output;
    } catch (error: any) {
        console.error("Mathias Flow Error:", error);
        return { response: "Désolé, je rencontre une petite difficulté technique pour vous répondre. Pouvez-vous reformuler votre question ?" };
    }
  }
);
