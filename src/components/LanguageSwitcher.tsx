'use client';

import { useLocale } from 'next-intl';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

/**
 * @fileOverview Composant de changement de langue avec persistance par cookie.
 * ✅ Persistance : NEXT_LOCALE cookie (standard next-intl).
 * ✅ Navigation : Redirection vers l'URL localisée en respectant localePrefix: 'as-needed'.
 */
export function LanguageSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();

  const handleLanguageChange = (newLocale: string) => {
    if (newLocale === locale) return;

    // 1. Sauvegarde dans le cookie pour le middleware next-intl
    // Utilisation de NEXT_LOCALE pour compatibilité native avec next-intl
    document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=31536000; SameSite=Lax`;

    // 2. Calcul du nouveau chemin
    const segments = pathname.split('/');
    const supportedLocales = ['fr', 'en', 'sg'];
    
    // On regarde si l'URL actuelle contient déjà un préfixe de langue
    const currentPrefixInPath = supportedLocales.includes(segments[1]) ? segments[1] : null;
    
    if (currentPrefixInPath) {
      if (newLocale === 'fr') {
        // On retire le préfixe pour la langue par défaut (fr) car localePrefix est 'as-needed'
        segments.splice(1, 1);
      } else {
        // On remplace le préfixe existant par le nouveau
        segments[1] = newLocale;
      }
    } else {
      // Pas de préfixe dans le chemin (on est en 'fr' implicite)
      // On ajoute le préfixe si la nouvelle langue n'est pas 'fr'
      if (newLocale !== 'fr') {
        segments.splice(1, 0, newLocale);
      }
    }

    const newPath = segments.join('/') || '/';
    
    // 3. Navigation forcée pour recharger l'application avec le nouveau contexte
    window.location.href = newPath;
  };

  return (
    <div className="flex items-center gap-1 p-1 bg-slate-900/50 backdrop-blur-md rounded-2xl border border-white/5 w-fit shadow-xl">
      {['fr', 'en', 'sg'].map((lang) => (
        <button
          key={lang}
          onClick={() => handleLanguageChange(lang)}
          className={cn(
            "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95",
            locale === lang 
              ? "bg-primary text-slate-950 shadow-lg shadow-primary/20" 
              : "text-slate-500 hover:text-white"
          )}
        >
          {lang}
        </button>
      ))}
    </div>
  );
}
