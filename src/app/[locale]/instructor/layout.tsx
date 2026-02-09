'use client';

import { InstructorBottomNav } from '@/components/layout/instructor-bottom-nav';
import { useRole } from '@/context/RoleContext';
import { Loader2 } from 'lucide-react';

/**
 * @fileOverview Layout principal de l'espace instructeur.
 * Optimisé pour le chargement des chunks et la navigation Android-First.
 */
export default function InstructorLayoutAndroid({ children }: { children: React.ReactNode }) {
  const { isUserLoading } = useRole();

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
        <div className="pb-20">
          {children}
        </div>
      </main>
      <InstructorBottomNav />
    </div>
  );
}
