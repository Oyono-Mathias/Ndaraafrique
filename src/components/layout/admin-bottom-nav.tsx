
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

const navItems = [
  { href: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/admin/users', icon: Users, label: 'Utilisateurs' },
  { href: '/admin/courses', icon: BookOpen, label: 'Cours' },
  { href: '/admin/payments', icon: CreditCard, label: 'Paiements' },
  { href: '/admin/support', icon: HelpCircle, label: 'Support' },
];

const NavItem = ({ href, icon: Icon, label }: typeof navItems[0]) => {
  const pathname = usePathname();
  
  const isActive = href === '/admin' ? pathname === href : pathname.startsWith(href);

  return (
    <Link href={href} className="flex flex-col items-center justify-center gap-1 flex-1 p-1 h-full">
      <Icon className={cn(
        'w-6 h-6 transition-colors',
        isActive ? 'text-primary' : 'text-slate-400'
      )} />
      <span className={cn(
        'text-[10px] font-medium transition-colors',
        isActive ? 'text-primary' : 'text-slate-400'
      )}>
        {label}
      </span>
    </Link>
  );
};

export function AdminBottomNav() {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-slate-900 border-t border-slate-800 flex items-stretch justify-around z-40">
      {navItems.map(item => (
        <NavItem key={item.href} {...item} />
      ))}
    </nav>
  );
}
