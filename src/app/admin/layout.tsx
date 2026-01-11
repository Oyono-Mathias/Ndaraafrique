'use client';

import { useRole } from "@/context/RoleContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Loader2, ShieldAlert, PanelLeft, X } from "lucide-react";
import { AdminSidebar } from "@/components/layout/admin-sidebar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { getDoc, doc, getFirestore, onSnapshot } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";

function AdminAccessRequiredScreen() {
    const router = useRouter();
    return (
        <div className="flex flex-col items-center justify-center h-screen text-center p-4 bg-gray-900 text-white">
             <ShieldAlert className="w-16 h-16 text-red-500 mb-4" />
            <h1 className="text-2xl font-bold">Accès Interdit</h1>
            <p className="text-gray-400">Vous n'avez pas les autorisations nécessaires pour accéder à cette page.</p>
            <button onClick={() => router.push('/dashboard')} className="mt-6 px-4 py-2 bg-blue-600 rounded-md hover:bg-blue-700">
                Retour au tableau de bord
            </button>
        </div>
    )
}

const AnnouncementBanner = () => {
    const [message, setMessage] = useState('');
    const [isVisible, setIsVisible] = useState(false);
    const db = getFirestore();

    useEffect(() => {
        const settingsRef = doc(db, 'settings', 'global');
        const unsubscribe = onSnapshot(settingsRef, (docSnap) => {
            if (docSnap.exists()) {
                const announcementMessage = docSnap.data().platform?.announcementMessage;
                if (announcementMessage && sessionStorage.getItem(`announcement_${announcementMessage}`) !== 'dismissed') {
                    setMessage(announcementMessage);
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
        sessionStorage.setItem(`announcement_${message}`, 'dismissed');
    };

    if (!isVisible) return null;

    return (
        <div className="bg-primary text-primary-foreground px-4 py-2 flex items-center gap-4 text-sm font-medium relative">
            <p className="flex-1 text-center">{message}</p>
            <Button variant="ghost" size="icon" onClick={handleDismiss} className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 hover:bg-primary/50">
                <X className="h-4 w-4"/>
            </Button>
        </div>
    );
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { formaAfriqueUser, isUserLoading, role, switchRole } = useRole();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [siteSettings, setSiteSettings] = useState({ siteName: 'FormaAfrique', logoUrl: '/icon.svg' });
  const db = getFirestore();

   useEffect(() => {
    const settingsRef = doc(db, 'settings', 'global');
    const unsubscribe = onSnapshot(settingsRef, (docSnap) => {
        if (docSnap.exists()) {
            const settingsData = docSnap.data();
            setSiteSettings({
                siteName: settingsData.general?.siteName || 'FormaAfrique',
                logoUrl: settingsData.general?.logoUrl || '/icon.svg',
            });
        }
    });
    return () => unsubscribe();
  }, [db]);

  useEffect(() => {
    if (!isUserLoading && formaAfriqueUser?.role !== 'admin') {
      router.push('/dashboard');
    }
     // Automatically switch to admin role if the user is an admin but is in another role context
    if (!isUserLoading && formaAfriqueUser?.role === 'admin' && role !== 'admin') {
      switchRole('admin');
    }
  }, [isUserLoading, formaAfriqueUser, role, switchRole, router]);

  if (isUserLoading || role !== 'admin' || formaAfriqueUser?.role !== 'admin') {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-900">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  return (
    <div className="admin-grid-layout bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-slate-100">
        {/* --- Sidebar for Tablet and Desktop --- */}
        <aside className="admin-sidebar-container hidden md:block border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
             <AdminSidebar siteName={siteSettings.siteName} logoUrl={siteSettings.logoUrl} />
        </aside>

        {/* --- Main Content Area --- */}
        <div className="flex flex-col min-h-screen">
            <AnnouncementBanner />
            <header className="admin-header flex h-16 items-center gap-4 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur-sm px-4 lg:px-6">
                <Sheet open={open} onOpenChange={setOpen}>
                    <SheetTrigger asChild>
                    <Button
                        variant="outline"
                        size="icon"
                        className="shrink-0 md:hidden bg-transparent border-slate-300 dark:border-slate-700"
                    >
                        <PanelLeft className="h-5 w-5" />
                        <span className="sr-only">Ouvrir le menu</span>
                    </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="flex flex-col p-0 bg-white dark:bg-slate-950 border-r dark:border-slate-800 text-slate-900 dark:text-slate-100 w-full max-w-[280px]">
                        <AdminSidebar siteName={siteSettings.siteName} logoUrl={siteSettings.logoUrl} />
                    </SheetContent>
                </Sheet>
                <div className="w-full flex-1">
                    {/* You can add a search bar or other header elements here if needed */}
                </div>
            </header>
            <main className="flex-1 p-4 sm:p-6 lg:p-8 xl:p-10 overflow-y-auto">
                {children}
            </main>
        </div>
    </div>
  )
}