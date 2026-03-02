import createMiddleware from 'next-intl/middleware';
 
/**
 * Middleware pour la gestion des locales et du routage.
 */
export default createMiddleware({
  locales: ['en', 'fr'],
  defaultLocale: 'fr',
  localePrefix: 'always'
});
 
export const config = {
  // Matcher pour exclure les fichiers statiques et les API
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)']
};
