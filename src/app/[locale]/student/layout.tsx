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

  // Détection des pages immersives où l'on cache la barre de navigation basse
  const isImmersive = useMemo(() => {
    const isTutor = pathname.includes('/tutor');
    const isChatActive = pathname.includes('/messages') && searchParams.get('chatId');
    const isCoursePlayer = pathname.includes('/courses/');
    return isTutor || isChatActive || isCoursePlayer;
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
