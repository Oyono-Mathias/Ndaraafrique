
'use client';

import React, { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useRole } from '@/context/RoleContext';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { StudentSidebar } from './student-sidebar';
import { InstructorSidebar } from './instructor-sidebar';
import { AdminSidebar } from './admin-sidebar';
import { Button } from '../ui/button';
import { Wrench, Loader2, PanelLeft } from 'lucide-react';
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

const PUBLIC_PATHS = [
    '/', 
    '/about',
    '/cgu',
    '/mentions-legales',
    '/paiements',
    '/payment',
    '/verify',
    '/course',
    '/instructor',
    '/abonnements'
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { role, isUserLoading, user, currentUser } = useRole();
  const pathname = usePathname();
  const router = useRouter();
  const [siteSettings, setSiteSettings] = useState({ 
      siteName: 'Ndara Afrique', 
      logoUrl: '/icon.svg', 
      maintenanceMode: false,
      allowInstructorSignup: true,
    });
  const db = getFirestore();
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  
  const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/register') || pathname.startsWith('/forgot-password');
  const isLaunchPage = pathname.startsWith('/launch');
  const isPublicPage = PUBLIC_PATHS.some(p => p === '/' ? pathname === p : pathname.startsWith(p));

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
            });
        }
    });
    return () => unsubscribe();
  }, [db]);
  
  if (isAuthPage || isLaunchPage) {
    return <>{children}</>;
  }

  const showMaintenance = !isUserLoading && siteSettings.maintenanceMode && currentUser?.role !== 'admin';
  const showAppContent = isPublicPage || (!isUserLoading && user);
  const showLoader = !isPublicPage && !isUserLoading && !user;

  useEffect(() => {
    if (showLoader) {
      router.push('/login');
    }
  }, [showLoader, router]);

  const handleSidebarLinkClick = () => {
      setIsSheetOpen(false);
  };
  
  const sidebarProps = {
    siteName: siteSettings.siteName,
    logoUrl: siteSettings.logoUrl,
    onLinkClick: handleSidebarLinkClick,
  };
  
  const isFullScreenPage = pathname.startsWith('/courses/');
  const mainContentPadding = cn("p-6", isFullScreenPage && "!p-0");

  const isAdminArea = pathname.startsWith('/admin');

  return (
      <>
        <SplashScreen />

        <div className={cn({ 'hidden': !showMaintenance })}>
            <MaintenancePage />
        </div>

        <div className={cn("flex h-screen w-full items-center justify-center", { 'hidden': !showLoader })}>
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
        
        <div className={cn({ 'hidden': !showAppContent || showMaintenance })}>
          <div className={cn("min-h-screen w-full bg-slate-900 text-white", !isAdminArea && (isFullScreenPage ? "block" : "md:grid md:grid-cols-[280px_1fr]"))}>
            {!isAdminArea && (
              <aside className={cn("hidden h-screen sticky top-0", isFullScreenPage ? "md:hidden" : "md:block")}>
                <div className={cn({ 'hidden': role !== 'student' })}><StudentSidebar {...sidebarProps} /></div>
                <div className={cn({ 'hidden': role !== 'instructor' })}><InstructorSidebar {...sidebarProps} /></div>
                <div className={cn({ 'hidden': role !== 'admin' })}><AdminSidebar {...sidebarProps} /></div>
              </aside>
            )}
            <div className="flex flex-col">
              {!isAdminArea && (
                <header className={cn("flex h-16 items-center gap-4 border-b border-slate-800 px-4 lg:px-6 sticky top-0 z-30 bg-slate-900/80 backdrop-blur-sm", isFullScreenPage && "md:hidden")}>
                  <div className="md:hidden">
                      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                          <SheetTrigger asChild>
                              <Button variant="outline" size="icon" className="shrink-0 bg-transparent border-slate-700">
                                  <PanelLeft className="h-5 w-5" />
                                  <span className="sr-only">Ouvrir le menu</span>
                              </Button>
                          </SheetTrigger>
                          <SheetContent side="left" className="flex flex-col p-0 w-full max-w-[280px] bg-[#111827] border-r-0">
                              <div className={cn({ 'hidden': role !== 'student' })}><StudentSidebar {...sidebarProps} /></div>
                              <div className={cn({ 'hidden': role !== 'instructor' })}><InstructorSidebar {...sidebarProps} /></div>
                              <div className={cn({ 'hidden': role !== 'admin' })}><AdminSidebar {...sidebarProps} /></div>
                          </SheetContent>
                      </Sheet>
                  </div>
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
        </div>
      </>
  );
}
