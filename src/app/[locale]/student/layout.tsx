'use client';

import { StudentBottomNav } from '@/components/layout/student-bottom-nav';
import { useRole } from '@/context/RoleContext';
import { Loader2 } from 'lucide-react';
import { usePathname, useSearchParams } from 'next/navigation';
import { useMemo } from 'react';
import { cn } from '@/lib/utils';

export default function StudentLayoutAndroid({ children }: { children: React.ReactNode }) {
  const { isUserLoading } = useRole();
  const pathname = usePathname() || '';
  const searchParams = useSearchParams();

  // ✅ Correction : On nettoie le chemin du préfixe de langue pour la comparaison
  const cleanPath = useMemo(() => pathname.replace(/^\/(en|fr)/, '') || '/', [pathname]);

  const showNavigation = useMemo(() => {
    const globalNavPaths = [
      '/student/dashboard',
      '/search',
      '/student/courses',
      '/student/notifications',
      '/student/profile',
      '/account',
      '/student/devoirs',
      '/student/results',
      '/student/mes-certificats',
      '/student/annuaire',
      '/student/messages',
      '/student/paiements',
      '/student/liste-de-souhaits'
    ];

    const isMessageList = cleanPath === '/student/messages' && !searchParams.get('chatId');
    const isGlobalPage = globalNavPaths.some(p => cleanPath === p);

    return isGlobalPage || isMessageList;
  }, [cleanPath, searchParams]);

  if (isUserLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <main className="flex-1 overflow-y-auto">
        <div className={cn(showNavigation && "pb-20")}>
          {children}
        </div>
      </main>
      {showNavigation && <StudentBottomNav />}
    </div>
  );
}
