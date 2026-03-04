import {getRequestConfig} from 'next-intl/server';
 
/**
 * Configuration i18n pour Ndara Afrique.
 * ✅ RÉSOLU : Avertissement de dépréciation pour Vercel.
 */
export default getRequestConfig(async ({locale}) => {
  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default,
    timeZone: 'UTC'
  };
});
