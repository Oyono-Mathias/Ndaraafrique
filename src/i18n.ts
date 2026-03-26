import {getRequestConfig} from 'next-intl/server';
 
/**
 * Configuration next-intl pour le chargement dynamique des messages.
 * ✅ Localisation : src/i18n.ts
 */
export default getRequestConfig(async ({locale}) => {
  return {
    messages: (await import(`./messages/${locale}.json`)).default
  };
});