import createMiddleware from 'next-intl/middleware';
 
/**
 * Gestionnaire de routage internationalisé - Ndara Afrique.
 * Version stabilisée pour éviter les erreurs de routes en Sango.
 */
export default createMiddleware({
  // Langues supportées
  locales: ['fr', 'en', 'sg'],
 
  // Langue par défaut
  defaultLocale: 'fr',

  // FORCE le préfixe dans l'URL pour toutes les langues.
  // Cela garantit que /sg/ reste /sg/ sur toutes les pages.
  localePrefix: 'always'
});
 
export const config = {
  // Matcher pour exclure les fichiers statiques et ressources internes
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)']
};