'use client';

import { StudentBottomNav } from '@/components/layout/student-bottom-nav';
import { useRole } from '@/context/RoleContext';
import { Loader2 } from 'lucide-react';
import { usePathname, useSearchParams } from 'next/navigation';
import { useMemo, Suspense } from 'react';
import { cn } from '@/lib/utils';

/**
 * @fileOverview Layout principal pour l'espace étudiant.
 * Gère dynamiquement l'affichage de la navigation pour une expérience immersive.
 */

function StudentLayoutContent({ children }: { children: React.ReactNode }) {
  const { isUserLoading } = useRole();
  const pathname = usePathname() || '';
  const searchParams = useSearchParams();

  // On nettoie le chemin du préfixe de langue pour la comparaison
  const cleanPath = useMemo(() => {
    return pathname.replace(/^\/(en|fr)/, '') || '/';
  }, [pathname]);

  const showNavigation = useMemo(() => {
    // 1. MASQUAGE CRITIQUE : Si on est dans un chat actif (chatId présent), on cache la barre
    if (cleanPath === '/student/messages' && searchParams.get('chatId')) return false;

    // 2. MASQUAGE CRITIQUE : Si on est dans le lecteur de cours (Full Screen), on cache la barre
    // Le chemin est /student/courses/[courseId]
    const pathSegments = cleanPath.split('/').filter(Boolean);
    if (pathSegments[0] === 'student' && pathSegments[1] === 'courses' && pathSegments.length > 2) {
        return false; 
    }

    // 3. Pages où la barre DOIT être affichée (Onglets principaux)
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

export default function StudentLayoutAndroid({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={
      <div className="flex h-screen w-full items-center justify-center bg-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <StudentLayoutContent>
        {children}
      </StudentLayoutContent>
    </Suspense>
  );
}
