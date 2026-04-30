'use server';
/**
 * @fileOverview Mathias IA - Contrôleur Qualité Élite.
 * Analyse les formations avant publication pour garantir les standards Ndara Afrique.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const AuditCourseInputSchema = z.object({
  title: z.string().describe("Titre du cours"),
  description: z.string().describe("Description détaillée"),
  category: z.string().describe("Catégorie visée"),
  contentSummary: z.string().describe("Résumé de la structure du cours (leçons, quiz)"),
});
export type AuditCourseInput = z.infer<typeof AuditCourseInputSchema>;

const AuditCourseOutputSchema = z.object({
  score: z.number().describe("Score global de qualité sur 100"),
  issues: z.array(z.string()).describe("Liste des problèmes identifiés"),
  suggestions: z.array(z.string()).describe("Suggestions d'amélioration"),
  isValid: z.boolean().describe("Si le cours peut être soumis (score >= 80)"),
  mentorComment: z.string().describe("Commentaire de Mathias pour l'expert"),
});
export type AuditCourseOutput = z.infer<typeof AuditCourseOutputSchema>;

export async function auditCourseQuality(input: AuditCourseInput): Promise<AuditCourseOutput> {
  return auditCourseQualityFlow(input);
}

const auditPrompt = ai.definePrompt({
  name: 'auditCourseQualityPrompt',
  input: { schema: AuditCourseInputSchema },
  output: { schema: AuditCourseOutputSchema },
  prompt: `Tu es MATHIAS, le Contrôleur Qualité Élite de Ndara Afrique. 
  Ta mission est d'auditer la formation suivante pour s'assurer qu'elle respecte les standards d'excellence panafricaine.

  CRITÈRES D'AUDIT :
  1. CLARTÉ : Le titre et la description sont-ils explicites et professionnels ?
  2. VALEUR : Le contenu semble-t-il apporter une réelle compétence ?
  3. STRUCTURE : Y a-t-il suffisamment de modules pour justifier une formation ?
  4. COHÉRENCE : La catégorie correspond-elle au sujet ?

  DONNÉES DU COURS :
  - Titre : {{{title}}}
  - Catégorie : {{{category}}}
  - Description : {{{description}}}
  - Structure : {{{contentSummary}}}

  CONSIGNES DE SCORE :
  - Un score < 80 est considéré comme insuffisant.
  - Sois exigeant. Nous ne voulons pas de contenu "test" ou vide.
  - Si le texte contient du charabia (asdf, test test...), le score doit être inférieur à 20.

  Réponds avec franchise et bienveillance au format JSON.`,
});

const auditCourseQualityFlow = ai.defineFlow(
  {
    name: 'auditCourseQualityFlow',
    inputSchema: AuditCourseInputSchema,
    outputSchema: AuditCourseOutputSchema,
  },
  async (input) => {
    const { output } = await auditPrompt(input);
    return output!;
  }
);
