'use client';

import { useRole } from "@/context/RoleContext";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useMemo } from "react";
import { Loader2, ShieldAlert } from "lucide-react";
import { usePermissions } from "@/hooks/use-permissions";
import { AdminBottomNav } from "@/components/layout/admin-bottom-nav";
import { cn } from "@/lib/utils";

/**
 * @fileOverview Layout Admin purifié avec gestion de visibilité intelligente de la Bottom Nav.
 */

function AdminAccessRequiredScreen() {
    const router = useRouter();
    return (
        <div className="flex flex-col items-center justify-center h-[80vh] text-center p-6 bg-slate-950 text-white rounded-[2rem] border border-slate-800">
             <ShieldAlert className="w-16 h-16 text-red-500 mb-4" />
            <h1 className="text-2xl font-black uppercase tracking-tight">Accès Interdit</h1>
            <p className="text-slate-500 mt-2">Vous n'avez pas les autorisations nécessaires pour accéder à cette zone.</p>
            <button onClick={() => router.push('/student/dashboard')} className="mt-8 px-8 py-3 bg-primary text-white rounded-xl font-bold uppercase text-xs tracking-widest shadow-xl shadow-primary/20">
                Retour au tableau de bord
            </button>
        </div>
    )
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isUserLoading, role, switchRole } = useRole();
  const { hasPermission } = usePermissions();
  const pathname = usePathname() || '';

  const cleanPath = useMemo(() => {
    return pathname.replace(/^\/(en|fr)/, '') || '/';
  }, [pathname]);

  const showNavigation = useMemo(() => {
    // Masquage sur les pages complexes (Réglages avec bouton save collant, ou détails de ticket)
    if (cleanPath === '/admin/settings') return false;
    
    // Détection d'un détail de ticket (ex: /admin/support/XYZ)
    const pathSegments = cleanPath.split('/').filter(Boolean);
    if (pathSegments[0] === 'admin' && pathSegments[1] === 'support' && pathSegments.length > 2) {
        return false;
    }

    return true; // Visible par défaut ailleurs en admin
  }, [cleanPath]);

  useEffect(() => {
    if (!isUserLoading && hasPermission('admin:access') && role !== 'admin') {
      switchRole('admin');
    }
  }, [isUserLoading, hasPermission, role, switchRole]);

  if (isUserLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  if (!hasPermission('admin:access')) {
    return <AdminAccessRequiredScreen />;
  }

  return (
    <div className="flex flex-col min-h-full">
        <main className="flex-1 overflow-y-auto">
            <div className={cn(showNavigation && "pb-24")}>
                {children}
            </div>
        </main>
        {showNavigation && <AdminBottomNav />}
    </div>
  )
}
