import createMiddleware from 'next-intl/middleware';
 
/**
 * Gestionnaire de routage internationalisé.
 * Définit les langues supportées et la locale par défaut.
 */
export default createMiddleware({
  // Langues supportées par Ndara Afrique
  locales: ['fr', 'en', 'sg'],
 
  // Langue utilisée si aucune n'est détectée
  defaultLocale: 'fr',

  // N'affiche le préfixe dans l'URL que si nécessaire
  localePrefix: 'as-needed'
});
 
export const config = {
  // Matcher pour exclure les fichiers statiques, les API et les ressources internes
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)']
};