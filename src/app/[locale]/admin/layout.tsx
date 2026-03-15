'use client';

import { useRole } from "@/context/RoleContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loader2, ShieldAlert } from "lucide-react";
import { usePermissions } from "@/hooks/use-permissions";

/**
 * @fileOverview Layout Admin purifié.
 * ✅ RÉSOLU : Ne gère plus l'affichage de la navigation (délégué à AppShell).
 */

function AdminAccessRequiredScreen() {
    const router = useRouter();
    return (
        <div className="flex flex-col items-center justify-center h-[80vh] text-center p-6 bg-background text-foreground rounded-[2rem] border border-border">
             <ShieldAlert className="w-16 h-16 text-destructive mb-4" />
            <h1 className="text-2xl font-black uppercase tracking-tight">Accès Interdit</h1>
            <p className="text-muted-foreground mt-2">Vous n'avez pas les autorisations nécessaires pour accéder à cette zone.</p>
            <button onClick={() => router.push('/student/dashboard')} className="mt-8 px-8 py-3 bg-primary text-primary-foreground rounded-xl font-bold uppercase text-xs tracking-widest shadow-xl shadow-primary/20">
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

  useEffect(() => {
    if (!isUserLoading && hasPermission('admin:access') && role !== 'admin') {
      switchRole('admin');
    }
  }, [isUserLoading, hasPermission, role, switchRole]);

  if (isUserLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  if (!hasPermission('admin:access')) {
    return <AdminAccessRequiredScreen />;
  }

  return (
    <div className="flex flex-col min-h-full">
        {children}
    </div>
  )
}
