'use client';

/**
 * @fileOverview Centre de Support Admin Ndara Afrique - Design Elite.
 * Centralise les demandes d'assistance avec une vue prioritaire.
 */

import { TicketList } from '@/components/admin/support/TicketList';
import { LifeBuoy, Zap, Clock, ShieldCheck } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { getFirestore, collection, query, where, onSnapshot } from 'firebase/firestore';

export default function AdminSupportPage() {
  const db = getFirestore();
  const [counts, setCounts] = useState({ open: 0, urgent: 0 });

  useEffect(() => {
    // Compter les tickets ouverts
    const qOpen = query(collection(db, 'support_tickets'), where('status', '==', 'ouvert'));
    const unsub = onSnapshot(qOpen, (snap) => {
        setCounts(prev => ({ ...prev, open: snap.size }));
    });
    return () => unsub();
  }, [db]);

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20 relative">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[400px] bg-blue-500/5 blur-[100px] pointer-events-none" />

      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 relative z-10">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-blue-400 mb-1">
            <LifeBuoy className="h-4 w-4" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em]">Relation Ndara</span>
          </div>
          <h1 className="text-3xl font-black text-white uppercase tracking-tight">Centre d'Assistance</h1>
          <p className="text-slate-400 text-sm font-medium">Arbitrez les demandes et maintenez la satisfaction communautaire.</p>
        </div>

        <div className="flex items-center gap-3">
            <div className="bg-blue-500/10 text-blue-400 text-[10px] font-black px-3 py-1.5 rounded-full border border-blue-500/20 flex items-center gap-2 shadow-lg">
                <Zap className="w-3 h-3" />
                {counts.open} DEMANDES ACTIVES
            </div>
        </div>
      </header>

      {/* SLA Status Bar */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-4 relative z-10">
          <div className="bg-slate-900 border border-white/5 p-5 rounded-[2rem] flex items-center gap-4 shadow-xl">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                  <ShieldCheck size={20} />
              </div>
              <div>
                  <p className="text-white text-xs font-black uppercase">Temps de réponse</p>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Moyenne : 45 min (Optimal)</p>
              </div>
          </div>
          <div className="bg-slate-900 border border-white/5 p-5 rounded-[2rem] flex items-center gap-4 shadow-xl">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                  <Clock size={20} />
              </div>
              <div>
                  <p className="text-white text-xs font-black uppercase">Tickets en retard</p>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">0 critique (SLA respecté)</p>
              </div>
          </div>
      </section>

      <div className="relative z-10">
        <TicketList />
      </div>
    </div>
  );
}
