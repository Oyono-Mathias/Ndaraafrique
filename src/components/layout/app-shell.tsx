'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useRole } from '@/context/RoleContext';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { StudentSidebar } from '@/components/layout/student-sidebar';
import { InstructorSidebar } from '@/components/layout/instructor-sidebar';
import { AdminSidebar } from '@/components/layout/admin-sidebar';
import { Button } from '@/components/ui/button';
import { Wrench, Loader2, PanelLeft, Megaphone, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { doc, onSnapshot, getFirestore } from 'firebase/firestore';
import { SplashScreen } from '@/components/SplashScreen';
import { Header } from '@/components/layout/header';
import { OfflineBar } from '@/components/OfflineBar';

function MaintenancePage() {
    return (
        <div className="flex flex-col items-center justify-center h-screen bg-slate-950 text-center p-4">
            <div className="p-6 bg-slate-900 rounded-full mb-6">
                <Wrench className="h-16 w-16 text-primary animate-pulse" />
            </div>
            <h1 className="text-3xl font-bold text-white uppercase tracking-tighter">Maintenance en cours</h1>
            <p className="text-slate-400 mt-2 max-w-xs mx-auto">Nous peaufinons Ndara Afrique pour vous. Revenez dans quelques instants.</p>
        </div>
    );
}

function AnnouncementBanner() {
    const [isVisible, setIsVisible] = useState(false);
    const [announcement, setAnnouncement] = useState('');
    const db = getFirestore();

    useEffect(() => {
        const settingsRef = doc(db, 'settings', 'global');
        const unsubscribe = onSnapshot(settingsRef, (docSnap) => {
            if (docSnap.exists()) {
                const message = docSnap.data().platform?.announcementMessage || '';
                setAnnouncement(message);
                if (message && sessionStorage.getItem('ndara-announcement-dismissed') !== message) {
                    setIsVisible(true);
                } else {
                    setIsVisible(false);
                }
            }
        });
        return () => unsubscribe();
    }, [db]);

    const handleDismiss = () => {
        setIsVisible(false);
        sessionStorage.setItem('ndara-announcement-dismissed', announcement);
    };

    if (!isVisible || !announcement) return null;

    const [mainMessage, ...translations] = announcement.split('Sango:');
    const sangoLingala = translations.length > 0 ? `Sango: ${translations.join('Sango:')}` : '';

    return (
        <div className="bg-primary text-primary-foreground p-2.5 flex items-center justify-center gap-4 text-[11px] font-black uppercase tracking-widest relative z-[60]">
            <Megaphone className="h-4 w-4 hidden sm:block flex-shrink-0" />
            <p className="text-center text-balance leading-tight">
                {mainMessage.trim()}
                {sangoLingala && <span className="hidden md:inline opacity-70 ml-2 font-bold">{sangoLingala}</span>}
            </p>
            <Button variant="ghost" size="icon" onClick={handleDismiss} className="h-6 w-6 hover:bg-black/20 shrink-0">
                <X className="h-3 w-3" />
            </Button>
        </div>
    );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { role, isUserLoading, user, currentUser } = useRole();
  const router = useRouter();
  const pathname = usePathname() || '';
  const searchParams = useSearchParams();
  
  const [siteSettings, setSiteSettings] = useState({
      siteName: 'Ndara Afrique',
      logoUrl: '/icon.svg',
      maintenanceMode: false,
      allowInstructorSignup: true,
      announcementMessage: ''
    });
  const db = getFirestore();
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  useEffect(() => {
    const settingsRef = doc(db, 'settings', 'global');
    const unsubscribe = onSnapshot(settingsRef, (docSnap) => {
        if (docSnap.exists()) {
            const settingsData = docSnap.data();
            setSiteSettings({
                siteName: settingsData.general?.siteName || 'Ndara Afrique',
                logoUrl: settingsData.general?.logoUrl || '/icon.svg',
                maintenanceMode: settingsData.platform?.maintenanceMode || false,
                allowInstructorSignup: settingsData.platform?.allowInstructorSignup ?? true,
                announcementMessage: settingsData.platform?.announcementMessage || ''
            });
        }
    });
    return () => unsubscribe();
  }, [db]);

  const { isAuthPage, isPublicPage, isImmersive } = useMemo(() => {
    const authPaths = ['/login', '/register', '/forgot-password'];
    const staticPublicPaths = ['/', '/about', '/cgu', '/mentions-legales', '/abonnements', '/search', '/offline'];
    
    const isAuth = authPaths.some(p => pathname.endsWith(p));
    let isPublic = staticPublicPaths.some(p => pathname.endsWith(p)) || isAuth;

    // ✅ LOGIQUE PROFESSIONNELLE : Détection de l'immersion pour cacher aussi la barre latérale
    const isImmersiveMode = (
        pathname.includes('/courses/') || 
        pathname.includes('/quiz/') || 
        pathname.includes('/tutor') || 
        (pathname.includes('/messages') && searchParams.get('chatId'))
    );

    if (!isPublic) {
        if (pathname.startsWith('/verify/')) isPublic = true;
    }
    
    return { isAuthPage: isAuth, isPublicPage: isPublic, isImmersive: isImmersiveMode };
  }, [pathname, searchParams]);

  useEffect(() => {
    if (isUserLoading) return;

    if (!user) {
      if (!isPublicPage && !isAuthPage) {
        router.push('/login');
      }
      return;
    }

    const isAdminArea = pathname.startsWith('/admin');
    const isInstructorArea = pathname.startsWith('/instructor');

    if (role === 'admin' && !isAdminArea) {
      router.push('/admin');
    } else if (role === 'instructor' && isAdminArea) {
      router.push('/instructor/dashboard');
    } else if (role === 'student' && (isInstructorArea || isAdminArea) && !isPublicPage) {
      router.push('/student/dashboard');
    }

  }, [user, role, isUserLoading, pathname, router, isPublicPage, isAuthPage]);


  if (siteSettings.maintenanceMode && currentUser?.role !== 'admin') {
    return <MaintenancePage />;
  }

  if (isUserLoading && !isPublicPage && !isAuthPage) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  const handleSidebarLinkClick = () => setIsSheetOpen(false);
  const sidebarProps = { siteName: siteSettings.siteName, logoUrl: siteSettings.logoUrl, onLinkClick: handleSidebarLinkClick };
  
  const isAdminArea = pathname.startsWith('/admin');
  const isRootPath = pathname === '/';
  
  return (
    <>
      <SplashScreen />
      <OfflineBar />
      <div className={cn(
        "min-h-screen w-full bg-slate-950 text-white", 
        isAdminArea ? "admin-grid-layout" : (!isImmersive && !isRootPath) && "md:grid md:grid-cols-[280px_1fr]"
      )}>
        {!isRootPath && !isAuthPage && user && !isImmersive && (
          <aside className={cn("hidden h-screen sticky top-0", isAdminArea ? "md:hidden" : "md:block")}>
             {role === 'admin' ? (
              <AdminSidebar {...sidebarProps} />
            ) : role === 'instructor' ? (
              <InstructorSidebar {...sidebarProps} />
            ) : (
              <StudentSidebar {...sidebarProps} />
            )}
          </aside>
        )}
        <div className="flex flex-col flex-1 min-h-screen">
          <AnnouncementBanner />
          {!isRootPath && !isAuthPage && user && !isImmersive && (
            <header className={cn("flex h-16 items-center gap-4 border-b border-slate-800 px-4 lg:px-6 sticky top-0 z-30 bg-slate-900/80 backdrop-blur-sm")}>
              {!isAdminArea && user && (
                 <div className="md:hidden">
                  <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                      <SheetTrigger asChild>
                          <Button variant="outline" size="icon" className="shrink-0 bg-transparent border-slate-700">
                              <PanelLeft className="h-5 w-5" />
                              <span className="sr-only">Ouvrir le menu</span>
                          </Button>
                      </SheetTrigger>
                      <SheetContent side="left" className="flex flex-col p-0 w-full max-w-[300px] bg-[#111827] border-r-0">
                          {role === 'admin' ? <AdminSidebar {...sidebarProps} /> : role === 'instructor' ? <InstructorSidebar {...sidebarProps} /> : <StudentSidebar {...sidebarProps} />}
                      </SheetContent>
                  </Sheet>
                </div>
              )}
              <div className="w-full flex justify-end">
                  <Header />
              </div>
            </header>
          )}
          
          <main className={cn("p-6", (isImmersive || isRootPath) && "!p-0")}>
              {children}
          </main>
        </div>
      </div>
    </>
  );
}
