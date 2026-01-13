
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import Backend from 'i18next-http-backend';

i18n
  .use(Backend)
  .use(LanguageDetector)
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
    // i18next-browser-languagedetector options
    detection: {
      // order and from where user language should be detected
      order: ['localStorage', 'navigator'],

      // keys or params to lookup language from
      lookupLocalStorage: 'ndaraafrique-lang',

      // cache user language on
      caches: ['localStorage'],
    },
  });

export default i18n;
