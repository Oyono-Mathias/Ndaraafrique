import {getRequestConfig} from 'next-intl/server';
 
/**
 * Configuration next-intl pour le chargement dynamique des messages.
 */
export default getRequestConfig(async ({locale}) => {
  return {
    messages: (await import(`./messages/${locale}.json`)).default
  };
});