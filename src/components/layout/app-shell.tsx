'use client';

/**
 * @fileOverview AppShell Ndara Afrique.
 * Gère le Mode Maintenance, la Bannière d'Annonce et la visibilité des NavBars.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useRole } from '@/context/RoleContext';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { StudentSidebar } from '@/components/layout/student-sidebar';
import { InstructorSidebar } from '@/components/layout/instructor-sidebar';
import { AdminSidebar } from '@/components/layout/admin-sidebar';
import { Button } from '@/components/ui/button';
import { Wrench, PanelLeft, Loader2, Megaphone, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { doc, onSnapshot, getFirestore } from 'firebase/firestore';
import { SplashScreen } from '@/components/SplashScreen';
import { Header } from '@/components/layout/header';
import { OfflineBar } from '@/components/OfflineBar';

function AnnouncementBanner({ message }: { message: string }) {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (message && sessionStorage.getItem('ndara-announcement-dismissed') !== message) {
            setIsVisible(true);
        }
    }, [message]);

    const handleDismiss = () => {
        setIsVisible(false);
        sessionStorage.setItem('ndara-announcement-dismissed', message);
    };

    if (!isVisible || !message) return null;

    return (
        <div className="bg-primary/95 text-primary-foreground p-3 flex items-center justify-center gap-4 text-[11px] font-black uppercase tracking-wider relative z-[100]">
            <Megaphone className="h-4 w-4 hidden sm:block flex-shrink-0" />
            <p className="text-center px-8">{message}</p>
            <Button variant="ghost" size="icon" onClick={handleDismiss} className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 hover:bg-black/20 text-white">
                <X className="h-4 w-4" />
            </Button>
        </div>
    );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { role, loading, user, currentUser } = useRole();
  const router = useRouter();
  const pathname = usePathname() || '';
  const [mounted, setMounted] = useState(false);
  const db = getFirestore();
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const [siteSettings, setSiteSettings] = useState({
      maintenanceMode: false,
      announcementMessage: '',
  });

  useEffect(() => {
    setMounted(true);
    const unsub = onSnapshot(doc(db, 'settings', 'global'), (snap) => {
        if (snap.exists()) {
            const data = snap.data();
            setSiteSettings({ 
                maintenanceMode: data.platform?.maintenanceMode || false,
                announcementMessage: data.platform?.announcementMessage || '',
            });
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
    
    const instructorPrivateRoutes = ['dashboard', 'courses', 'students', 'revenus', 'annonces', 'avis', 'devoirs', 'questions-reponses', 'quiz', 'ressources', 'certificats'];
    const isInstructorPublicProfile = cleanPath.startsWith('/instructor/') && !instructorPrivateRoutes.some(sub => cleanPath.includes(`/instructor/${sub}`));

    const isPublic = publicPaths.includes(cleanPath) || cleanPath.startsWith('/verify/') || isInstructorPublicProfile;

    if (!user) {
      if (!isPublic) router.push('/login');
      return;
    }

    if (cleanPath === '/account' || cleanPath === '/search' || isInstructorPublicProfile) return;

    const isAdminArea = cleanPath.startsWith('/admin');
    const isInstructorArea = cleanPath.startsWith('/instructor');

    if (role === 'admin') return; 
    
    if (role === 'instructor') {
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
            <h1 className="text-2xl font-black text-white uppercase tracking-tight">Maintenance Ndara</h1>
            <p className="text-slate-500 mt-2 font-medium">Nous effectuons des mises à jour techniques. Nous revenons dans quelques instants.</p>
        </div>
      );
  }

  const isAuthPage = ['/login', '/register', '/forgot-password'].includes(cleanPath);
  const isLandingPage = cleanPath === '/';
  
  const instructorPrivateRoutes = ['dashboard', 'courses', 'students', 'revenus', 'annonces', 'avis', 'devoirs', 'questions-reponses', 'quiz', 'ressources', 'certificats'];
  const isInstructorPublicProfile = cleanPath.startsWith('/instructor/') && !instructorPrivateRoutes.some(sub => cleanPath.includes(`/instructor/${sub}`));
  
  const isPublicView = isLandingPage || ['/about', '/abonnements', '/search', '/investir'].includes(cleanPath) || cleanPath.startsWith('/verify/') || isInstructorPublicProfile;
  
  const showNav = user && !isAuthPage && !isPublicView;
  const isFullScreen = cleanPath.startsWith('/student/courses/') && cleanPath.split('/').length > 3;
  
  const handleSidebarLinkClick = () => setIsSheetOpen(false);
  const sidebarProps = { onLinkClick: handleSidebarLinkClick };

  return (
    <>
      <SplashScreen />
      <OfflineBar />
      <div className={cn("min-h-screen w-full bg-slate-950", showNav && !isFullScreen && "md:grid md:grid-cols-[280px_1fr]")}>
        {showNav && !isFullScreen && (
          <aside className="hidden md:block h-screen sticky top-0">
             {role === 'admin' ? <AdminSidebar {...sidebarProps} /> : role === 'instructor' ? <InstructorSidebar {...sidebarProps} /> : <StudentSidebar {...sidebarProps} />}
          </aside>
        )}
        <div className="flex flex-col flex-1">
          {siteSettings.announcementMessage && <AnnouncementBanner message={siteSettings.announcementMessage} />}
          {showNav && !isFullScreen && (
            <header className="flex h-16 items-center justify-between border-b border-white/5 px-4 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-30">
              <div className="md:hidden">
                <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                    <SheetTrigger asChild>
                        <Button variant="outline" size="icon" className="bg-transparent border-slate-800"><PanelLeft className="h-5 w-5 text-white" /></Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="p-0 w-[300px] bg-[#111827] border-none">
                        {role === 'admin' ? <AdminSidebar {...sidebarProps} /> : role === 'instructor' ? <InstructorSidebar {...sidebarProps} /> : <StudentSidebar {...sidebarProps} />}
                    </SheetContent>
                </Sheet>
              </div>
              <div className="ml-auto"><Header /></div>
            </header>
          )}
          <main className={cn(showNav && !isFullScreen ? "p-6" : "p-0")}>{children}</main>
        </div>
      </div>
    </>
  );
}
