'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode, useMemo, useEffect } from 'react';
import frMessages from '@/messages/fr.json';
import enMessages from '@/messages/en.json';

// Simple dot-notation getter to avoid adding new dependencies like lodash.get
function get(obj: any, path: string, defaultValue: string = ''): string {
  const keys = path.split('.');
  let result = obj;
  for (const key of keys) {
    result = result?.[key];
    if (result === undefined) {
      // Return the path itself as a fallback if not found
      return defaultValue || path;
    }
  }
  return result;
}

const messages: Record<string, any> = {
  fr: frMessages,
  en: enMessages,
};

type Locale = 'fr' | 'en';
type TranslateFunction = (key: string, values?: Record<string, string | number>) => string;

interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: TranslateFunction;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('fr');

  useEffect(() => {
    const savedLocale = localStorage.getItem('ndara-locale') as Locale;
    if (savedLocale && ['fr', 'en'].includes(savedLocale)) {
      setLocaleState(savedLocale);
    }
  }, []);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem('ndara-locale', newLocale);
  }, []);

  const t = useCallback<TranslateFunction>((key, values) => {
    const message = get(messages[locale], key, key);
    if (values) {
      return Object.entries(values).reduce((acc, [k, v]) => {
        return acc.replace(`{${k}}`, String(v));
      }, message);
    }
    return message;
  }, [locale]);
  
  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);

  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (context === undefined) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
}
