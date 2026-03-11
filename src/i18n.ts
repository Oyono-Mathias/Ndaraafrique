import {getRequestConfig} from 'next-intl/server';
 
/**
 * Configuration i18n pour Ndara Afrique.
 * Gère le chargement des messages selon la locale détectée.
 * Mise à jour : Utilise await requestLocale pour éviter les dépréciations.
 */
export default getRequestConfig(async ({requestLocale}) => {
  const locale = await requestLocale;
  
  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default
  };
});
