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

/**
 * Tool to fetch the course catalog from Firestore.
 * Handles errors internally to prevent flow crashes.
 */
const getCourseCatalog = ai.defineTool(
    {
        name: 'getCourseCatalog',
        description: 'Obtient la liste des cours disponibles sur Ndara Afrique.',
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
            const snapshot = await coursesRef.limit(10).get();
            if (snapshot.empty) return [];
            return snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    title: data.title || 'Cours sans titre',
                    price: data.price || 0
                }
            });
        } catch (e) {
            console.error("MATHIAS Tool Error (getCourseCatalog):", e);
            return [];
        }
    }
);

/**
 * Tool to search the FAQ in Firestore.
 */
const searchFaq = ai.defineTool(
    {
        name: 'searchFaq',
        description: 'Recherche une réponse dans la FAQ de la plateforme.',
        inputSchema: z.object({
            query: z.string().describe("La question de l'utilisateur à chercher."),
        }),
        outputSchema: z.object({
            answer: z.string().optional().describe("La réponse trouvée dans la FAQ."),
        }),
    },
    async ({ query }) => {
        if (!adminDb) return { answer: undefined };
       try {
            const keywords = query.toLowerCase().split(/\s+/).filter(k => k.length > 3);
            if (keywords.length === 0) return { answer: undefined };
            
            const faqsRef = adminDb.collection('faqs');
            // Simplified search for prototype robustness
            const q = faqsRef.where('tags', 'array-contains-any', keywords.slice(0, 10));
            const snapshot = await q.get();

            if (!snapshot.empty) {
                const bestMatch = snapshot.docs[0].data();
                return { answer: bestMatch.answer_fr };
            }
            return { answer: undefined };
        } catch(e) {
            console.error("MATHIAS Tool Error (searchFaq):", e);
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
  prompt: `Tu es MATHIAS, le tuteur IA sage, bienveillant et encourageant de Ndara Afrique.
  Ton rôle est d'accompagner les étudiants vers la réussite avec patience.
  
  **RÈGLES D'OR :**
  1. Réponds EXCLUSIVEMENT en Français.
  2. Présente-toi toujours comme MATHIAS.
  3. Utilise 'searchFaq' si l'étudiant pose une question pratique (certificats, paiements, etc.).
  4. Utilise 'getCourseCatalog' si l'étudiant demande quels sont les cours disponibles ou leurs prix.
  5. Si aucun outil ne donne de réponse, utilise tes connaissances générales pour aider l'étudiant de manière pédagogique.
  6. Ton ton doit être chaleureux et culturellement adapté à l'Afrique francophone.
  
  {{#if courseContext}}
  CONTEXTE DU COURS : {{{courseContext}}}
  {{/if}}

  QUESTION DE L'ÉTUDIANT : {{{query}}}

  RÉPONSE DE MATHIAS :`,
});

const mathiasTutorFlow = ai.defineFlow(
  {
    name: 'mathiasTutorFlow',
    inputSchema: MathiasTutorInputSchema,
    outputSchema: MathiasTutorOutputSchema,
  },
  async input => {
    try {
        if (!process.env.GOOGLE_GENAI_API_KEY && !process.env.GEMINI_API_KEY) {
            console.error("MATHIAS Error: No API Key configured.");
            return { response: "Bara ala ! Je rencontre une petite difficulté de configuration. Si ma sagesse vous manque, n'hésitez pas à ouvrir un ticket au support client ou à consulter notre FAQ. Je serai de retour très bientôt !" };
        }

        const {output} = await mathiasTutorPrompt(input);
        if (!output || !output.response) {
            throw new Error("L'IA n'a pas généré de contenu.");
        }
        return output;
    } catch (error: any) {
        console.error("Mathias Flow Execution Error:", error);
        return { response: "Oups ! J'ai eu un petit vertige technique en cherchant votre réponse. Vous pouvez réessayer dans quelques secondes. Si le problème persiste, notre équipe de support est là pour prendre le relais !" };
    }
  }
);
