'use client';

/**
 * @fileOverview Page principale de gestion des cours pour les administrateurs.
 * ✅ NOUVEAU : Intégration du moniteur du Marché Secondaire (Arbitrage).
 */

import { CoursesTable } from '@/components/admin/courses/courses-table';
import { BuyoutRequestsTable } from '@/components/admin/courses/BuyoutRequestsTable';
import { ResaleMonitorTable } from '@/components/admin/courses/ResaleMonitorTable';
import { Button } from '@/components/ui/button';
import { BookOpen, ShoppingCart, LayoutGrid, TrendingUp } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Link from 'next/link';

export default function AdminCoursesPage() {
  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <div className="flex items-center gap-2 text-primary mb-1">
            <BookOpen className="h-4 w-4" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em]">Gestion Pédagogique</span>
          </div>
          <h1 className="text-3xl font-black text-white uppercase tracking-tight">Catalogue de Formations</h1>
          <p className="text-slate-400 text-sm font-medium mt-1">Supervisez, modérez et organisez l'offre de savoir Ndara Afrique.</p>
        </div>
        <Button asChild className="h-12 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-black uppercase text-[10px] tracking-widest shadow-xl transition-all active:scale-95">
          <Link href="/instructor/courses/create">
            <LayoutGrid className="mr-2 h-4 w-4" /> Nouvelle Formation
          </Link>
        </Button>
      </header>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="bg-slate-900 border-slate-800 h-14 p-1 rounded-2xl w-full sm:w-auto">
            <TabsTrigger value="all" className="px-6 font-bold uppercase text-[10px] tracking-widest gap-2 h-full">
                <LayoutGrid className="h-3.5 w-3.5" /> Catalogue
            </TabsTrigger>
            <TabsTrigger value="resale" className="px-6 font-bold uppercase text-[10px] tracking-widest gap-2 h-full text-amber-500">
                <TrendingUp className="h-3.5 w-3.5" /> Marché Secondaire
            </TabsTrigger>
            <TabsTrigger value="buyouts" className="px-6 font-bold uppercase text-[10px] tracking-widest gap-2 h-full text-primary">
                <ShoppingCart className="h-3.5 w-3.5" /> Demandes de Rachat
            </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-8">
            <CoursesTable />
        </TabsContent>

        <TabsContent value="resale" className="mt-8">
            <ResaleMonitorTable />
        </TabsContent>

        <TabsContent value="buyouts" className="mt-8">
            <BuyoutRequestsTable />
        </TabsContent>
      </Tabs>
    </div>
  );
}
