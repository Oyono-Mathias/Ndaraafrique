import {getRequestConfig} from 'next-intl/server';
 
/**
 * Configuration next-intl pour le chargement dynamique des messages.
 * ✅ Support await requestLocale pour next-intl 3.22+
 */
export default getRequestConfig(async ({requestLocale}) => {
  const locale = await requestLocale;
  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default
  };
});
