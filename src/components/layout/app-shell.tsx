'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useRole } from '@/context/RoleContext';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { StudentSidebar } from '@/components/layout/student-sidebar';
import { InstructorSidebar } from '@/components/layout/instructor-sidebar';
import { AdminSidebar } from '@/components/layout/admin-sidebar';
import { Button } from '@/components/ui/button';
import { Wrench, PanelLeft, Megaphone, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { doc, onSnapshot, getFirestore } from 'firebase/firestore';
import { SplashScreen } from '@/components/SplashScreen';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { Header } from '@/components/layout/header';
import { OfflineBar } from '@/components/OfflineBar';

/**
 * @fileOverview AppShell Ndara Afrique.
 * Gère les redirections de rôles, la maintenance et les bannières.
 * Correction : Permet l'accès à /account pour tous les rôles et fluidifie le changement de mode.
 */

export function AppShell({ children }: { children: React.ReactNode }) {
  const { role, loading, user, currentUser } = useRole();
  const router = useRouter();
  const pathname = usePathname() || '';
  const searchParams = useSearchParams();
  const [mounted, setMounted] = useState(false);
  const db = getFirestore();
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const [siteSettings, setSiteSettings] = useState({
      maintenanceMode: false,
      announcementMessage: ''
  });

  useEffect(() => {
    setMounted(true);
    const unsub = onSnapshot(doc(db, 'settings', 'global'), (snap) => {
        if (snap.exists()) {
            const data = snap.data();
            setSiteSettings({
                maintenanceMode: data.platform?.maintenanceMode || false,
                announcementMessage: data.platform?.announcementMessage || ''
            });
        }
    });
    return () => unsub();
  }, [db]);

  const cleanPath = useMemo(() => pathname.replace(/^\/(en|fr)/, '') || '/', [pathname]);

  // REDIRECTIONS INTELLIGENTES
  useEffect(() => {
    if (loading || !mounted) return;

    if (!user) {
      const publicPaths = ['/', '/login', '/register', '/about', '/abonnements', '/search', '/investir'];
      if (!publicPaths.includes(cleanPath) && !cleanPath.startsWith('/verify/')) {
        router.push('/login');
      }
      return;
    }

    // ACCÈS UNIVERSEL À /account
    if (cleanPath === '/account') return;

    // Redirection automatique vers le bon dashboard si on est sur la racine ou login
    if (cleanPath === '/' || cleanPath === '/login' || cleanPath === '/register') {
        if (role === 'admin') router.push('/admin');
        else if (role === 'instructor') router.push('/instructor/dashboard');
        else router.push('/student/dashboard');
        return;
    }

    // Sécurité de zone
    const isAdminPath = cleanPath.startsWith('/admin');
    const isInstructorPath = cleanPath.startsWith('/instructor');

    if (role === 'admin') {
        // L'admin peut aller partout
        return;
    }

    if (role === 'instructor') {
        // L'instructeur ne peut pas aller en admin
        if (isAdminPath) router.push('/instructor/dashboard');
        return;
    }

    if (role === 'student') {
        // L'étudiant ne peut aller ni en admin, ni en instructeur
        if (isAdminPath || isInstructorPath) router.push('/student/dashboard');
        return;
    }
  }, [user, role, loading, cleanPath, router, mounted]);

  if (loading || !mounted) return <LoadingScreen />;
  
  if (siteSettings.maintenanceMode && currentUser?.role !== 'admin') {
      return (
        <div className="h-screen flex flex-col items-center justify-center bg-slate-950 text-center p-6">
            <Wrench className="h-16 w-16 text-primary animate-pulse mb-4" />
            <h1 className="text-2xl font-black text-white uppercase">Maintenance Ndara</h1>
            <p className="text-slate-500 mt-2">Nous revenons dans quelques instants.</p>
        </div>
      );
  }

  const showNav = user && cleanPath !== '/' && !['/login', '/register', '/forgot-password'].includes(cleanPath);
  const handleSidebarLinkClick = () => setIsSheetOpen(false);
  const sidebarProps = { onLinkClick: handleSidebarLinkClick };

  return (
    <>
      <SplashScreen />
      <OfflineBar />
      <div className={cn("min-h-screen w-full bg-slate-950", showNav && !cleanPath.startsWith('/admin') && "md:grid md:grid-cols-[280px_1fr]")}>
        {showNav && !cleanPath.startsWith('/admin') && (
          <aside className="hidden md:block h-screen sticky top-0">
             {role === 'admin' ? <AdminSidebar {...sidebarProps} /> : role === 'instructor' ? <InstructorSidebar {...sidebarProps} /> : <StudentSidebar {...sidebarProps} />}
          </aside>
        )}
        <div className="flex flex-col flex-1">
          {showNav && (
            <header className="flex h-16 items-center justify-between border-b border-slate-800 px-4 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-30">
              <div className="md:hidden">
                <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                    <SheetTrigger asChild>
                        <Button variant="outline" size="icon" className="bg-transparent border-slate-700"><PanelLeft className="h-5 w-5" /></Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="p-0 w-[300px] bg-[#111827] border-none">
                        {role === 'admin' ? <AdminSidebar {...sidebarProps} /> : role === 'instructor' ? <InstructorSidebar {...sidebarProps} /> : <StudentSidebar {...sidebarProps} />}
                    </SheetContent>
                </Sheet>
              </div>
              <div className="ml-auto"><Header /></div>
            </header>
          )}
          <main className={cn(showNav ? "p-6" : "p-0")}>{children}</main>
        </div>
      </div>
    </>
  );
}
