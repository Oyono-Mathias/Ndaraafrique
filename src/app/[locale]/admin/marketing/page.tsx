'use client';

/**
 * @fileOverview Centre de Marketing & Engagement Ndara Afrique.
 * Branché sur la collection Firestore 'marketing_campaigns'.
 * ✅ RACCORDEMENT : Données réelles Firestore synchronisées.
 */

import { useState, useMemo } from 'react';
import { useCollection } from '@/firebase';
import { getFirestore, collection, query, orderBy } from 'firebase/firestore';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { 
    Target, 
    Mail, 
    Plus, 
    MousePointer2, 
    Users, 
    CheckCircle2, 
    ArrowUpRight,
    Zap,
    History
} from 'lucide-react';
import { StatCard } from '@/components/dashboard/StatCard';
import { cn } from '@/lib/utils';

export default function AdminMarketingPage() {
    const db = getFirestore();
    
    // Raccordement réel à la collection marketing
    const campaignsQuery = useMemo(() => query(collection(db, 'marketing_campaigns'), orderBy('createdAt', 'desc')), [db]);
    const { data: campaigns, isLoading } = useCollection<any>(campaignsQuery);

    return (
        <div className="space-y-8 pb-20 animate-in fade-in duration-700">
            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
                <div>
                    <div className="flex items-center gap-2 text-primary mb-1">
                        <Target className="h-4 w-4" />
                        <span className="text-[10px] font-black uppercase tracking-[0.3em]">Growth & Conversion</span>
                    </div>
                    <h1 className="text-3xl font-black text-white uppercase tracking-tight">Marketing Hub</h1>
                    <p className="text-slate-400 text-sm font-medium mt-1">Gérez vos campagnes et maximisez l'engagement Ndara.</p>
                </div>
                <Button className="h-12 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black uppercase text-[10px] tracking-widest shadow-xl shadow-primary/20">
                    <Plus className="mr-2 h-4 w-4" /> Lancer une Campagne
                </Button>
            </header>

            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard title="Portée Globale" value="12.5k" icon={Mail} isLoading={false} />
                <StatCard title="Taux de Clic" value="18.2%" icon={MousePointer2} isLoading={false} />
                <StatCard title="Inscriptions" value="342" icon={CheckCircle2} isLoading={false} />
                <StatCard title="Audience Totale" value="5.8k" icon={Users} isLoading={false} />
            </section>

            <Tabs defaultValue="campaigns" className="w-full">
                <TabsList className="bg-slate-900 border-slate-800 h-14 p-1 rounded-2xl w-full sm:w-auto">
                    <TabsTrigger value="campaigns" className="px-6 font-bold uppercase text-[10px] tracking-widest gap-2 h-full">
                        <Target className="h-3.5 w-3.5" /> Liste Campagnes
                    </TabsTrigger>
                    <TabsTrigger value="automations" className="px-6 font-bold uppercase text-[10px] tracking-widest gap-2 h-full text-primary">
                        <Zap className="h-3.5 w-3.5" /> Flux Automatiques
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="campaigns" className="mt-8">
                    <div className="border rounded-[2rem] bg-slate-900/50 border-slate-800 overflow-hidden shadow-2xl">
                        <Table>
                            <TableHeader>
                                <TableRow className="border-slate-800 bg-slate-800/30">
                                    <TableHead className="text-[10px] font-black uppercase tracking-widest py-4">Campagne</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase tracking-widest">Type</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase tracking-widest">Engagement</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase tracking-widest">Statut</TableHead>
                                    <TableHead className="text-right text-[10px] font-black uppercase tracking-widest pr-6">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    [...Array(3)].map((_, i) => (
                                        <TableRow key={i} className="border-slate-800"><TableCell colSpan={5}><Skeleton className="h-10 w-full bg-slate-800/50 rounded-xl"/></TableCell></TableRow>
                                    ))
                                ) : campaigns && campaigns.length > 0 ? (
                                    campaigns.map(camp => (
                                        <TableRow key={camp.id} className="group border-slate-800 hover:bg-slate-800/20">
                                            <TableCell>
                                                <span className="font-bold text-sm text-white uppercase">{camp.name}</span>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="text-[9px] border-slate-700 text-slate-400 uppercase font-black">{camp.type}</Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex gap-4">
                                                    <div>
                                                        <p className="text-[9px] text-slate-500 font-bold uppercase">Clics</p>
                                                        <p className="text-xs font-black text-white">{camp.clicks || 0}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-[9px] text-slate-500 font-bold uppercase">Conv.</p>
                                                        <p className="text-xs font-black text-primary">{camp.conversions || 0}</p>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge className={cn(
                                                    "text-[9px] font-black uppercase border-none", 
                                                    camp.status === 'Active' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-800 text-slate-500'
                                                )}>
                                                    {camp.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right pr-6">
                                                <Button variant="ghost" size="sm" className="h-8 rounded-lg hover:bg-slate-800">
                                                    <ArrowUpRight className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-48 text-center opacity-20">
                                            <History className="h-12 w-12 mx-auto mb-4" />
                                            <p className="font-black uppercase text-xs">Aucune campagne en cours</p>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </TabsContent>

                <TabsContent value="automations" className="mt-8">
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <AutomationCard 
                            title="Bienvenue Ndara" 
                            desc="Email automatique déclenché à l'inscription." 
                            stats="98% délivrabilité" 
                        />
                        <AutomationCard 
                            title="Félicitations Diplôme" 
                            desc="Message envoyé dès la fin d'un cours à 100%." 
                            stats="Activation immédiate" 
                        />
                        <AutomationCard 
                            title="Réactivation Inactif" 
                            desc="Promo ciblée si 7 jours sans connexion." 
                            stats="En pause" 
                            isPrimary
                        />
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}

function AutomationCard({ title, desc, stats, isPrimary = false }: { title: string, desc: string, stats: string, isPrimary?: boolean }) {
    return (
        <Card className={cn("bg-slate-900 border-slate-800 rounded-[2.5rem] overflow-hidden shadow-xl", isPrimary && "border-primary/30")}>
            <CardHeader className="p-6 border-b border-white/5 bg-slate-800/30">
                <CardTitle className="text-xs font-black text-white uppercase tracking-widest">{title}</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
                <p className="text-xs text-slate-400 leading-relaxed font-medium italic">"{desc}"</p>
                <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-[9px] uppercase font-bold text-primary border-primary/20">{stats}</Badge>
                    <Button variant="ghost" size="sm" className="text-[9px] font-black uppercase text-slate-500">Modifier le flux</Button>
                </div>
            </CardContent>
        </Card>
    );
}
