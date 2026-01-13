
'use client';

import React, { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useRole } from '@/context/RoleContext';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { StudentSidebar } from './student-sidebar';
import { InstructorSidebar } from './instructor-sidebar';
import { AdminSidebar } from './admin-sidebar';
import { Button } from '../ui/button';
import { Wrench, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { doc, onSnapshot, getFirestore } from 'firebase/firestore';
import { SplashScreen } from '../splash-screen';
import { Header } from './header';
import '@/i18n';

function MaintenancePage() {
    return (
        <div className="flex flex-col items-center justify-center h-screen bg-background text-center p-4">
            <Wrench className="h-16 w-16 text-primary mb-4" />
            <h1 className="text-3xl font-bold text-foreground">Site en maintenance</h1>
            <p className="text-muted-foreground mt-2">Nous effectuons des mises à jour. Le site sera de retour très prochainement.</p>
        </div>
    );
}

const BOTTOM_NAV_ROUTES = ['/dashboard', '/search', '/mes-formations', '/messages', '/account'];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { role, isUserLoading, user, formaAfriqueUser } = useRole();
  const pathname = usePathname();
  const [siteSettings, setSiteSettings] = useState({ siteName: 'Ndara Afrique', logoUrl: '/icon.svg', maintenanceMode: false });
  const db = getFirestore();
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  
  const isAuthPage = pathname === '/login' || pathname === '/register' || pathname === '/forgot-password';
  const isLandingPage = pathname === '/';

  useEffect(() => {
    const settingsRef = doc(db, 'settings', 'global');
    const unsubscribe = onSnapshot(settingsRef, (docSnap) => {
        if (docSnap.exists()) {
            const settingsData = docSnap.data();
            setSiteSettings({
                siteName: settingsData.general?.siteName || 'Ndara Afrique',
                logoUrl: settingsData.general?.logoUrl || '/icon.svg',
                maintenanceMode: settingsData.platform?.maintenanceMode || false,
            });
        }
    });
    return () => unsubscribe();
  }, [db]);
  
  if (isLandingPage || isAuthPage) {
    return <>{children}</>;
  }

  if (isUserLoading) {
    return <SplashScreen />;
  }

  if (siteSettings.maintenanceMode && formaAfriqueUser?.role !== 'admin') {
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
  
  const currentPath = `/${pathname.split('/')[1]}`;
  const isFullScreenPage = pathname.startsWith('/courses/');
  const isStudentOnMobile = role === 'student' && typeof window !== 'undefined' && window.innerWidth < 768;
  const showBottomNav = isStudentOnMobile && BOTTOM_NAV_ROUTES.includes(currentPath);

  const mainContentPadding = cn(
    "p-4 sm:p-6",
    {"pb-24": showBottomNav} // Add padding for bottom nav
  );
  
  return (
      <div className="grid min-h-screen w-full md:grid-cols-[280px_1fr]">
        <aside className={cn("hidden md:block h-screen sticky top-0", isFullScreenPage && "md:hidden")}>
          {renderSidebar()}
        </aside>
        <div className="flex flex-col">
           <Header mobileSheet={
              <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                <SheetTrigger asChild>
                  {renderSidebar()}
                </SheetTrigger>
                <SheetContent side="left" className="flex flex-col p-0 bg-background w-full max-w-[280px]">
                  {renderSidebar()}
                </SheetContent>
            </Sheet>
            }/>
          
          <main className={mainContentPadding}>
              {children}
          </main>
        </div>
      </div>
  );
}
