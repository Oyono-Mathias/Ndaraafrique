'use server';
/**
 * @fileOverview Mathias IA - Contrôleur Qualité Élite.
 * Analyse les formations avant publication pour garantir les standards Ndara Afrique.
 * 
 * - auditCourseQuality - Fonction principale d'audit.
 * - AuditCourseInput - Schéma d'entrée (titre, desc, etc).
 * - AuditCourseOutput - Schéma de sortie avec score et verdict.
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
  issues: z.array(z.string()).describe("Liste des problèmes identifiés empêchant la publication"),
  suggestions: z.array(z.string()).describe("Suggestions d'amélioration pour atteindre l'excellence"),
  isValid: z.boolean().describe("Verdict final : TRUE si score >= 80, FALSE sinon"),
  mentorComment: z.string().describe("Message de mentorat de Mathias pour l'expert"),
});
export type AuditCourseOutput = z.infer<typeof AuditCourseOutputSchema>;

export async function auditCourseQuality(input: AuditCourseInput): Promise<AuditCourseOutput> {
  return auditCourseQualityFlow(input);
}

const auditPrompt = ai.definePrompt({
  name: 'auditCourseQualityPrompt',
  input: { schema: AuditCourseInputSchema },
  output: { schema: AuditCourseOutputSchema },
  prompt: `Tu es MATHIAS, le Gardien de l'Excellence Panafricaine sur Ndara Afrique. 
  Ta mission est de réaliser un audit impitoyable de la formation proposée par un expert.
  
  CRITÈRES DE RIGUEUR :
  1. PROFESSIONNALISME : Le titre et la description doivent être dignes d'une institution d'élite.
  2. VALEUR : Le contenu doit promettre une transformation réelle pour l'apprenant.
  3. STRUCTURE : Une formation avec moins de 3 leçons ou sans résumé clair doit être rejetée.
  4. ANTI-TEST : Rejette systématiquement les textes de type "test", "asdf", ou les contenus vides (Score < 20).

  DONNÉES DU COURS :
  - Titre : {{{title}}}
  - Catégorie : {{{category}}}
  - Description : {{{description}}}
  - Structure détectée : {{{contentSummary}}}

  DIRECTIVES DE RÉPONSE :
  - Tu dois attribuer un score entre 0 et 100.
  - La validation (isValid: true) est STRICTEMENT réservée aux scores >= 80.
  - Liste chaque défaut précisément dans 'issues'.

  Réponds en Français, avec la sagesse d'un mentor mais la fermeté d'un censeur de qualité.`,
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
