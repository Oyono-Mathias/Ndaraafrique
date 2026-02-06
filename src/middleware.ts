import createMiddleware from 'next-intl/middleware';
 
export default createMiddleware({
  // A list of all locales that are supported
  locales: ['en', 'fr'],
 
  // Used when no locale matches
  defaultLocale: 'fr',
 
  // Toujours ajouter le préfixe de langue pour éviter les ambiguïtés de routes
  localePrefix: 'always'
});
 
export const config = {
  // Matcher standard pour next-intl
  matcher: [
    // Redirige la racine
    '/', 
    // Matcher toutes les routes localisées
    '/(fr|en)/:path*',
    // Matcher tout ce qui n'est pas une ressource statique ou API
    '/((?!api|_next|_vercel|.*\\..*).*)'
  ]
};
