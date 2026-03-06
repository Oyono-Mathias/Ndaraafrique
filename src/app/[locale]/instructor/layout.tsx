'use client';

import { InstructorBottomNav } from '@/components/layout/instructor-bottom-nav';
import { useRole } from '@/context/RoleContext';
import { Loader2 } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useMemo } from 'react';
import { cn } from '@/lib/utils';

/**
 * @fileOverview Layout principal de l'espace instructeur.
 * ✅ RÉSOLU : Support du mode Clair/Sombre (bg-background).
 */
export default function InstructorLayoutAndroid({ children }: { children: React.ReactNode }) {
  const { isUserLoading } = useRole();
  const pathname = usePathname() || '';

  const cleanPath = useMemo(() => {
    return pathname.replace(/^\/(en|fr)/, '') || '/';
  }, [pathname]);

  const showNavigation = useMemo(() => {
    const hideOnPaths = [
        '/instructor/courses/create',
        '/instructor/courses/edit'
    ];
    
    const isHiddenPath = hideOnPaths.some(p => cleanPath.startsWith(p));
    if (isHiddenPath) return false;

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
      {showNavigation && <InstructorBottomNav />}
    </div>
  );
}
