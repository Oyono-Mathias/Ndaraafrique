'use client';

/**
 * @fileOverview AppShell Ndara Afrique - Cerveau de navigation global.
 * ✅ VISIBILITÉ : Navigation affichée UNIQUEMENT dans les zones Dashboard/Privées.
 * ✅ RÉSOLU : Distinction claire entre BottomNav Admin, Formateur et Étudiant.
 */

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useRole } from '@/context/RoleContext';
import { StudentSidebar } from '@/components/layout/student-sidebar';
import { InstructorSidebar } from '@/components/layout/instructor-sidebar';
import { AdminSidebar } from '@/components/layout/admin-sidebar';
import { BottomNav } from '@/components/navigation/BottomNav';
import { InstructorBottomNav } from '@/components/layout/instructor-bottom-nav';
import { AdminBottomNav } from '@/components/layout/admin-bottom-nav';
import { Button } from '@/components/ui/button';
import { Wrench, Loader2, Megaphone, X } from 'lucide-react';
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
    return pathname.replace(/^\/(en|fr|sg)/, '') || '/';
  }, [pathname]);

  // BottomNav Étudiant
  const showStudentBottomNav = useMemo(() => {
      const allowedPaths = ['/student/dashboard', '/courses', '/student/courses', '/bourse', '/student/profile', '/search', '/student/annuaire', '/student/wishlist', '/student/results', '/student/mes-certificats', '/student/devoirs'];
      const isExcluded = ['/', '/login', '/register', '/student/messages'].includes(cleanPath) 
        || cleanPath.includes('/checkout/') 
        || (cleanPath.startsWith('/courses/') && cleanPath.split('/').length > 2); 
        
      return role === 'student' && allowedPaths.some(path => cleanPath === path || cleanPath.startsWith(path)) && !isExcluded;
  }, [cleanPath, role]);

  // BottomNav Admin
  const showAdminBottomNav = useMemo(() => {
      return role === 'admin' && cleanPath.startsWith('/admin');
  }, [cleanPath, role]);

  // BottomNav Formateur
  const showInstructorBottomNav = useMemo(() => {
      return role === 'instructor' && cleanPath.startsWith('/instructor');
  }, [cleanPath, role]);

  const isDashboardArea = useMemo(() => {
      const areas = ['/student', '/instructor', '/admin', '/account', '/search'];
      return areas.some(area => cleanPath.startsWith(area));
  }, [cleanPath]);

  const isPublicPage = useMemo(() => {
    const publicPaths = ['/', '/about', '/abonnements', '/investir', '/cgu', '/mentions-legales', '/leaderboard', '/bourse'];
    if (publicPaths.includes(cleanPath)) return true;
    if (cleanPath.startsWith('/course/')) return true; 
    return false;
  }, [cleanPath]);

  const isFullScreen = useMemo(() => {
      return cleanPath.startsWith('/courses/');
  }, [cleanPath]);

  const isAuthPage = useMemo(() => ['/login', '/register', '/forgot-password'].includes(cleanPath), [cleanPath]);

  useEffect(() => {
    if (loading) return;
    if (!user && !isPublicPage && !isAuthPage && !isFullScreen) {
      router.push(`/${locale}/login`);
    }
  }, [user, loading, isPublicPage, isAuthPage, isFullScreen, router, locale]);

  if (siteSettings.maintenanceMode && currentUser?.role !== 'admin') {
      return (
        <div className="h-screen flex flex-col items-center justify-center bg-[#0f172a] text-center p-6">
            <Wrench className="h-16 w-16 text-primary mb-4" />
            <h1 className="text-2xl font-black text-white uppercase tracking-tight">Maintenance</h1>
            <p className="text-slate-500 mt-2 font-medium italic">Revenez dans quelques instants.</p>
        </div>
      );
  }

  const handleSidebarLinkClick = () => {};
  const sidebarProps = { onLinkClick: handleSidebarLinkClick };

  return (
    <div className={cn("min-h-screen w-full bg-[#0f172a] text-white", !!user && isDashboardArea && !isFullScreen && !isPublicPage && "md:grid md:grid-cols-[280px_1fr]")}>
        <div className="grain-overlay" />

        {!!user && isDashboardArea && !isFullScreen && !isPublicPage && (
          <aside className="hidden md:block h-screen sticky top-0 border-r border-white/5">
             {role === 'admin' ? <AdminSidebar {...sidebarProps} /> : role === 'instructor' ? <InstructorSidebar {...sidebarProps} /> : <StudentSidebar {...sidebarProps} />}
          </aside>
        )}

        <div className="flex flex-col flex-1 relative z-10">
          {siteSettings.announcementMessage && <AnnouncementBanner message={siteSettings.announcementMessage} />}
          
          {!!user && isDashboardArea && !isFullScreen && !isPublicPage && (
            <header className="h-16 flex items-center border-b border-white/5 sticky top-0 z-50 bg-[#0f172a]/95 backdrop-blur-md">
                <Header />
            </header>
          )}

          <main className={cn("flex-1", (!!user && isDashboardArea && !isFullScreen && !isPublicPage) ? "pb-24 md:pb-6 md:p-6" : "p-0")}>
            {children}
          </main>

          {/* Bottom Nav Logique Mobile Multi-Rôle */}
          {!!user && !isFullScreen && (
              <div className="md:hidden">
                  {showAdminBottomNav && <AdminBottomNav />}
                  {showInstructorBottomNav && <InstructorBottomNav />}
                  {showStudentBottomNav && <BottomNav />}
              </div>
          )}
        </div>
      </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;

  return (
    <>
      <SplashScreen />
      <OfflineBar />
      <Suspense fallback={<div className="h-screen flex items-center justify-center bg-[#0f172a]"><Loader2 className="h-8 w-8 animate-spin text-primary"/></div>}>
        <AppShellInner>{children}</AppShellInner>
      </Suspense>
    </>
  );
}
