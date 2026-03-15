import {getRequestConfig} from 'next-intl/server';
 
/**
 * Redirection vers la configuration source.
 */
export default getRequestConfig(async ({requestLocale}) => {
  const locale = await requestLocale;
  return {
    locale,
    messages: (await import(`./src/messages/${locale}.json`)).default
  };
});
