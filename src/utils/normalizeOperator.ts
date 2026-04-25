/**
 * @fileOverview Utilitaire de normalisation des noms d'opérateurs API.
 * Transforme les variantes textuelles en clés de logo standard.
 */

export function normalizeOperator(input: string | undefined): string {
  if (!input) return 'wallet';
  
  const s = input.toLowerCase().trim();

  // 1. Détection MTN
  if (s.includes('mtn') || s.includes('momo') || s.includes('67') || s.includes('68')) {
    return 'mtn';
  }
  
  // 2. Détection ORANGE
  if (s.includes('orange') || s.includes('69')) {
    return 'orange';
  }
  
  // 3. Détection WAVE
  if (s.includes('wave')) {
    return 'wave';
  }

  // 4. Détection ADMIN/SYSTEM
  if (s.includes('admin') || s.includes('system')) {
    return 'admin';
  }
  
  // 5. Fallback par défaut (Ndara Logo) pour les passerelles génériques
  return 'wallet';
}
