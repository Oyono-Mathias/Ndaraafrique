
'use client';

/**
 * @fileOverview Page principale de gestion des cours pour les administrateurs.
 * ✅ DESIGN QWEN : Header avec compteur de modération.
 * ✅ INTÉGRATION : Centralisation du catalogue et du marché secondaire.
 */

import { useMemo, useState, useEffect } from 'react';
import { getFirestore, collection, query, where, onSnapshot } from 'firebase/firestore';
import { CoursesTable } from '@/components/admin/courses/courses-table';
import { BuyoutRequestsTable } from '@/components/admin/courses/BuyoutRequestsTable';
import { ResaleMonitorTable } from '@/components/admin/courses/ResaleMonitorTable';
import { Button } from '@/components/ui/button';
import { BookOpen, ShoppingCart, LayoutGrid, TrendingUp, Filter, Plus } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Link from 'next/link';
import { useLocale } from 'next-intl';

export default function AdminCoursesPage() {
  const db = getFirestore();
  const locale = useLocale();
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const q = query(collection(db, 'courses'), where('status', '==', 'Pending Review'));
    const unsub = onSnapshot(q, (snap) => {
        setPendingCount(snap.size);
    });
    return () => unsub();
  }, [db]);

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20 relative">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[400px] bg-primary/5 blur-[100px] pointer-events-none" />

      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 relative z-10">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-primary mb-1">
            <BookOpen className="h-4 w-4" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em]">Gestion du Savoir</span>
          </div>
          <h1 className="text-3xl font-black text-white uppercase tracking-tight">Catalogue & Modération</h1>
          <p className="text-slate-400 text-sm font-medium">Supervisez l'offre pédagogique et arbitrez le marché.</p>
        </div>

        <div className="flex items-center gap-3">
            {pendingCount > 0 && (
                <div className="bg-amber-500/20 text-amber-500 text-[10px] font-black px-3 py-1.5 rounded-full border border-amber-500/30 flex items-center gap-2 animate-pulse shadow-lg shadow-amber-500/10">
                    <div className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_8px_#f59e0b]" />
                    {pendingCount} À MODÉRER
                </div>
            )}
            <Button asChild className="h-12 rounded-2xl bg-primary hover:bg-primary/90 text-slate-950 font-black uppercase text-[10px] tracking-widest shadow-xl transition-all active:scale-95">
                <Link href="/instructor/courses/create">
                    <Plus className="mr-2 h-4 w-4" /> Nouveau Cours
                </Link>
            </Button>
        </div>
      </header>

      <Tabs defaultValue="all" className="w-full relative z-10">
        <TabsList className="bg-slate-900 border-slate-800 h-14 p-1 rounded-2xl w-full sm:w-auto mb-8 shadow-2xl">
            <TabsTrigger value="all" className="px-6 font-bold uppercase text-[10px] tracking-widest gap-2 h-full">
                <LayoutGrid className="h-3.5 w-3.5" /> Catalogue
            </TabsTrigger>
            <TabsTrigger value="resale" className="px-6 font-bold uppercase text-[10px] tracking-widest gap-2 h-full text-blue-400">
                <TrendingUp className="h-3.5 w-3.5" /> Marché Secondaire
            </TabsTrigger>
            <TabsTrigger value="buyouts" className="px-6 font-bold uppercase text-[10px] tracking-widest gap-2 h-full text-primary">
                <ShoppingCart className="h-3.5 w-3.5" /> Rachats Ndara
            </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-0 outline-none">
            <CoursesTable />
        </TabsContent>

        <TabsContent value="resale" className="mt-0 outline-none">
            <ResaleMonitorTable />
        </TabsContent>

        <TabsContent value="buyouts" className="mt-0 outline-none">
            <BuyoutRequestsTable />
        </TabsContent>
      </Tabs>
    </div>
  );
}
