
'use client';

/**
 * @fileOverview Centre de Gamification Ndara Afrique.
 * Branché sur la collection 'gamification_rules'.
 */

import { useState, useMemo } from 'react';
import { useCollection } from '@/firebase';
import { getFirestore, collection, query, orderBy } from 'firebase/firestore';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { 
    Trophy, 
    Medal, 
    Zap, 
    Users, 
    Plus, 
    Star, 
    Award,
    Settings,
    Sparkles,
    History
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function AdminGamificationPage() {
    const db = getFirestore();
    const rulesQuery = useMemo(() => query(collection(db, 'gamification_rules'), orderBy('updatedAt', 'desc')), [db]);
    const { data: rules, isLoading } = useCollection<any>(rulesQuery);

    return (
        <div className="space-y-8 pb-20 animate-in fade-in duration-700">
            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
                <div>
                    <div className="flex items-center gap-2 text-primary mb-1">
                        <Trophy className="h-4 w-4" />
                        <span className="text-[10px] font-black uppercase tracking-[0.3em]">Engagement & Rétention</span>
                    </div>
                    <h1 className="text-3xl font-black text-white uppercase tracking-tight">Gamification</h1>
                    <p className="text-slate-400 text-sm font-medium mt-1">Transformez l'apprentissage en aventure.</p>
                </div>
                <Button className="h-12 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black uppercase text-[10px] tracking-widest shadow-xl">
                    <Plus className="mr-2 h-4 w-4" /> Créer un Badge
                </Button>
            </header>

            <Tabs defaultValue="badges" className="w-full">
                <TabsList className="bg-slate-900 border-slate-800 h-14 p-1 rounded-2xl w-full sm:w-auto">
                    <TabsTrigger value="badges" className="px-6 font-bold uppercase text-[10px] tracking-widest gap-2 h-full">
                        <Award className="h-3.5 w-3.5" /> Badges
                    </TabsTrigger>
                    <TabsTrigger value="xp" className="px-6 font-bold uppercase text-[10px] tracking-widest gap-2 h-full">
                        <Zap className="h-3.5 w-3.5" /> Système XP
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="badges" className="mt-8">
                    {isLoading ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-48 w-full rounded-3xl bg-slate-900" />)}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            <BadgeCard name="Premier Ndara" xp={100} condition="Premier cours terminé" icon={Sparkles} />
                            <BadgeCard name="Ambassadeur Elite" xp={500} condition="20 parrainages" icon={Medal} color="text-amber-500" />
                            <BadgeCard name="Expert du Savoir" xp={1000} condition="Note moyenne > 4.8" icon={Star} color="text-blue-400" />
                            <BadgeCard name="Champion Centrafricain" xp={2000} condition="Top 1 pays" icon={Trophy} color="text-emerald-400" />
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="xp" className="mt-8">
                    <Card className="bg-slate-900 border-slate-800 rounded-[2.5rem] overflow-hidden shadow-2xl">
                        <CardHeader className="bg-slate-800/30 p-8 border-b border-white/5">
                            <CardTitle className="text-xl font-black text-white uppercase flex items-center gap-3">
                                <Settings className="text-primary"/> Règles de Gains XP
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-8 space-y-6">
                            <XpRuleItem label="Terminer une leçon" value={10} />
                            <XpRuleItem label="Finir une formation" value={100} />
                            <XpRuleItem label="Réussir un Quiz (100%)" value={50} />
                            <XpRuleItem label="Poser une question pertinente" value={5} />
                            <Button className="w-full h-14 rounded-2xl bg-primary mt-4 font-black uppercase text-xs tracking-widest shadow-xl">
                                Sauvegarder la configuration XP
                            </Button>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}

function BadgeCard({ name, xp, condition, icon: Icon, color = "text-primary" }: any) {
    return (
        <Card className="bg-slate-900 border-slate-800 rounded-3xl overflow-hidden shadow-xl group hover:border-primary/30 transition-all">
            <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
                <div className={cn("p-4 bg-slate-950 rounded-full border border-white/5 group-hover:scale-110 transition-transform shadow-2xl", color)}>
                    <Icon size={32} />
                </div>
                <div className="space-y-1">
                    <h3 className="text-sm font-black text-white uppercase tracking-tight">{name}</h3>
                    <p className="text-[10px] font-bold text-slate-500 uppercase">{condition}</p>
                </div>
                <Badge className="bg-primary/10 text-primary border-none text-[9px] font-black uppercase px-3">+{xp} XP</Badge>
            </CardContent>
        </Card>
    );
}

function XpRuleItem({ label, value }: { label: string, value: number }) {
    return (
        <div className="flex items-center justify-between p-4 bg-slate-950/50 rounded-2xl border border-white/5">
            <span className="text-sm font-bold text-slate-300">{label}</span>
            <div className="flex items-center gap-3">
                <Input type="number" defaultValue={value} className="w-20 h-10 bg-slate-900 border-slate-800 text-center font-black" />
                <span className="text-[10px] font-black uppercase text-primary tracking-widest">XP</span>
            </div>
        </div>
    );
}
