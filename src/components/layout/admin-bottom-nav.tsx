'use client';

/**
 * @fileOverview Barre de navigation mobile pour l'Administrateur.
 * ✅ DESIGN : Fintech Elite avec labels MAJUSCULES et lueurs actives.
 * 5 Onglets : Dashboard, Utilisateurs, Cours, Paiements, Support.
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  BookOpen,
  CreditCard,
  HelpCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import React, { useMemo } from 'react';
import { useLocale } from 'next-intl';

export function AdminBottomNav() {
  const pathname = usePathname() || '';
  const locale = useLocale();

  const cleanPath = useMemo(() => {
    return pathname.replace(/^\/(en|fr)/, '') || '/';
  }, [pathname]);

  const navItems = [
    { href: `/${locale}/admin`, icon: LayoutDashboard, label: 'ACCUEIL', path: '/admin' },
    { href: `/${locale}/admin/users`, icon: Users, label: 'MEMBRES', path: '/admin/users' },
    { href: `/${locale}/admin/courses`, icon: BookOpen, label: 'COURS', path: '/admin/courses' },
    { href: `/${locale}/admin/payments`, icon: CreditCard, label: 'FINANCES', path: '/admin/payments' },
    { href: `/${locale}/admin/support`, icon: HelpCircle, label: 'SUPPORT', path: '/admin/support' },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 h-20 bg-[#0f172a]/95 backdrop-blur-lg border-t border-white/10 flex items-stretch justify-around z-[100] safe-area-pb shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
      {navItems.map((item) => {
        const isActive = cleanPath === item.path || (item.path !== '/admin' && cleanPath.startsWith(item.path));
        
        return (
          <Link 
            key={item.label} 
            href={item.href}
            className={cn(
              "flex flex-col items-center justify-center flex-1 gap-1.5 transition-all duration-300 active:scale-90",
              isActive ? "text-primary nav-active-glow" : "text-slate-500"
            )}
          >
            <div className="relative">
              <item.icon className={cn(
                "h-6 w-6 transition-transform duration-300",
                isActive && "scale-110"
              )} />
              {isActive && (
                <div className="absolute -inset-2 bg-primary/10 rounded-full blur-md -z-10 animate-pulse" />
              )}
            </div>
            <span className={cn(
              "text-[8px] font-black tracking-[0.15em] transition-colors duration-300",
              isActive ? "text-primary" : "text-slate-600"
            )}>
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
