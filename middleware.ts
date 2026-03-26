import createMiddleware from 'next-intl/middleware';
 
/**
 * Gestionnaire de routage internationalisé.
 * ✅ Persistance : Détecte la locale via le cookie NEXT_LOCALE.
 * ✅ Configuration : localePrefix as-needed pour des URLs propres.
 */
export default createMiddleware({
  // Langues supportées par Ndara Afrique
  locales: ['fr', 'en', 'sg'],
 
  // Langue utilisée si aucune n'est détectée
  defaultLocale: 'fr',

  // N'affiche le préfixe dans l'URL que si nécessaire (ex: / pour fr, /en pour en)
  localePrefix: 'as-needed',

  // Active la détection automatique (priorité au cookie NEXT_LOCALE)
  localeDetection: true
});
 
export const config = {
  // Matcher pour exclure les fichiers statiques, les API et les ressources internes
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)']
};