'use server';

/**
 * @fileOverview Implements the MATHIAS AI Tutor Chat flow for student assistance.
 * ✅ SECURED: Consumes user credits.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { getAdminDb } from '@/firebase/admin';
import { consumeAiCredits } from '@/actions/instructorActions';

const MathiasTutorInputSchema = z.object({
  query: z.string().describe('La question ou la requête de l’étudiant pour le tuteur IA.'),
  courseContext: z.string().optional().describe('L’ID ou le contenu du cours que l’étudiant consulte actuellement.'),
  userId: z.string().describe('ID de l’utilisateur pour la gestion des crédits.'),
});
export type MathiasTutorInput = z.infer<typeof MathiasTutorInputSchema>;

const MathiasTutorOutputSchema = z.object({
  response: z.string().describe('La réponse du tuteur IA à la requête de l’étudiant.'),
  isError: z.boolean().optional().describe('Indicateur si la réponse est un message d’erreur.'),
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
            console.warn("MATHIAS Tool Warning (getCourseCatalog): Pas d'accès DB.");
            return [];
        }
    }
);

const searchFaq = ai.defineTool(
    {
        name: 'searchFaq',
        description: 'Recherche une réponse dans la base de connaissances (FAQ) de la plateforme.',
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
            console.warn("MATHIAS Tool Warning (searchFaq): Pas d'accès DB.");
            return { answer: undefined };
        }
    }
);

export async function mathiasTutor(input: MathiasTutorInput): Promise<MathiasTutorOutput> {
  // 🛡️ SECURITY CHECK: Consume 1 credit per query
  try {
    await consumeAiCredits(input.userId, 1);
  } catch (e: any) {
      return { 
          response: "Bara ala ! Vos crédits Mathias IA sont épuisés. Veuillez recharger votre compte ou passer au mode Premium pour continuer notre échange.",
          isError: true 
      };
  }
  
  return mathiasTutorFlow(input);
}

const mathiasTutorPrompt = ai.definePrompt({
  name: 'mathiasTutorPrompt',
  input: {schema: MathiasTutorInputSchema},
  output: {schema: MathiasTutorOutputSchema},
  tools: [getCourseCatalog, searchFaq],
  config: {
    temperature: 0.7,
  },
  system: `Tu es MATHIAS, le tuteur IA d'élite de Ndara Afrique, l'infrastructure du savoir panafricain. 
  
  TES DIRECTIVES DE PERSONNALITÉ :
  1. TON : Sage, bienveillant, hautement compétent et encourageant. Tu es un mentor, pas juste une IA.
  2. IDENTITÉ : Tu es fier de l'excellence africaine. Tu encourages l'autonomie financière et technologique du continent.
  3. LANGUE : Tu réponds exclusivement en Français, mais tu peux utiliser des expressions de salutation comme "Bara ala" (Sango) pour renforcer la proximité.
  4. MISSION : Accompagner les étudiants vers la réussite totale. Si un étudiant est perdu, guide-le étape par étape.
  
  TES DIRECTIVES TECHNIQUES :
  - Si la question concerne un cours spécifique, utilise le contexte fourni.
  - Si l'utilisateur demande des informations sur les prix ou le catalogue, utilise l'outil 'getCourseCatalog'.
  - Si l'utilisateur a un problème technique ou une question générale, utilise 'searchFaq'.
  - Réponds TOUJOURS au format JSON avec le champ "response".`,
  prompt: `
  {{#if courseContext}}
  CONTEXTE DU COURS ACTUEL : {{{courseContext}}}
  {{/if}}

  QUESTION DE L'ÉTUDIANT : {{{query}}}
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
        console.log(`[Mathias] Appel Gemini pour : "${input.query.substring(0, 50)}..."`);
        
        const response = await mathiasTutorPrompt(input);
        
        // Tentative de récupération de la sortie structurée
        if (response.output && response.output.response) {
            return { response: response.output.response, isError: false };
        }
        
        // Fallback sur le texte brut si le schéma JSON a échoué
        if (response.text) {
            console.warn("[Mathias] L'IA n'a pas respecté le format JSON, utilisation du texte brut.");
            return { response: response.text, isError: false };
        }

        throw new Error("Aucun contenu généré par Gemini.");

    } catch (error: any) {
        console.error("❌ MATHIAS_FLOW_CRITICAL_ERROR:", error.message);

        let errorMsg = "Bara ala ! Ma connexion aux serveurs de savoir est temporairement instable. Réessaie dans quelques secondes.";
        return { 
            response: errorMsg,
            isError: true 
        };
    }
  }
);
