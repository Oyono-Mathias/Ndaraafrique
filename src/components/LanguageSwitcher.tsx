'use client';

import { useLocale } from 'next-intl';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

export function LanguageSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();

  const languages = [
    { id: 'fr', flag: '🇨🇲', label: 'FR' },
    { id: 'en', flag: '🇿🇦', label: 'EN' },
    { id: 'sg', flag: '🇨🇫', label: 'SG' }
  ];

  const handleLanguageChange = (newLocale: string) => {
    if (newLocale === locale) return;
    document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=31536000; SameSite=Lax`;

    const segments = pathname.split('/');
    if (['fr', 'en', 'sg'].includes(segments[1])) {
      segments[1] = newLocale;
    } else {
      segments.splice(1, 0, newLocale);
    }

    const newPath = segments.join('/') || `/${newLocale}`;
    window.location.replace(newPath);
  };

  return (
    <div className="relative flex items-center p-1 bg-slate-950/40 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl">
      {/* La "Pill" de sélection animée */}
      <div 
        className={cn(
          "absolute h-[80%] transition-all duration-300 ease-out bg-primary rounded-xl shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)]",
          locale === 'fr' && "left-1 w-[30%]",
          locale === 'en' && "left-[35%] w-[30%]",
          locale === 'sg' && "left-[69%] w-[30%]"
        )}
      />

      {languages.map((lang) => (
        <button
          key={lang.id}
          onClick={() => handleLanguageChange(lang.id)}
          className={cn(
            "relative z-10 flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl transition-colors duration-200",
            locale === lang.id ? "text-slate-950 font-bold" : "text-slate-400 hover:text-white"
          )}
        >
          <span className="text-lg leading-none">{lang.flag}</span>
          <span className="text-[11px] uppercase tracking-tighter">{lang.label}</span>
        </button>
      ))}
    </div>
  );
}