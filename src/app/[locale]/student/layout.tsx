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

  // ✅ LOGIQUE PROFESSIONNELLE : Détection des pages immersives
  const isImmersive = useMemo(() => {
    return (
      pathname.includes('/courses/') || // Lecteur de cours
      pathname.includes('/quiz/') ||    // Passage de quiz
      pathname.includes('/tutor') ||    // Chat avec MATHIAS
      (pathname.includes('/messages') && searchParams.get('chatId')) // Conversation active
    );
  }, [pathname, searchParams]);

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
        <div className={cn(!isImmersive && "pb-20")}>
          {children}
        </div>
      </main>
      {!isImmersive && <StudentBottomNav />}
    </div>
  );
}
