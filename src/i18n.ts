import {getRequestConfig} from 'next-intl/server';
 
/**
 * Configuration i18n pour Ndara Afrique (Source).
 * Garantit la cohérence avec le fichier racine pour éviter les erreurs de build.
 */
export default getRequestConfig(async ({locale}) => {
  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default
  };
});
