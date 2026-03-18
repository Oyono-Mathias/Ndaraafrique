'use client';

/**
 * @fileOverview Cockpit de Gestion des Fonds - Ndara Afrique.
 * ✅ DESIGN : Fintech Android-first basé sur le brief Qwen.
 * ✅ FONCTIONNEL : Recharge manuelle des wallets étudiants par l'admin.
 */

import { useState } from 'react';
import { RechargeForm } from '@/components/admin/wallet/RechargeForm';
import { RechargeHistory } from '@/components/admin/wallet/RechargeHistory';
import { Landmark, History, Wallet, Sparkles } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function AdminWalletPage() {
  return (
    <div className="space-y-8 pb-24 animate-in fade-in duration-700">
      <header>
        <div className="flex items-center gap-2 text-primary mb-1">
            <Landmark className="h-4 w-4" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em]">Trésorerie Centrale</span>
        </div>
        <h1 className="text-3xl font-black text-white uppercase tracking-tight">Gestion des Portefeuilles</h1>
        <p className="text-slate-400 text-sm font-medium mt-1">Créditez les comptes étudiants et suivez les flux financiers.</p>
      </header>

      <Tabs defaultValue="recharge" className="w-full">
        <TabsList className="bg-slate-900 border-slate-800 h-14 p-1 rounded-2xl mb-8 shadow-2xl">
            <TabsTrigger value="recharge" className="px-8 font-black uppercase text-[10px] tracking-widest gap-2 h-full data-[state=active]:bg-primary data-[state=active]:text-slate-950">
                <Wallet className="h-3.5 w-3.5" /> Nouvelle Recharge
            </TabsTrigger>
            <TabsTrigger value="history" className="px-8 font-black uppercase text-[10px] tracking-widest gap-2 h-full data-[state=active]:bg-slate-800">
                <History className="h-3.5 w-3.5" /> Journal d'Audit
            </TabsTrigger>
        </TabsList>

        <TabsContent value="recharge" className="mt-0 outline-none animate-in slide-in-from-bottom-4 duration-500">
            <div className="max-w-md mx-auto">
                <RechargeForm />
            </div>
        </TabsContent>

        <TabsContent value="history" className="mt-0 outline-none animate-in slide-in-from-bottom-4 duration-500">
            <RechargeHistory />
        </TabsContent>
      </Tabs>

      <div className="max-w-md mx-auto bg-primary/5 border border-primary/10 rounded-[2rem] p-6 flex items-start gap-4 shadow-xl">
          <Sparkles className="h-6 w-6 text-primary shrink-0" />
          <p className="text-[10px] text-slate-500 font-bold uppercase leading-relaxed tracking-widest italic">
              "Toute recharge effectuée ici est immédiatement disponible pour l'étudiant et enregistrée dans le registre immuable des transactions Ndara."
          </p>
      </div>
    </div>
  );
}
