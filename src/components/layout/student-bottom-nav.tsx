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

  // ✅ Suppression robuste du préfixe de langue pour la détection du bouton actif
  const cleanPath = useMemo(() => {
    return pathname.replace(/^\/(en|fr)/, '') || '/';
  }, [pathname]);

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
    <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-[#111827] border-t border-white/5 flex items-stretch justify-around z-50 safe-area-pb shadow-[0_-4px_20px_rgba(0,0,0,0.4)]">
      {navItems.map((item) => {
        // Un bouton est actif s'il correspond exactement ou s'il est le parent de la route actuelle
        const isActive = cleanPath === item.href || (item.href !== '/student/dashboard' && cleanPath.startsWith(item.href));
        
        return (
          <Link 
            key={item.href} 
            href={item.href}
            className="flex flex-col items-center justify-center flex-1 gap-1 relative transition-all active:scale-90"
          >
            <item.icon className={cn(
              "h-6 w-6 transition-colors duration-200",
              isActive ? "text-primary" : "text-slate-500"
            )} />
            <span className={cn(
              "text-[10px] font-bold transition-colors duration-200 uppercase tracking-tighter",
              isActive ? "text-primary" : "text-slate-600"
            )}>
              {item.label}
            </span>
            {item.showBadge && unreadCount > 0 && (
              <span className="absolute top-2.5 right-[30%] h-2 w-2 bg-red-500 rounded-full ring-2 ring-[#111827] animate-pulse" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
