
import createMiddleware from 'next-intl/middleware';
 
const locales = ['fr', 'en'];
const defaultLocale = 'fr';

export default createMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'always'
});
 
export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)']
};
