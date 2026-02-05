
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

const navItems = [
  { href: '/instructor/dashboard', icon: LayoutDashboard, label: 'Accueil' },
  { href: '/instructor/courses', icon: BookOpen, label: 'Mes cours' },
  { href: '/instructor/students', icon: Users, label: 'Étudiants' },
  { href: '/instructor/revenus', icon: BadgeEuro, label: 'Finance' },
  { href: '/account', icon: User, label: 'Profil' },
];

export function InstructorBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-slate-900 border-t border-slate-800 flex items-stretch justify-around z-50 safe-area-pb">
      {navItems.map((item) => {
        const isActive = pathname === item.href || (item.href !== '/instructor/dashboard' && pathname?.startsWith(item.href));
        return (
          <Link 
            key={item.href} 
            href={item.href}
            className="flex flex-col items-center justify-center flex-1 gap-1 relative"
          >
            <item.icon className={cn(
              "h-6 w-6 transition-colors",
              isActive ? "text-primary" : "text-slate-400"
            )} />
            <span className={cn(
              "text-[10px] font-bold transition-colors",
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
