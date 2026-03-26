import {notFound} from 'next/navigation';
import {getRequestConfig} from 'next-intl/server';
 
// Liste des langues autorisées (doit être la même que dans le middleware)
const locales = ['fr', 'en', 'sg'];
 
/**
 * Configuration next-intl sécurisée.
 * Garantit que le Sango est chargé avec les mêmes règles que le Français.
 */
export default getRequestConfig(async ({requestLocale}) => {
  const locale = await requestLocale;
 
  // Validation de la langue : si ce n'est pas dans la liste, on renvoie une 404
  if (!locales.includes(locale as any)) notFound();
 
  return {
    locale,
    // Chargement dynamique du fichier JSON correspondant
    messages: (await import(`./messages/${locale}.json`)).default,
    // Optionnel : Ajoute ici une gestion de fuseau horaire si nécessaire plus tard
    timeZone: 'Africa/Douala'
  };
});