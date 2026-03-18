import {getRequestConfig} from 'next-intl/server';
 
/**
 * Configuration i18n pour Ndara Afrique.
 * Gère le chargement des messages selon la locale détectée.
 * Supporte : Français (fr), Anglais (en), Sango (sg).
 */
export default getRequestConfig(async ({requestLocale}) => {
  const locale = await requestLocale;
  
  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default
  };
});
