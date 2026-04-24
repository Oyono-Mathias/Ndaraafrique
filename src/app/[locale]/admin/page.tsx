'use client';

/**
 * @fileOverview Point d'entrée du Cockpit Admin.
 * Redirige vers le composant Dashboard Android-First.
 * ✅ UNIFICATION : S'assure que les données traitées sont en minuscules.
 */

import AdminDashboard from "@/components/dashboards/admin-dashboard";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";

export default function AdminRootPage() {
  return (
    <Suspense fallback={
        <div className="h-[70vh] flex flex-col items-center justify-center gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Initialisation du Cockpit...</p>
        </div>
    }>
        <AdminDashboard />
    </Suspense>
  );
}
