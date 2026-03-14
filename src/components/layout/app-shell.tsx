'use client';

/**
 * @fileOverview AppShell Ndara Afrique (Design Qwen Redesign).
 * ✅ Grain Texture Overlay, Android-First Layout, Responsive Structure.
 */

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useRole } from '@/context/RoleContext';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { StudentSidebar } from '@/components/layout/student-sidebar';
import { InstructorSidebar } from '@/components/layout/instructor-sidebar';
import { AdminSidebar } from '@/components/layout/admin-sidebar';
import { StudentBottomNav } from '@/components/layout/student-bottom-nav';
import { Button } from '@/components/ui/button';
import { Wrench, PanelLeft, Loader2, Megaphone, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { doc, onSnapshot, getFirestore } from 'firebase/firestore';
import { SplashScreen } from '@/components/SplashScreen';
import { Header } from '@/components/layout/header';
import { OfflineBar } from '@/components/OfflineBar';
import { useLocale } from 'next-intl';

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

function AppShellInner({ children }: { children: React.ReactNode }) {
  const { role, loading, user, currentUser } = useRole();
  const router = useRouter();
  const locale = useLocale();
  const pathname = usePathname() || '';
  const db = getFirestore();
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const [siteSettings, setSiteSettings] = useState({
      maintenanceMode: false,
      announcementMessage: '',
  });

  useEffect(() => {
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

  const isAuthPage = useMemo(() => ['/login', '/register', '/forgot-password'].includes(cleanPath), [cleanPath]);

  const isPublicPage = useMemo(() => {
    const publicPaths = ['/', '/login', '/register', '/about', '/abonnements', '/search', '/investir', '/cgu', '/mentions-legales', '/leaderboard', '/bourse'];
    if (publicPaths.includes(cleanPath)) return true;
    if (cleanPath.startsWith('/verify/')) return true;
    if (cleanPath.startsWith('/invite/')) return true;
    if (cleanPath.startsWith('/ref/')) return true;
    if (cleanPath.startsWith('/course/')) return true;
    if (cleanPath.startsWith('/bourse/checkout/')) return true; // ✅ Autoriser l'accès au détail de l'actif
    return false;
  }, [cleanPath]);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      if (!isPublicPage && !isAuthPage) router.push(`/${locale}`);
      return;
    }
    if (cleanPath === '/' || cleanPath === '/search' || isPublicPage || cleanPath === '/account') return;

    const isAdminArea = cleanPath.startsWith('/admin');
    const isInstructorArea = cleanPath.startsWith('/instructor');

    if (role === 'student' && (isAdminArea || isInstructorArea)) {
        router.push(`/${locale}/student/dashboard`);
    } else if (role === 'instructor' && isAdminArea) {
        router.push(`/${locale}/instructor/dashboard`);
    }
  }, [user, role, loading, cleanPath, router, isPublicPage, isAuthPage, locale]);

  if (siteSettings.maintenanceMode && currentUser?.role !== 'admin') {
      return (
        <div className="h-screen flex flex-col items-center justify-center bg-[#0f172a] text-center p-6">
            <Wrench className="h-16 w-16 text-primary mb-4" />
            <h1 className="text-2xl font-black text-white uppercase tracking-tight">Maintenance Ndara</h1>
            <p className="text-slate-500 mt-2 font-medium italic">Nous effectuons des mises à jour techniques.</p>
        </div>
      );
  }

  const isFullScreen = cleanPath.startsWith('/courses/') && cleanPath.split('/').filter(Boolean).length >= 2;
  const showNav = user && !isAuthPage && !isPublicPage && cleanPath !== '/';
  
  const handleSidebarLinkClick = () => setIsSheetOpen(false);
  const sidebarProps = { onLinkClick: handleSidebarLinkClick };

  return (
    <div className={cn("min-h-screen w-full bg-[#0f172a] text-white", showNav && !isFullScreen && "md:grid md:grid-cols-[280px_1fr]")}>
        {/* Grain Texture Layer */}
        <div className="grain-overlay" />

        {showNav && !isFullScreen && (
          <aside className="hidden md:block h-screen sticky top-0 border-r border-white/5">
             {role === 'admin' ? <AdminSidebar {...sidebarProps} /> : role === 'instructor' ? <InstructorSidebar {...sidebarProps} /> : <StudentSidebar {...sidebarProps} />}
          </aside>
        )}
        <div className="flex flex-col flex-1 relative z-10">
          {siteSettings.announcementMessage && <AnnouncementBanner message={siteSettings.announcementMessage} />}
          
          {showNav && !isFullScreen && (
            <header className={cn(
                "h-16 flex items-center border-b border-white/5 sticky top-0 z-50 bg-[#0f172a]/95 backdrop-blur-md",
                isFullScreen && "md:hidden"
            )}>
                <Header />
            </header>
          )}

          <main className={cn(
            "flex-1",
            showNav && !isFullScreen ? "pb-20 md:p-6 md:pb-6" : "p-0"
          )}>
            {children}
          </main>

          {role === 'student' && showNav && !isFullScreen && <StudentBottomNav />}
        </div>
      </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <>
      <SplashScreen />
      <OfflineBar />
      <Suspense fallback={
        <div className="h-screen flex items-center justify-center bg-[#0f172a]">
            <Loader2 className="h-8 w-8 animate-spin text-primary"/>
        </div>
      }>
        <AppShellInner>
            {children}
        </AppShellInner>
      </Suspense>
    </>
  );
}
