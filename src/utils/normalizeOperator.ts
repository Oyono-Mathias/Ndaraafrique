/**
 * @fileOverview Utilitaire de normalisation des noms d'opérateurs API.
 * Transforme les variantes textuelles en clés de logo standard.
 * ✅ OPTIMISÉ : Détection par préfixe téléphonique et mots-clés larges.
 */

export function normalizeOperator(input: string | undefined): string {
  if (!input) return 'wallet';
  
  const s = input.toLowerCase().trim();

  // 1. Détection MTN (Inclut les numéros commençant par 67 ou 68 au Cameroun)
  if (
    s.includes('mtn') || 
    s.includes('momo') || 
    s.startsWith('67') || 
    s.startsWith('68') || 
    s.includes('mobile_money')
  ) {
    return 'mtn';
  }
  
  // 2. Détection ORANGE (Inclut les numéros commençant par 69 au Cameroun)
  if (
    s.includes('orange') || 
    s.startsWith('69') || 
    s.includes('om') || 
    s.includes('orange_money')
  ) {
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
  
  // 5. Fallback par défaut (Ndara Logo)
  return 'wallet';
}
