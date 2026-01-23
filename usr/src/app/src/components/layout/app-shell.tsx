'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { usePathname, useRouter } from 'next-intl/navigation';
import { useRole } from '@/context/RoleContext';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { StudentSidebar } from './student-sidebar';
import { InstructorSidebar } from './instructor-sidebar';
import { AdminSidebar } from './admin-sidebar';
import { Button } from '../ui/button';
import { Wrench, Loader2, PanelLeft, Megaphone, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { doc, onSnapshot, getFirestore } from 'firebase/firestore';
import { SplashScreen } from '../splash-screen';
import { Header } from './header';

function MaintenancePage() {
    return (
        <div className="flex flex-col items-center justify-center h-screen bg-background text-center p-4">
            <Wrench className="h-16 w-16 text-primary mb-4" />
            <h1 className="text-3xl font-bold text-foreground">Site en maintenance</h1>
            <p className="text-muted-foreground mt-2">Nous effectuons des mises à jour. Le site sera de retour très prochainement.</p>
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

    if (!isVisible || !announcement) {
        return null;
    }

    const [mainMessage, ...translations] = announcement.split('Sango:');
    const sangoLingala = translations.length > 0 ? `Sango: ${translations.join('Sango:')}` : '';

    return (
        <div className="bg-primary/90 text-primary-foreground p-3 flex items-center justify-center gap-4 text-sm font-medium relative">
            <Megaphone className="h-5 w-5 hidden sm:block flex-shrink-0" />
            <p className="text-center text-balance">
                {mainMessage.trim()}
                {sangoLingala && <span className="hidden md:inline text-primary-foreground/80 ml-2 italic">{sangoLingala}</span>}
            </p>
            <Button variant="ghost" size="icon" onClick={handleDismiss} className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 hover:bg-black/20">
                <X className="h-4 w-4" />
            </Button>
        </div>
    );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { role, isUserLoading, user, currentUser } = useRole();
  const pathname = usePathname();
  const router = useRouter();

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

  const isAuthPage = useMemo(() => pathname.startsWith('/login') || pathname.startsWith('/register') || pathname.startsWith('/forgot-password'), [pathname]);

  const isPublicPage = useMemo(() => {
    const staticPublicPaths = ['/', '/about', '/cgu', '/mentions-legales', '/abonnements', '/search'];
    if (staticPublicPaths.includes(pathname)) return true;

    if (pathname.startsWith('/verify/')) return true;

    if (pathname.startsWith('/instructor/')) {
        const segments = pathname.split('/');
        if (segments.length === 2 && segments[1]) {
            // This handles `/instructor/[id]` which is a public profile
            // It filters out sub-routes like `/instructor/courses` which would have length 3
            return true;
        }
    }
    return false;
  }, [pathname]);

  useEffect(() => {
    if (isUserLoading) return;

    const isAdminPage = pathname.startsWith('/admin');
    const isInstructorPage = pathname.startsWith('/instructor');
    const isStudentPage = pathname.startsWith('/student');

    if (!user) {
        if (!isPublicPage && !isAuthPage) {
            router.push('/login');
        }
        return;
    }

    if (role === 'admin' && !isAdminPage) {
        router.push('/admin');
    } else if (role === 'instructor' && !isInstructorPage && !isStudentPage && !isAdminPage) {
        if (!isPublicPage && !isAuthPage) {
            router.push('/instructor/dashboard');
        }
    } else if (role === 'student' && (isInstructorPage || isAdminPage)) {
        router.push('/student/dashboard');
    }
  }, [user, role, isUserLoading, pathname, router, isPublicPage, isAuthPage]);


  if (siteSettings.maintenanceMode && currentUser?.role !== 'admin') {
    return <MaintenancePage />;
  }

  if (isUserLoading && !isPublicPage && !isAuthPage) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  const handleSidebarLinkClick = () => setIsSheetOpen(false);
  const sidebarProps = { siteName: siteSettings.siteName, logoUrl: siteSettings.logoUrl, onLinkClick: handleSidebarLinkClick };
  const isFullScreenPage = pathname.startsWith('/courses/');
  const isAdminArea = pathname.startsWith('/admin');
  const isRootPath = pathname === '/';
  const mainContentPadding = cn("p-6", isFullScreenPage && "!p-0");

  return (
    <>
      <SplashScreen />
      <div className={cn("min-h-screen w-full bg-slate-900 text-white", !isAdminArea && (isFullScreenPage ? "block" : "md:grid md:grid-cols-[280px_1fr]"))}>
        {!isAdminArea && !isRootPath && !isAuthPage && user && (
          <aside className={cn("hidden h-screen sticky top-0", isFullScreenPage ? "md:hidden" : "md:block")}>
            <div className={cn({ 'hidden': role !== 'student' })}><StudentSidebar {...sidebarProps} /></div>
            <div className={cn({ 'hidden': role !== 'instructor' })}><InstructorSidebar {...sidebarProps} /></div>
          </aside>
        )}
        <div className="flex flex-col flex-1">
          <AnnouncementBanner />
          {(!isAdminArea && !isRootPath && !isAuthPage && user) && (
            <header className={cn("flex h-16 items-center gap-4 border-b border-slate-800 px-4 lg:px-6 sticky top-0 z-30 bg-slate-900/80 backdrop-blur-sm", isFullScreenPage && "md:hidden")}>
              {(!isFullScreenPage && user) && (
                 <div className="md:hidden">
                  <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                      <SheetTrigger asChild>
                          <Button variant="outline" size="icon" className="shrink-0 bg-transparent border-slate-700">
                              <PanelLeft className="h-5 w-5" />
                              <span className="sr-only">Ouvrir le menu</span>
                          </Button>
                      </SheetTrigger>
                      <SheetContent side="left" className="flex flex-col p-0 w-full max-w-[300px] bg-[#111827] border-r-0">
                          <div className={cn({ 'hidden': role !== 'student' })}><StudentSidebar {...sidebarProps} /></div>
                          <div className={cn({ 'hidden': role !== 'instructor' })}><InstructorSidebar {...sidebarProps} /></div>
                      </SheetContent>
                  </Sheet>
                </div>
              )}
              <div className="w-full flex justify-end">
                  <Header />
              </div>
            </header>
          )}
          
          <main className={mainContentPadding}>
              {children}
          </main>
        </div>
      </div>
    </>
  );
}
