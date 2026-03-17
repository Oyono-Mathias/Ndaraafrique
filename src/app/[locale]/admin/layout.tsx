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
        <div className="flex flex-col items-center justify-center h-[80vh] text-center p-6 bg-slate-950 text-white rounded-[2rem] border border-white/5 font-sans relative overflow-hidden">
             <div className="grain-overlay opacity-[0.05]" />
             <div className="p-6 bg-red-500/10 rounded-full border-4 border-red-500/20 mb-6">
                <ShieldAlert className="w-16 h-16 text-red-500" />
             </div>
            <h1 className="text-3xl font-black uppercase tracking-tight">Accès Interdit</h1>
            <p className="text-slate-500 mt-2 max-w-xs mx-auto font-medium italic">"Mo yeke na permission ti lî na yâ ti zone so ape."</p>
            <button onClick={() => router.push('/student/dashboard')} className="mt-10 px-10 py-4 bg-primary text-slate-950 rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-2xl shadow-primary/20 transition-all active:scale-95">
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
    if (!isUserLoading && hasPermission('admin.access') && role !== 'admin') {
      switchRole('admin');
    }
  }, [isUserLoading, hasPermission, role, switchRole]);

  if (isUserLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#0f172a]">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }
  
  if (!hasPermission('admin.access')) {
    return <AdminAccessRequiredScreen />;
  }

  return (
    <div className="flex flex-col min-h-full">
        {children}
    </div>
  )
}
