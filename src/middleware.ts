import createMiddleware from 'next-intl/middleware';
 
/**
 * Middleware pour la gestion des locales et du routage.
 * Supporte maintenant le Français, l'Anglais et le Sango.
 */
export default createMiddleware({
  locales: ['en', 'fr', 'sg'],
  defaultLocale: 'fr',
  localePrefix: 'as-needed'
});
 
export const config = {
  // Matcher pour exclure les fichiers statiques et les API
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)']
};
