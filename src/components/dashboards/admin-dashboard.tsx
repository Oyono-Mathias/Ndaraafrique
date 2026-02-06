
'use client';

import React, { useState, useEffect } from 'react';
import { useRole } from '@/context/RoleContext';
import { 
  getFirestore, 
  collection, 
  query, 
  where, 
  getDocs, 
  getCountFromServer 
} from 'firebase/firestore';
import { 
  ShieldAlert, 
  Users, 
  BookOpen, 
  DollarSign, 
  TrendingUp,
  LayoutDashboard
} from 'lucide-react';
import { AdminQuickActions } from './AdminQuickActions';
import { AdminActionQueue } from './AdminActionQueue';
import { AdminSecurityAlerts } from './AdminSecurityAlerts';
import { StatCard } from '@/components/dashboard/StatCard';

const AdminDashboard = () => {
    const { currentUser, isUserLoading } = useRole();
    const db = getFirestore();
    const [quickStats, setQuickStats] = useState({ revenue: 0, users: 0, courses: 0 });
    const [isLoadingStats, setIsLoadingStats] = useState(true);

    useEffect(() => {
        if (!currentUser || currentUser.role !== 'admin') return;

        const fetchQuickStats = async () => {
            setIsLoadingStats(true);
            try {
                const [paymentsSnap, usersSnap, coursesSnap] = await Promise.all([
                    getDocs(query(collection(db, 'payments'), where('status', '==', 'Completed'))),
                    getCountFromServer(collection(db, 'users')),
                    getCountFromServer(collection(db, 'courses'))
                ]);

                const totalRevenue = paymentsSnap.docs.reduce((acc, doc) => acc + (doc.data().amount || 0), 0);
                
                setQuickStats({
                    revenue: totalRevenue,
                    users: usersSnap.data().count,
                    courses: coursesSnap.data().count
                });
            } catch (error) {
                console.error("Error fetching quick stats:", error);
            } finally {
                setIsLoadingStats(false);
            }
        };

        fetchQuickStats();
    }, [db, currentUser]);

    if (!isUserLoading && currentUser?.role !== 'admin') {
      return (
          <div className="flex flex-col items-center justify-center h-[60vh] text-center p-4 bg-slate-950 text-white rounded-3xl">
              <ShieldAlert className="w-16 h-16 text-destructive mb-4" />
              <h1 className="text-2xl font-black uppercase tracking-tight">Accès Interdit</h1>
              <p className="text-slate-500 mt-2 max-w-xs">Vous n'avez pas les permissions nécessaires pour accéder au centre de contrôle.</p>
          </div>
      );
    }

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-700">
        <header className="flex flex-col gap-1">
            <div className="flex items-center gap-2 text-primary">
                <LayoutDashboard className="h-5 w-5" />
                <span className="text-[10px] font-black uppercase tracking-[0.3em]">Panneau de Contrôle</span>
            </div>
            <h1 className="text-3xl font-black text-white uppercase tracking-tight">Vue d'ensemble</h1>
            <p className="text-slate-500 text-sm font-medium">Pilotez la croissance et la sécurité de Ndara Afrique.</p>
        </header>

        {/* --- STATS RAPIDES --- */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard 
                title="Chiffre d'Affaires" 
                value={`${quickStats.revenue.toLocaleString('fr-FR')} XOF`} 
                icon={DollarSign} 
                isLoading={isLoadingStats}
                accentColor="bg-slate-900 border-slate-800"
            />
            <StatCard 
                title="Membres" 
                value={quickStats.users.toLocaleString('fr-FR')} 
                icon={Users} 
                isLoading={isLoadingStats}
                accentColor="bg-slate-900 border-slate-800"
            />
            <StatCard 
                title="Formations" 
                value={quickStats.courses.toLocaleString('fr-FR')} 
                icon={BookOpen} 
                isLoading={isLoadingStats}
                accentColor="bg-slate-900 border-slate-800"
            />
        </section>

        {/* --- ACTIONS RAPIDES --- */}
        <section>
          <div className="flex items-center gap-2 mb-4 px-1">
              <TrendingUp className="h-4 w-4 text-slate-500" />
              <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Gestion Prioritaire</h2>
          </div>
          <AdminQuickActions />
        </section>
        
        {/* --- COEUR DU DASHBOARD --- */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            <div className="lg:col-span-2 space-y-4">
                 <div className="flex items-center gap-2 px-1">
                    <ShieldAlert className="h-4 w-4 text-primary" />
                    <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">File d'attente opérationnelle</h2>
                </div>
                <AdminActionQueue />
            </div>
            <div className="lg:col-span-1 space-y-4">
                 <div className="flex items-center gap-2 px-1">
                    <ShieldAlert className="h-4 w-4 text-amber-500" />
                    <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Alertes & Sécurité</h2>
                </div>
                <AdminSecurityAlerts />
            </div>
        </div>
    </div>
  );
};

export default AdminDashboard;
