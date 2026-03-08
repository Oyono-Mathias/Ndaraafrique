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
import { useEffect, useState, useMemo } from 'react';
import { getFirestore, collection, query, where, onSnapshot } from 'firebase/firestore';
import { useRole } from '@/context/RoleContext';

/**
 * @fileOverview Barre de navigation mobile pour l'étudiant - Style Udemy Exact.
 * ✅ LABELS : Sélection, Rechercher, Mon apprentissage, Liste de souhaits, Compte.
 */

const navItems = [
  { href: '/student/dashboard', icon: Star, label: 'Sélection' },
  { href: '/search', icon: Search, label: 'Rechercher' },
  { href: '/student/courses', icon: PlayCircle, label: 'Apprentissage' },
  { href: '/student/liste-de-souhaits', icon: Heart, label: 'Souhaits' },
  { href: '/student/profile', icon: UserCircle, label: 'Compte' },
];

export function StudentBottomNav() {
  const pathname = usePathname() || '';
  const { user } = useRole();
  const db = getFirestore();

  const cleanPath = useMemo(() => {
    return pathname.replace(/^\/(en|fr)/, '') || '/';
  }, [pathname]);

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-[#1C1D1F] border-t border-white/5 flex items-stretch justify-around z-50 safe-area-pb shadow-[0_-4px_20px_rgba(0,0,0,0.4)]">
      {navItems.map((item) => {
        const isActive = cleanPath === item.href || (item.href !== '/student/dashboard' && cleanPath.startsWith(item.href));
        
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
