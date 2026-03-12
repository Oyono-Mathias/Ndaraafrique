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
 * @fileOverview Barre de navigation mobile pour l'étudiant (Design Qwen Redesign).
 * ✅ Labels MAJUSCULES, typographie grasse, effets de lueur actifs.
 */

export function StudentBottomNav() {
  const pathname = usePathname() || '';
  const locale = useLocale();

  const cleanPath = useMemo(() => {
    return pathname.replace(/^\/(en|fr)/, '') || '/';
  }, [pathname]);

  const navItems = [
    { href: `/${locale}/student/dashboard`, icon: LayoutGrid, label: 'ACCUEIL', path: '/student/dashboard' },
    { href: `/${locale}/student/courses`, icon: BookOpen, label: 'COURS', path: '/student/courses' },
    { href: `/${locale}/student/devoirs`, icon: ClipboardCheck, label: 'DEVOIRS', path: '/student/devoirs' },
    { href: `/${locale}/student/notifications`, icon: Bell, label: 'ALERTES', path: '/student/notifications', hasBadge: true },
    { href: `/${locale}/student/profile`, icon: User, label: 'PROFIL', path: '/student/profile' },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 h-20 bg-[#0f172a]/95 backdrop-blur-lg border-t border-white/5 flex items-stretch justify-around z-50 safe-area-pb shadow-[0_-4px_30px_rgba(0,0,0,0.5)]">
      {navItems.map((item) => {
        const isActive = cleanPath === item.path || (item.path !== '/student/dashboard' && cleanPath.startsWith(item.path));
        
        return (
          <Link 
            key={item.href} 
            href={item.href}
            className={cn(
              "flex flex-col items-center justify-center flex-1 gap-1 relative transition-all active:scale-90",
              isActive ? "text-[#10b981] nav-active-glow" : "text-gray-500"
            )}
          >
            <div className="relative">
              <item.icon className={cn(
                "h-6 w-6 transition-all duration-300",
                isActive ? "transform -translate-y-0.5" : ""
              )} />
              {item.hasBadge && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full border-2 border-[#0f172a]"></span>
              )}
            </div>
            <span className={cn(
              "text-[9px] font-black tracking-widest px-1 mt-0.5",
              isActive ? "text-[#10b981]" : "text-gray-500"
            )}>
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}