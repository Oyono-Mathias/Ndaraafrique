import createMiddleware from 'next-intl/middleware';
import {NextRequest} from 'next/server';

const locales = ['fr', 'en'];
const defaultLocale = 'fr';

export default async function middleware(req: NextRequest) {
  // Vercel provides the user's country in the `x-vercel-ip-country` header
  // For local development, you can use geo.country or default to something.
  const country = (req.geo && req.geo.country) || 'CM'; 
  
  let locale = defaultLocale;
  
  // Simplified logic for fr/en
  if (country === 'NG' || country === 'US' || country === 'GB') {
    locale = 'en';
  } else {
    locale = 'fr';
  }

  const handle = createMiddleware({
    locales,
    defaultLocale: locale, // Dynamically set default based on country
    localePrefix: 'always'
  });

  return handle(req);
}

export const config = {
  // Match all pathnames except for
  // - … if they start with `/api`, `/_next` or `/_vercel`
  // - … the ones containing a dot (e.g. `favicon.ico`)
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)']
};
