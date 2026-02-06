import createMiddleware from 'next-intl/middleware';
 
export default createMiddleware({
  // Liste des locales supportées
  locales: ['en', 'fr'],
 
  // Locale par défaut
  defaultLocale: 'fr',
 
  // ✅ Correction 404 : Force le préfixe de langue pour que '/' redirige vers '/fr'
  // Cela garantit que les pages dans [locale] sont toujours trouvées.
  localePrefix: 'always'
});
 
export const config = {
  // Matcher amélioré pour inclure toutes les routes sauf fichiers statiques et API
  matcher: [
    '/', 
    '/(fr|en)/:path*',
    '/((?!api|_next|_vercel|.*\\..*).*)'
  ]
};
