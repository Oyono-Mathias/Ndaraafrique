import {getRequestConfig} from 'next-intl/server';
 
/**
 * Configuration i18n pour Ndara Afrique.
 * Gère le chargement des messages selon la locale détectée.
 */
export default getRequestConfig(async ({locale}) => {
  return {
    messages: (await import(`./messages/${locale}.json`)).default
  };
});
