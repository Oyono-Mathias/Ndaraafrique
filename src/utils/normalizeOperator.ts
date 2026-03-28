/**
 * @fileOverview Utilitaire de normalisation des noms d'opérateurs API.
 * Transforme "MTN MOMO", "Orange Money CM", etc. en identifiants standards.
 */

export function normalizeOperator(input: string | undefined): string {
  if (!input) return 'unknown';
  
  const s = input.toLowerCase().trim();

  // Patterns de détection
  if (s.includes('mtn') || s.includes('momo')) return 'mtn';
  if (s.includes('orange')) return 'orange';
  if (s.includes('wave')) return 'wave';
  if (s.includes('wallet')) return 'wallet';
  if (s.includes('admin') || s.includes('system')) return 'admin';

  return 'unknown';
}
