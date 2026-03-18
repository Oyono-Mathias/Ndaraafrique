'use client';

/**
 * @fileOverview Bottom Navigation Mobile pour Ndara Afrique.
 * ✅ I18N : Tous les labels sont traduits dynamiquement.
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { 
  LayoutDashboard, 
  BookOpen, 
  GraduationCap, 
  TrendingUp, 
  UserCircle 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMemo } from 'react';

export function BottomNav() {
  const pathname = usePathname() || '';
  const locale = useLocale();
  const t = useTranslations('Nav');

  const cleanPath = useMemo(() => {
    return pathname.replace(/^\/(en|fr)/, '') || '/';
  }, [pathname]);

  const navItems = [
    { 
      label: t('home'), 
      icon: LayoutDashboard, 
      href: `/${locale}/student/dashboard`, 
      path: '/student/dashboard' 
    },
    { 
      label: t('catalogue'), 
      icon: BookOpen, 
      href: `/${locale}/courses`, 
      path: '/courses' 
    },
    { 
      label: t('my_courses'), 
      icon: GraduationCap, 
      href: `/${locale}/student/courses`, 
      path: '/student/courses' 
    },
    { 
      label: t('bourse'), 
      icon: TrendingUp, 
      href: `/${locale}/bourse`, 
      path: '/bourse' 
    },
    { 
      label: t('profile'), 
      icon: UserCircle, 
      href: `/${locale}/student/profile`, 
      path: '/student/profile' 
    },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 h-20 bg-[#0f172a]/95 backdrop-blur-lg border-t border-white/10 flex items-stretch justify-around z-[100] safe-area-pb shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
      {navItems.map((item) => {
        const isActive = cleanPath === item.path || (item.path !== '/student/dashboard' && cleanPath.startsWith(item.path));
        
        return (
          <Link 
            key={item.label} 
            href={item.href}
            className={cn(
              "flex flex-col items-center justify-center flex-1 gap-1.5 transition-all duration-300 active:scale-90",
              isActive ? "text-[#10b981]" : "text-slate-500"
            )}
          >
            <div className="relative">
              <item.icon className={cn(
                "h-6 w-6 transition-transform duration-300",
                isActive && "scale-110"
              )} />
              {isActive && (
                <div className="absolute -inset-2 bg-[#10b981]/10 rounded-full blur-md -z-10 animate-pulse" />
              )}
            </div>
            <span className={cn(
              "text-[8px] font-black tracking-[0.15em] transition-colors duration-300",
              isActive ? "text-[#10b981]" : "text-slate-600"
            )}>
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}