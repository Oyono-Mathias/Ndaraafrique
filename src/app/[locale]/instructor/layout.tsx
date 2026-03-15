'use client';

import { useRole } from '@/context/RoleContext';
import { Loader2 } from 'lucide-react';

/**
 * @fileOverview Layout instructeur simplifié.
 * La navigation est centralisée dans l'AppShell pour plus de cohérence.
 */
export default function InstructorLayoutAndroid({ children }: { children: React.ReactNode }) {
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
