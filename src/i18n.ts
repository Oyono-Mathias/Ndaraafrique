
import {getRequestConfig} from 'next-intl/server';
 
/**
 * Configuration i18n pour Ndara Afrique.
 * Retourne explicitement la locale pour stabiliser le build Vercel.
 */
export default getRequestConfig(async ({locale}) => {
  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default
  };
});
