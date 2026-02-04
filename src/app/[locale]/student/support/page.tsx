
'use client';

/**
 * @fileOverview Page de support étudiant simplifiée et professionnelle.
 * Propose un contact direct via les canaux les plus utilisés (Email, WhatsApp).
 */

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { LifeBuoy, Mail, MessageCircle, Clock, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function StudentSupportPage() {
  return (
    <div className="space-y-8 pb-24 bg-slate-950 min-h-screen bg-grainy">
      <header className="px-4 pt-8">
        <h1 className="text-3xl font-black text-white">Centre d'Aide</h1>
        <p className="text-slate-500 text-sm mt-1">L'équipe Ndara est là pour vous accompagner.</p>
      </header>

      <div className="px-4 space-y-6">
        {/* --- ÉTAT DU SYSTÈME --- */}
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-emerald-500" />
            <p className="text-xs font-bold text-emerald-400 uppercase tracking-widest">Tous les services sont opérationnels</p>
        </div>

        {/* --- CONTACT DIRECT --- */}
        <div className="grid gap-4">
            <Card className="bg-slate-900/50 border-slate-800 shadow-xl overflow-hidden group">
                <CardContent className="p-6 flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-[#CC7722]/10 flex items-center justify-center">
                        <MessageCircle className="h-6 w-6 text-[#CC7722]" />
                    </div>
                    <div className="flex-1">
                        <h3 className="font-bold text-white">Aide via WhatsApp</h3>
                        <p className="text-xs text-slate-500">Réponse rapide (Mo-Ve, 8h-18h)</p>
                    </div>
                    <Button asChild className="rounded-xl bg-[#CC7722] hover:bg-[#CC7722]/90">
                        <a href="https://wa.me/23675000000" target="_blank" rel="noopener noreferrer">Ouvrir</a>
                    </Button>
                </CardContent>
            </Card>

            <Card className="bg-slate-900/50 border-slate-800 shadow-xl overflow-hidden group">
                <CardContent className="p-6 flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-blue-500/10 flex items-center justify-center">
                        <Mail className="h-6 w-6 text-blue-400" />
                    </div>
                    <div className="flex-1">
                        <h3 className="font-bold text-white">Support Email</h3>
                        <p className="text-xs text-slate-500">Pour les questions techniques</p>
                    </div>
                    <Button variant="outline" asChild className="rounded-xl border-slate-700">
                        <a href="mailto:support@ndara-afrique.com">Écrire</a>
                    </Button>
                </CardContent>
            </Card>
        </div>

        {/* --- FAQ SECTION QUICK LINK --- */}
        <div className="p-8 text-center bg-slate-900/20 rounded-[2.5rem] border-2 border-dashed border-slate-800/50">
            <Clock className="h-12 w-12 mx-auto text-slate-700 mb-4" />
            <h3 className="text-lg font-black text-slate-300">Historique des Tickets</h3>
            <p className="text-slate-500 text-xs mt-2 leading-relaxed max-w-[200px] mx-auto">
                Le système de suivi interne des tickets est en cours de déploiement.
            </p>
        </div>
      </div>
    </div>
  );
}
