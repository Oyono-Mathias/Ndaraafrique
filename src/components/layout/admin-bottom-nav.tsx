'use client';

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

/**
 * @fileOverview Barre de navigation mobile pour l'administrateur.
 * ✅ RÉSOLU : Ajout du préfixe locale pour la navigation.
 */

export function AdminBottomNav() {
  const pathname = usePathname() || '';
  const locale = useLocale();

  const cleanPath = useMemo(() => {
    return pathname.replace(/^\/(en|fr)/, '') || '/';
  }, [pathname]);

  const navItems = [
    { href: `/${locale}/admin`, icon: LayoutDashboard, label: 'Dashboard', path: '/admin' },
    { href: `/${locale}/admin/users`, icon: Users, label: 'Utilisateurs', path: '/admin/users' },
    { href: `/${locale}/admin/courses`, icon: BookOpen, label: 'Cours', path: '/admin/courses' },
    { href: `/${locale}/admin/payments`, icon: CreditCard, label: 'Paiements', path: '/admin/payments' },
    { href: `/${locale}/admin/support`, icon: HelpCircle, label: 'Support', path: '/admin/support' },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-slate-900 border-t border-slate-800 flex items-stretch justify-around z-40 safe-area-pb">
      {navItems.map(item => {
        const isActive = cleanPath === item.path || (item.path !== '/admin' && cleanPath.startsWith(item.path));
        return (
          <Link 
            key={item.href}
            href={item.href} 
            className="flex flex-col items-center justify-center gap-1 flex-1 p-1 h-full transition-all active:scale-90"
          >
            <item.icon className={cn(
              'w-5 h-5 transition-colors duration-200',
              isActive ? 'text-primary' : 'text-slate-400'
            )} />
            <span className={cn(
              'text-[9px] font-medium transition-colors duration-200',
              isActive ? 'text-primary' : 'text-slate-400'
            )}>
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
