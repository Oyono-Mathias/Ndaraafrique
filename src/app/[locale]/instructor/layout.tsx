'use client';

import { useRole } from '@/context/RoleContext';
import { Loader2 } from 'lucide-react';

/**
 * @fileOverview Layout instructeur purifié.
 * ✅ RÉSOLU : Navigation gérée par l'AppShell.
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
    <div className="flex flex-col min-h-screen">
        {children}
    </div>
  );
}
