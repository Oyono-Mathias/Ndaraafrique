
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  BookOpen, 
  ClipboardCheck, 
  BadgeEuro,
  User
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';
import { getFirestore, collection, query, where, onSnapshot } from 'firebase/firestore';
import { useRole } from '@/context/RoleContext';

const navItems = [
  { href: '/instructor/dashboard', icon: LayoutDashboard, label: 'Accueil' },
  { href: '/instructor/courses', icon: BookOpen, label: 'Mes cours' },
  { href: '/instructor/devoirs', icon: ClipboardCheck, label: 'Devoirs', showBadge: true },
  { href: '/instructor/revenus', icon: BadgeEuro, label: 'Revenus' },
  { href: '/account', icon: User, label: 'Profil' },
];

export function InstructorBottomNav() {
  const pathname = usePathname();
  const { currentUser } = useRole();
  const db = getFirestore();
  const [pendingActions, setPendingActions] = useState(0);

  useEffect(() => {
    if (!currentUser?.uid) return;
    
    // Écoute des devoirs non notés (action urgente pour le formateur)
    const q = query(
      collection(db, 'devoirs'),
      where('instructorId', '==', currentUser.uid),
      where('status', '==', 'submitted')
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPendingActions(snapshot.size);
    });
    
    return () => unsubscribe();
  }, [currentUser?.uid, db]);

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
            {item.showBadge && pendingActions > 0 && (
              <span className="absolute top-2 right-1/4 h-2 w-2 bg-amber-500 rounded-full ring-2 ring-slate-900 animate-pulse" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
