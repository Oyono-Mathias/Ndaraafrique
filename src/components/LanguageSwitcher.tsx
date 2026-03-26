'use client';

import { useLocale } from 'next-intl';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

export function LanguageSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();

  const handleLanguageChange = (newLocale: string) => {
    if (newLocale === locale) return;

    // 1. Sauvegarde dans le cookie pour le middleware
    document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=31536000; SameSite=Lax`;

    // 2. Calcul du nouveau chemin (Plus simple avec localePrefix: 'always')
    const segments = pathname.split('/');
    const supportedLocales = ['fr', 'en', 'sg'];
    
    // On remplace simplement le premier segment (la langue) par la nouvelle
    if (supportedLocales.includes(segments[1])) {
      segments[1] = newLocale;
    } else {
      // Cas rare où le préfixe manquerait : on l'ajoute
      segments.splice(1, 0, newLocale);
    }

    const newPath = segments.join('/') || `/${newLocale}`;
    
    // 3. NAVIGATION "REPLACE" : Remplace l'entrée actuelle dans l'historique
    // Au lieu d'ajouter une étape, on écrase l'actuelle avec la nouvelle langue.
    window.location.replace(newPath);
  };

  return (
    <div className="flex items-center gap-1 p-1 bg-slate-900/50 backdrop-blur-md rounded-2xl border border-white/5 w-fit shadow-xl">
      {[
        { id: 'fr', flag: '🇨🇲' },
        { id: 'en', flag: '🇿🇦' },
        { id: 'sg', flag: '🇨🇫' }
      ].map((lang) => (
        <button
          key={lang.id}
          onClick={() => handleLanguageChange(lang.id)}
          className={cn(
            "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 flex items-center gap-2",
            locale === lang.id 
              ? "bg-primary text-slate-950 shadow-lg shadow-primary/20" 
              : "text-slate-500 hover:text-white"
          )}
        >
          <span>{lang.flag}</span>
          <span>{lang.id}</span>
        </button>
      ))}
    </div>
  );
}