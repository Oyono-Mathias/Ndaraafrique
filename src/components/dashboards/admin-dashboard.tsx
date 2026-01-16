
'use client';

import React from 'react';
import { useRole } from '@/context/RoleContext';
import { ShieldAlert } from 'lucide-react';
import { AdminActionQueue } from './AdminActionQueue';
import { AdminSecurityAlerts } from './AdminSecurityAlerts';
import { AdminQuickActions } from './AdminQuickActions';

// --- COMPOSANT DU TABLEAU DE BORD PRINCIPAL ---
const AdminDashboard = () => {
  const { currentUser, isUserLoading } = useRole();

  // --- Authorization Check ---
  if (!isUserLoading && currentUser?.role !== 'admin') {
    return (
        <div className="flex flex-col items-center justify-center h-[50vh] text-center p-4">
             <ShieldAlert className="w-16 h-16 text-destructive mb-4" />
            <h1 className="text-2xl font-bold">Accès Interdit</h1>
            <p className="text-muted-foreground">Vous n'avez pas les autorisations nécessaires pour accéder à cette page.</p>
        </div>
    )
  }

  return (
    <div className="space-y-8">
        <section>
            <h2 className="text-xl font-semibold mb-4 text-white">Actions Rapides</h2>
            <AdminQuickActions />
        </section>

       <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
            <section>
                <h2 className="text-xl font-semibold mb-4 text-white">Actions en attente</h2>
                <AdminActionQueue />
            </section>
        </div>
        <div className="xl:col-span-1 space-y-6">
             <section>
                <h2 className="text-xl font-semibold mb-4 text-white">Sécurité</h2>
                <AdminSecurityAlerts />
            </section>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
