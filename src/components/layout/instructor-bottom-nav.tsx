'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  BookOpen, 
  Users, 
  BadgeEuro,
  User
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMemo } from 'react';
import { useLocale } from 'next-intl';

/**
 * @fileOverview Barre de navigation mobile pour l'instructeur.
 * ✅ RÉSOLU : Ajout du préfixe locale pour la navigation.
 */

export function InstructorBottomNav() {
  const pathname = usePathname() || '';
  const locale = useLocale();

  const cleanPath = useMemo(() => {
    return pathname.replace(/^\/(en|fr)/, '') || '/';
  }, [pathname]);

  const navItems = [
    { href: `/${locale}/instructor/dashboard`, icon: LayoutDashboard, label: 'Accueil', path: '/instructor/dashboard' },
    { href: `/${locale}/instructor/courses`, icon: BookOpen, label: 'Mes cours', path: '/instructor/courses' },
    { href: `/${locale}/instructor/students`, icon: Users, label: 'Étudiants', path: '/instructor/students' },
    { href: `/${locale}/instructor/revenus`, icon: BadgeEuro, label: 'Finance', path: '/instructor/revenus' },
    { href: `/${locale}/account`, icon: User, label: 'Profil', path: '/account' },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-slate-900 border-t border-slate-800 flex items-stretch justify-around z-50 safe-area-pb">
      {navItems.map((item) => {
        const isActive = cleanPath === item.path || (item.path !== '/instructor/dashboard' && cleanPath.startsWith(item.path));
        return (
          <Link 
            key={item.href} 
            href={item.href}
            className="flex flex-col items-center justify-center flex-1 gap-1 relative transition-all active:scale-90"
          >
            <item.icon className={cn(
              "h-5 w-5 transition-colors duration-200",
              isActive ? "text-primary" : "text-slate-400"
            )} />
            <span className={cn(
              "text-[9px] font-bold transition-colors duration-200",
              isActive ? "text-primary" : "text-slate-500"
            )}>
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
