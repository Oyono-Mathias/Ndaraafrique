'use client';

import { useRole } from '@/context/RoleContext';
import { Loader2 } from 'lucide-react';
import { Suspense } from 'react';

/**
 * @fileOverview Layout étudiant simplifié. 
 * La navigation est désormais pilotée de manière centralisée par l'AppShell.
 */

function StudentLayoutContent({ children }: { children: React.ReactNode }) {
  const { isUserLoading } = useRole();

  if (isUserLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <main className="flex-1">
        {children}
      </main>
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
