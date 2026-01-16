

'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
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

const BOTTOM_NAV_ROUTES = ['/dashboard', '/search', '/mes-formations', '/messages', '/account', '/notifications'];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { role, isUserLoading, user, currentUser } = useRole();
  const pathname = usePathname();
  const [siteSettings, setSiteSettings] = useState({ 
      siteName: 'Ndara Afrique', 
      logoUrl: '/icon.svg', 
      maintenanceMode: false,
      allowInstructorSignup: true,
    });
  const db = getFirestore();
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  
  const isAuthPage = pathname === '/login' || pathname === '/register' || pathname === '/forgot-password';
  const isLaunchPage = pathname === '/launch';
  const isLandingPage = pathname === '/' && !isLaunchPage;
  const isAdminArea = pathname.startsWith('/admin');

  useEffect(() => {
    const settingsRef = doc(db, 'settings', 'global');
    const unsubscribe = onSnapshot(settingsRef, (docSnap) => {
        if (docSnap.exists()) {
            const settingsData = docSnap.data();
            setSiteSettings({
                siteName: 'Ndara Afrique',
                logoUrl: settingsData.general?.logoUrl || '/icon.svg',
                maintenanceMode: settingsData.platform?.maintenanceMode || false,
                allowInstructorSignup: settingsData.platform?.allowInstructorSignup ?? true,
            });
        }
    });
    return () => unsubscribe();
  }, [db]);
  
  if (isLandingPage) {
    // Pass settings down to the landing page if needed
    // This allows CTA buttons to be enabled/disabled
    return React.cloneElement(children as React.ReactElement, { siteSettings });
  }
  
  if (isAuthPage || isLaunchPage) {
    return <>{children}</>;
  }

  if (isUserLoading) {
    return <SplashScreen />;
  }

  if (siteSettings.maintenanceMode && currentUser?.role !== 'admin') {
    return <MaintenancePage />;
  }
  
  if (!user) {
    return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }
  
  const handleSidebarLinkClick = () => {
      setIsSheetOpen(false);
  };

  const renderSidebar = () => {
    const props = { siteName: siteSettings.siteName, logoUrl: siteSettings.logoUrl, onLinkClick: handleSidebarLinkClick };
    if (role === 'admin') return <AdminSidebar {...props} />;
    if (role === 'instructor') return <InstructorSidebar {...props} />;
    if (role === 'student') return <StudentSidebar {...props} />;
    return null;
  };
  
  const isFullScreenPage = pathname.startsWith('/courses/');

  const mainContentPadding = cn(
    "p-6",
    isFullScreenPage && "!p-0" // Force no padding for course player
  );
  
  // Admin layout is different. The actual layout is handled in /admin/layout.tsx
  if (isAdminArea) {
      return <>{children}</>;
  }

  // Member (Student/Instructor) Layout
  return (
      <div className={cn("min-h-screen w-full bg-slate-900 text-white", isFullScreenPage ? "block" : "md:grid md:grid-cols-[280px_1fr]")}>
        <aside className={cn("hidden h-screen sticky top-0", isFullScreenPage ? "md:hidden" : "md:block")}>
          {renderSidebar()}
        </aside>
        <div className="flex flex-col">
          <header className={cn("flex h-16 items-center gap-4 border-b border-slate-800 px-4 lg:px-6 sticky top-0 z-30 bg-slate-900/80 backdrop-blur-sm", isFullScreenPage && "md:hidden")}>
             <div className="md:hidden">
                <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                    <SheetTrigger asChild>
                    <Button
                        variant="outline"
                        size="icon"
                        className="shrink-0 bg-transparent border-slate-700"
                    >
                        <PanelLeft className="h-5 w-5" />
                        <span className="sr-only">Ouvrir le menu</span>
                    </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="flex flex-col p-0 w-full max-w-[280px] bg-[#111827] border-r-0">
                      {renderSidebar()}
                    </SheetContent>
                </Sheet>
            </div>
            <div className="w-full flex justify-end">
                <Header />
            </div>
          </header>
          
          <main className={mainContentPadding}>
              {children}
          </main>
        </div>
      </div>
  );
}
