'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useRole } from '@/context/RoleContext';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { StudentSidebar } from '@/components/layout/student-sidebar';
import { InstructorSidebar } from '@/components/layout/instructor-sidebar';
import { AdminSidebar } from '@/components/layout/admin-sidebar';
import { Button } from '@/components/ui/button';
import { Wrench, PanelLeft, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { doc, onSnapshot, getFirestore } from 'firebase/firestore';
import { SplashScreen } from '@/components/SplashScreen';
import { Header } from '@/components/layout/header';
import { OfflineBar } from '@/components/OfflineBar';

export function AppShell({ children }: { children: React.ReactNode }) {
  const { role, loading, user, currentUser } = useRole();
  const router = useRouter();
  const pathname = usePathname() || '';
  const [mounted, setMounted] = useState(false);
  const db = getFirestore();
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const [siteSettings, setSiteSettings] = useState({
      maintenanceMode: false,
  });

  useEffect(() => {
    setMounted(true);
    const unsub = onSnapshot(doc(db, 'settings', 'global'), (snap) => {
        if (snap.exists()) {
            setSiteSettings({ maintenanceMode: snap.data().platform?.maintenanceMode || false });
        }
    });
    return () => unsub();
  }, [db]);

  const cleanPath = useMemo(() => {
    return pathname.replace(/^\/(en|fr)/, '') || '/';
  }, [pathname]);

  useEffect(() => {
    if (loading || !mounted) return;

    const publicPaths = ['/', '/login', '/register', '/about', '/abonnements', '/search', '/investir'];
    const isPublic = publicPaths.includes(cleanPath) || cleanPath.startsWith('/verify/');

    if (!user) {
      if (!isPublic) router.push('/login');
      return;
    }

    // Autoriser explicitement la page de compte pour tous les rôles
    if (cleanPath === '/account') return;

    const isAdminArea = cleanPath.startsWith('/admin');
    const isInstructorArea = cleanPath.startsWith('/instructor');

    // --- LOGIQUE DE REDIRECTION BASÉE SUR LE RÔLE ACTIF ---
    if (role === 'admin') {
        // Un admin peut aller n'importe où, mais par défaut on le garde en admin si il est dans la zone admin
        return;
    } else if (role === 'instructor') {
        if (isAdminArea) router.push('/instructor/dashboard');
    } else if (role === 'student') {
        if (isInstructorArea || isAdminArea) router.push('/student/dashboard');
    }
  }, [user, role, loading, cleanPath, router, mounted]);

  if (loading || !mounted) return <div className="h-screen flex items-center justify-center bg-slate-950"><Loader2 className="h-8 w-8 animate-spin text-primary"/></div>;
  
  if (siteSettings.maintenanceMode && currentUser?.role !== 'admin') {
      return (
        <div className="h-screen flex flex-col items-center justify-center bg-slate-950 text-center p-6">
            <Wrench className="h-16 w-16 text-primary mb-4" />
            <h1 className="text-2xl font-black text-white uppercase">Maintenance Ndara</h1>
            <p className="text-slate-500 mt-2">Nous revenons dans quelques instants.</p>
        </div>
      );
  }

  const isAuthPage = ['/login', '/register', '/forgot-password'].includes(cleanPath);
  const isLandingPage = cleanPath === '/';
  const showNav = user && !isAuthPage && !isLandingPage;
  
  const handleSidebarLinkClick = () => setIsSheetOpen(false);
  const sidebarProps = { onLinkClick: handleSidebarLinkClick };

  return (
    <>
      <SplashScreen />
      <OfflineBar />
      <div className={cn("min-h-screen w-full bg-slate-950", showNav && "md:grid md:grid-cols-[280px_1fr]")}>
        {showNav && (
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