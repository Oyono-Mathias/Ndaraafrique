'use client';

/**
 * @fileOverview XP & Rewards Lab Ndara Afrique.
 * ✅ DESIGN QWEN : Interface tactique de configuration des récompenses.
 * Branché sur la collection 'gamification_rules'.
 */

import { useState, useMemo } from 'react';
import { useCollection } from '@/firebase';
import { getFirestore, collection, query, orderBy, doc, updateDoc } from 'firebase/firestore';
import { 
    Trophy, 
    Medal, 
    Zap, 
    Plus, 
    Star, 
    Award,
    Settings,
    Sparkles,
    CheckCircle2,
    Gift,
    BookOpen,
    ChevronRight,
    Loader2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

export default function AdminGamificationPage() {
    const db = getFirestore();
    const { toast } = useToast();
    
    // Raccordement réel aux règles de gamification
    const rulesQuery = useMemo(() => query(collection(db, 'gamification_rules'), orderBy('updatedAt', 'desc')), [db]);
    const { data: rules, isLoading } = useCollection<any>(rulesQuery);

    return (
        <div className="space-y-10 pb-20 animate-in fade-in duration-700 relative">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-[500px] bg-ndara-amber/5 rounded-full blur-[120px] pointer-events-none" />

            <header className="relative z-10">
                <div className="flex items-center gap-2 text-ndara-amber mb-1">
                    <Trophy className="h-4 w-4 fill-ndara-amber" />
                    <span className="text-[10px] font-black uppercase tracking-[0.3em]">Engagement & Rewards Lab</span>
                </div>
                <h1 className="text-3xl font-black text-white uppercase tracking-tight">Gamification</h1>
                <p className="text-slate-500 text-sm font-medium mt-1">Transformez l'apprentissage en aventure pour vos Ndara.</p>
            </header>

            <div className="grid lg:grid-cols-3 gap-8 relative z-10">
                
                {/* --- XP CONFIGURATION LAB --- */}
                <div className="lg:col-span-2 space-y-6">
                    <h2 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em] flex items-center gap-2 px-1">
                        <Zap className="h-4 w-4 text-primary" />
                        Scoring Automatique (XP)
                    </h2>
                    
                    <Card className="bg-slate-900/50 backdrop-blur-xl border border-white/5 rounded-4xl overflow-hidden shadow-2xl">
                        <CardContent className="p-8 space-y-6">
                            <XpRuleItem icon={BookOpen} label="Complétion d'une leçon" value={10} color="text-ndara-amber" bgColor="bg-ndara-amber/10" />
                            <XpRuleItem icon={CheckCircle2} label="Quiz réussi (>80%)" value={50} color="text-blue-400" bgColor="bg-blue-500/10" />
                            <XpRuleItem icon={Medal} label="Premier cours validé" value={100} color="text-emerald-400" bgColor="bg-emerald-500/10" />
                            <XpRuleItem icon={Sparkles} label="Parrainage actif" value={200} color="text-purple-400" bgColor="bg-purple-500/10" />
                            
                            <div className="pt-6 border-t border-white/5">
                                <Button className="w-full h-16 rounded-3xl bg-primary hover:bg-emerald-400 text-slate-950 font-black uppercase text-xs tracking-widest shadow-2xl shadow-primary/20 transition-all active:scale-95">
                                    Déployer les règles de scoring
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* --- AUTO-REWARDS & BADGES --- */}
                <aside className="space-y-6">
                    <h2 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em] flex items-center gap-2 px-1">
                        <Award className="h-4 w-4 text-primary" />
                        Déblocage de Statut
                    </h2>
                    
                    <div className="space-y-4">
                        <BadgeStatusCard 
                            icon={ShieldCheck} 
                            title="Badge Expert" 
                            condition="1000 XP" 
                            color="text-primary" 
                            isActive={true} 
                        />
                        <BadgeStatusCard 
                            icon={Crown} 
                            title="Ambassadeur Elite" 
                            condition="50 Ventes" 
                            color="text-ndara-amber" 
                            isActive={true} 
                        />
                        <BadgeStatusCard 
                            icon={Star} 
                            title="Ndara Pionnier" 
                            condition="Profil 100%" 
                            color="text-blue-400" 
                            isActive={false} 
                        />
                    </div>

                    <div className="bg-primary/5 border border-primary/10 rounded-[2rem] p-6 text-center space-y-3">
                        <Sparkles className="h-8 w-8 text-primary mx-auto opacity-50" />
                        <p className="text-[10px] font-bold text-slate-500 uppercase leading-relaxed tracking-widest">
                            "La gamification augmente le taux de complétion des cours de 40% en moyenne."
                        </p>
                    </div>
                </aside>
            </div>
        </div>
    );
}

function XpRuleItem({ icon: Icon, label, value, color, bgColor }: any) {
    return (
        <div className="flex items-center justify-between p-4 bg-black/20 rounded-3xl border border-white/5 group hover:border-primary/20 transition-all">
            <div className="flex items-center gap-4">
                <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center transition-colors shadow-inner", bgColor, color)}>
                    <Icon size={20} />
                </div>
                <div>
                    <span className="text-sm font-bold text-slate-200 uppercase tracking-tight">{label}</span>
                    <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mt-0.5">Automatique</p>
                </div>
            </div>
            <div className="flex items-center gap-3">
                <Input type="number" defaultValue={value} className="w-20 h-10 bg-black/40 border-slate-800 text-center font-black text-white" />
                <ChevronRight className="h-4 w-4 text-slate-700" />
            </div>
        </div>
    );
}

function BadgeStatusCard({ icon: Icon, title, condition, color, isActive }: any) {
    return (
        <div className={cn(
            "bg-slate-900 border rounded-3xl p-5 flex items-center justify-between shadow-xl transition-all",
            isActive ? "border-white/5" : "border-white/5 opacity-40 grayscale"
        )}>
            <div className="flex items-center gap-4">
                <div className={cn("w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center shadow-lg", color)}>
                    <Icon size={20} />
                </div>
                <div>
                    <p className="text-sm font-black text-white uppercase tracking-tighter">{title}</p>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{condition}</p>
                </div>
            </div>
            <Switch checked={isActive} className="data-[state=checked]:bg-primary" />
        </div>
    );
}

function ShieldCheck({ className, size }: any) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>
        </svg>
    );
}

function Crown({ className, size }: any) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14"/>
        </svg>
    );
}

