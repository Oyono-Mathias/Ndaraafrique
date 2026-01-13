
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import Backend from 'i18next-http-backend';

i18n
  .use(Backend)
  // Le LanguageDetector est supprimé pour éviter les conflits de chargement avec le rendu serveur de Next.js
  .use(initReactI18next)
  .init({
    fallbackLng: 'fr',
    supportedLngs: ['fr', 'en', 'sg'],
    debug: false,
    interpolation: {
      escapeValue: false, // React already safes from xss
    },
    react: {
      useSuspense: false,
    },
    backend: {
      loadPath: '/locales/{{lng}}/translation.json',
    },
    // La détection est maintenant gérée manuellement pour plus de stabilité
    detection: {
      order: ['localStorage'],
      lookupLocalStorage: 'ndaraafrique-lang',
      caches: ['localStorage'],
    },
  });

export default i18n;

