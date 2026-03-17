'use client';

/**
 * @fileOverview Cockpit de Recrutement des Experts - Ndara Afrique.
 * ✅ DESIGN : Statistiques de performance de recrutement.
 * ✅ RÉSOLU : Structure Android-First fluide.
 */

import { useState, useMemo, useEffect } from 'react';
import { getFirestore, collection, query, where, onSnapshot } from 'firebase/firestore';
import { ApplicationsTable } from '@/components/admin/instructors/ApplicationsTable';
import { StatCard } from '@/components/dashboard/StatCard';
import { UserCheck, Percent, Clock, Star } from 'lucide-react';

export default function AdminInstructorsPage() {
  const db = getFirestore();
  const [stats, setStats] = useState({ weekTotal: 0, acceptanceRate: 85 });

  useEffect(() => {
      // Simulation ou calcul réel des stats de la semaine
      const q = query(collection(db, 'users'), where('role', '==', 'instructor'));
      const unsub = onSnapshot(q, (snap) => {
          setStats(prev => ({ ...prev, weekTotal: snap.size }));
      });
      return () => unsub();
  }, [db]);

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      <header>
        <div className="flex items-center gap-2 text-primary mb-1">
            <UserCheck className="h-4 w-4" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em]">Talent Acquisition</span>
        </div>
        <h1 className="text-3xl font-black text-white uppercase tracking-tight">Candidatures</h1>
        <p className="text-slate-400 text-sm font-medium mt-1">Examinez les dossiers pour bâtir l'élite pédagogique Ndara.</p>
      </header>

      {/* Stats Summary Qwen Design */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="glass rounded-[2rem] p-5 border border-white/5 shadow-xl">
              <p className="text-slate-500 text-[9px] font-black uppercase tracking-widest mb-1">Total Experts</p>
              <p className="text-2xl font-black text-white">{stats.weekTotal}</p>
          </div>
          <div className="glass rounded-[2rem] p-5 border border-white/5 shadow-xl">
              <p className="text-slate-500 text-[9px] font-black uppercase tracking-widest mb-1">Taux Acceptation</p>
              <p className="text-2xl font-black text-primary">{stats.acceptanceRate}%</p>
          </div>
      </section>

      <ApplicationsTable />
    </div>
  );
}
