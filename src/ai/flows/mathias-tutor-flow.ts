'use server';

/**
 * @fileOverview Implements the MATHIAS AI Tutor Chat flow for student assistance.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { getAdminDb } from '@/firebase/admin';

const MathiasTutorInputSchema = z.object({
  query: z.string().describe('The student’s question or request for the AI tutor.'),
  courseContext: z.string().optional().describe('The ID or content of the course the student is currently viewing.'),
});
export type MathiasTutorInput = z.infer<typeof MathiasTutorInputSchema>;

const MathiasTutorOutputSchema = z.object({
  response: z.string().describe('The AI tutor’s response to the student’s query.'),
  isError: z.boolean().optional().describe('Flag indicating if the response is an error message.'),
});
export type MathiasTutorOutput = z.infer<typeof MathiasTutorOutputSchema>;

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
        try {
            const db = getAdminDb();
            const coursesRef = db.collection('courses');
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
            console.warn("MATHIAS Tool Warning (getCourseCatalog): Admin not fully initialized or no DB access.");
            return [];
        }
    }
);

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
       try {
            const db = getAdminDb();
            const keywords = query.toLowerCase().split(/\s+/).filter(k => k.length > 3);
            if (keywords.length === 0) return { answer: undefined };
            
            const faqsRef = db.collection('faqs');
            const q = faqsRef.where('tags', 'array-contains-any', keywords.slice(0, 10));
            const snapshot = await q.get();

            if (!snapshot.empty) {
                const bestMatch = snapshot.docs[0].data();
                return { answer: bestMatch.answer_fr };
            }
            return { answer: undefined };
        } catch(e) {
            console.warn("MATHIAS Tool Warning (searchFaq): Admin not fully initialized or no DB access.");
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
  system: `Tu es MATHIAS, le tuteur IA sage, bienveillant et hautement compétent de Ndara Afrique. 
  Ton but est d'accompagner les étudiants africains vers la réussite avec patience et clarté.
  Réponds toujours en Français, avec un ton chaleureux et encourageant.
  Si on te pose une question sur un cours, utilise tes outils pour vérifier les informations si nécessaire.`,
  prompt: `
  {{#if courseContext}}
  Je suis actuellement en train de regarder le cours/leçon suivant : {{{courseContext}}}
  {{/if}}

  Voici ma question : {{{query}}}
  `,
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
        if (!output || !output.response) {
            throw new Error("L'IA n'a pas généré de contenu.");
        }
        return { ...output, isError: false };
    } catch (error: any) {
        console.error("Mathias Flow Execution Error:", error);
        return { 
            response: "Bara ala ! J'ai eu un petit vertige technique. Vérifiez votre connexion ou réessayez dans quelques secondes. (Erreur: " + (error.message || "IA_TIMEOUT") + ")",
            isError: true 
        };
    }
  }
);
