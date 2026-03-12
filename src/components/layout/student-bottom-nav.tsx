'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutGrid, 
  BookOpen,
  ClipboardCheck,
  Bell,
  User
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMemo } from 'react';
import { useLocale } from 'next-intl';

/**
 * @fileOverview Barre de navigation mobile pour l'étudiant.
 * ✅ RÉSOLU : Design conforme à la capture d'écran (Majuscules + Icônes spécifiques).
 */

export function StudentBottomNav() {
  const pathname = usePathname() || '';
  const locale = useLocale();

  const cleanPath = useMemo(() => {
    return pathname.replace(/^\/(en|fr)/, '') || '/';
  }, [pathname]);

  const navItems = [
    { href: `/${locale}/student/dashboard`, icon: LayoutGrid, label: 'ACCUEIL', path: '/student/dashboard' },
    { href: `/${locale}/student/courses`, icon: BookOpen, label: 'MES COURS', path: '/student/courses' },
    { href: `/${locale}/student/devoirs`, icon: ClipboardCheck, label: 'DEVOIRS', path: '/student/devoirs' },
    { href: `/${locale}/student/notifications`, icon: Bell, label: 'ALERTES', path: '/student/notifications' },
    { href: `/${locale}/student/profile`, icon: User, label: 'PROFIL', path: '/student/profile' },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-[#0f172a] border-t border-white/5 flex items-stretch justify-around z-50 safe-area-pb shadow-[0_-4px_20px_rgba(0,0,0,0.4)]">
      {navItems.map((item) => {
        const isActive = cleanPath === item.path || (item.path !== '/student/dashboard' && cleanPath.startsWith(item.path));
        
        return (
          <Link 
            key={item.href} 
            href={item.href}
            className="flex flex-col items-center justify-center flex-1 gap-1 relative transition-all active:scale-90"
          >
            <item.icon className={cn(
              "h-5 w-5 transition-colors duration-200",
              isActive ? "text-primary" : "text-slate-500"
            )} />
            <span className={cn(
              "text-[9px] font-black transition-colors duration-200 truncate px-1 tracking-widest",
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
