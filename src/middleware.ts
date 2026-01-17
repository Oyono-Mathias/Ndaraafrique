import createMiddleware from 'next-intl/middleware';
import {NextRequest} from 'next/server';

const locales = ['fr', 'en', 'sg', 'ln', 'ar'];
const defaultLocale = 'fr';

export default async function middleware(req: NextRequest) {
  // Vercel provides the user's country in the `x-vercel-ip-country` header
  // For local development, you can use geo.country or default to something.
  const country = (req.geo && req.geo.country) || 'CM'; 
  
  let locale = defaultLocale;
  
  switch(country) {
    case 'NG':
      locale = 'en';
      break;
    case 'CF':
      locale = 'sg';
      break;
    case 'CD':
      locale = 'ln';
      break;
    case 'MA':
      locale = 'ar';
      break;
    default:
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