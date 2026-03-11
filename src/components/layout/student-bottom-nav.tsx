'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Star, 
  Search,
  PlayCircle,
  Heart,
  UserCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMemo } from 'react';
import { useLocale } from 'next-intl';

/**
 * @fileOverview Barre de navigation mobile pour l'étudiant.
 * ✅ RÉSOLU : Liens avec préfixe de locale pour éviter les bugs de routage.
 */

export function StudentBottomNav() {
  const pathname = usePathname() || '';
  const locale = useLocale();

  const cleanPath = useMemo(() => {
    return pathname.replace(/^\/(en|fr)/, '') || '/';
  }, [pathname]);

  const navItems = [
    { href: `/${locale}/student/dashboard`, icon: Star, label: 'Sélection', path: '/student/dashboard' },
    { href: `/${locale}/search`, icon: Search, label: 'Rechercher', path: '/search' },
    { href: `/${locale}/student/courses`, icon: PlayCircle, label: 'Apprentissage', path: '/student/courses' },
    { href: `/${locale}/student/wishlist`, icon: Heart, label: 'Favoris', path: '/student/wishlist' },
    { href: `/${locale}/student/profile`, icon: UserCircle, label: 'Compte', path: '/student/profile' },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-[#1C1D1F] border-t border-white/5 flex items-stretch justify-around z-50 safe-area-pb shadow-[0_-4px_20px_rgba(0,0,0,0.4)]">
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
              isActive ? "text-white" : "text-slate-500"
            )} />
            <span className={cn(
              "text-[9px] font-medium transition-colors duration-200 truncate px-1",
              isActive ? "text-white" : "text-slate-500"
            )}>
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
