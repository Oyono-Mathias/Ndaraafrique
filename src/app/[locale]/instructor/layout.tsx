'use client';

import { InstructorBottomNav } from '@/components/layout/instructor-bottom-nav';
import { useRole } from '@/context/RoleContext';
import { Loader2 } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useMemo } from 'react';
import { cn } from '@/lib/utils';

/**
 * @fileOverview Layout principal de l'espace instructeur.
 * Gère dynamiquement l'affichage de la Bottom Nav pour ne pas gêner l'édition.
 */
export default function InstructorLayoutAndroid({ children }: { children: React.ReactNode }) {
  const { isUserLoading } = useRole();
  const pathname = usePathname() || '';

  const cleanPath = useMemo(() => {
    return pathname.replace(/^\/(en|fr)/, '') || '/';
  }, [pathname]);

  const showNavigation = useMemo(() => {
    // On cache la barre dans l'éditeur de cours (Create ou Edit) pour maximiser l'espace
    const hideOnPaths = [
        '/instructor/courses/create',
        '/instructor/courses/edit'
    ];
    
    const isHiddenPath = hideOnPaths.some(p => cleanPath.startsWith(p));
    if (isHiddenPath) return false;

    // On affiche la barre sur les pages principales
    const mainInstructorPaths = [
        '/instructor/dashboard',
        '/instructor/courses',
        '/instructor/students',
        '/instructor/revenus',
        '/instructor/annonces',
        '/instructor/avis',
        '/instructor/devoirs',
        '/instructor/questions-reponses',
        '/instructor/quiz',
        '/instructor/ressources',
        '/instructor/certificats',
        '/account'
    ];

    return mainInstructorPaths.some(p => cleanPath.startsWith(p));
  }, [cleanPath]);

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
      {showNavigation && <InstructorBottomNav />}
    </div>
  );
}
