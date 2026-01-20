
'use client';

import React from 'react';
import { useRole } from '@/context/RoleContext';
import { ShieldAlert } from 'lucide-react';
import { AdminQuickActions } from './AdminQuickActions';
import { AdminActionQueue } from './AdminActionQueue';
import { AdminSecurityAlerts } from './AdminSecurityAlerts';


const AdminDashboard = () => {
    const { currentUser, isUserLoading } = useRole();

    if (!isUserLoading && currentUser?.role !== 'admin') {
      return (
          <div className="flex flex-col items-center justify-center h-[60vh] text-center p-4">
              <ShieldAlert className="w-16 h-16 text-destructive mb-4" />
              <h1 className="text-2xl font-bold text-white">Accès Interdit</h1>
              <p className="text-muted-foreground">Vous n'avez pas les permissions nécessaires pour voir ce tableau de bord.</p>
          </div>
      );
    }

  return (
    <div className="space-y-8">
        <header>
            <h1 className="text-3xl font-bold text-white">Tableau de Bord</h1>
            <p className="text-muted-foreground">Vue d'ensemble et actions rapides pour la gestion de la plateforme.</p>
        </header>

        <section>
          <AdminQuickActions />
        </section>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            <div className="lg:col-span-2">
                 <section>
                    <h2 className="text-xl font-semibold mb-4 text-white">File d'actions</h2>
                    <AdminActionQueue />
                </section>
            </div>
            <div className="lg:col-span-1">
                 <section>
                     <AdminSecurityAlerts />
                </section>
            </div>
        </div>
    </div>
  );
};

export default AdminDashboard;
