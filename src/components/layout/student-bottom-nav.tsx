'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  BookOpen, 
  ClipboardCheck, 
  User,
  Bell
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEffect, useState, useMemo } from 'react';
import { getFirestore, collection, query, where, onSnapshot } from 'firebase/firestore';
import { useRole } from '@/context/RoleContext';

const navItems = [
  { href: '/student/dashboard', icon: LayoutDashboard, label: 'Accueil' },
  { href: '/student/courses', icon: BookOpen, label: 'Mes cours' },
  { href: '/student/devoirs', icon: ClipboardCheck, label: 'Devoirs' },
  { href: '/student/notifications', icon: Bell, label: 'Alertes', showBadge: true },
  { href: '/student/profile', icon: User, label: 'Profil' },
];

export function StudentBottomNav() {
  const pathname = usePathname() || '';
  const { user } = useRole();
  const db = getFirestore();
  const [unreadCount, setUnreadCount] = useState(0);

  // ✅ Nettoyage de la locale pour la détection active
  const cleanPath = useMemo(() => pathname.replace(/^\/(en|fr)/, '') || '/', [pathname]);

  useEffect(() => {
    if (!user?.uid) return;
    const q = query(
      collection(db, `users/${user.uid}/notifications`),
      where('read', '==', false)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setUnreadCount(snapshot.size);
    });
    return () => unsubscribe();
  }, [user?.uid, db]);

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-slate-900 border-t border-slate-800 flex items-stretch justify-around z-50 safe-area-pb">
      {navItems.map((item) => {
        const isActive = cleanPath === item.href || (item.href !== '/student/dashboard' && cleanPath.startsWith(item.href));
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
            {item.showBadge && unreadCount > 0 && (
              <span className="absolute top-2 right-1/4 h-2 w-2 bg-red-500 rounded-full ring-2 ring-slate-900 animate-pulse" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
