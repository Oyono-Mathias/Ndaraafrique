'use client';

import { StudentBottomNav } from '@/components/layout/student-bottom-nav';
import { useRole } from '@/context/RoleContext';
import { Loader2 } from 'lucide-react';
import { usePathname, useSearchParams } from 'next/navigation';
import { useMemo, Suspense } from 'react';
import { cn } from '@/lib/utils';

/**
 * @fileOverview Layout principal pour l'espace étudiant.
 * ✅ RÉSOLU : Support du mode Clair/Sombre (bg-background).
 */

function StudentLayoutContent({ children }: { children: React.ReactNode }) {
  const { isUserLoading } = useRole();
  const pathname = usePathname() || '';
  const searchParams = useSearchParams();

  const cleanPath = useMemo(() => {
    return pathname.replace(/^\/(en|fr)/, '') || '/';
  }, [pathname]);

  const showNavigation = useMemo(() => {
    if (cleanPath === '/student/messages' && searchParams.get('chatId')) return false;

    const pathSegments = cleanPath.split('/').filter(Boolean);
    if (pathSegments[0] === 'student' && pathSegments[1] === 'courses' && pathSegments.length > 2) {
        return false; 
    }

    const mainTabs = [
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

    return mainTabs.some(p => cleanPath === p);
  }, [cleanPath, searchParams]);

  if (isUserLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <main className="flex-1 overflow-y-auto">
        <div className={cn(showNavigation && "pb-20")}>
          {children}
        </div>
      </main>
      {showNavigation && <StudentBottomNav />}
    </div>
  );
}

export default function StudentLayoutAndroid({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <StudentLayoutContent>
        {children}
      </StudentLayoutContent>
    </Suspense>
  );
}
