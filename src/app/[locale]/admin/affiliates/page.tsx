
'use client';

/**
 * @fileOverview Cockpit des Ambassadeurs Ndara Afrique.
 * Branché sur les données réelles Firestore des utilisateurs et transactions.
 */

import { useState, useMemo } from 'react';
import { useCollection } from '@/firebase';
import { getFirestore, collection, query, where, orderBy } from 'firebase/firestore';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { 
    Users2, 
    ShoppingCart, 
    Landmark, 
    Plus,
    Search,
    ChevronRight,
    BadgeEuro,
    Settings,
    ShieldCheck,
    MousePointer2
} from 'lucide-react';
import { StatCard } from '@/components/dashboard/StatCard';
import { cn } from '@/lib/utils';

export default function AdminAffiliatesPage() {
    const db = getFirestore();
    const [searchTerm, setSearchTerm] = useState('');

    // Récupérer les utilisateurs ayant généré des clics ou des ventes (Ambassadeurs)
    const affiliatesQuery = useMemo(() => query(
        collection(db, 'users'), 
        where('affiliateStats.clicks', '>', 0)
    ), [db]);
    
    const { data: rawAffiliates, isLoading } = useCollection<any>(affiliatesQuery);

    const filteredAffiliates = useMemo(() => {
        if (!rawAffiliates) return [];
        return rawAffiliates.filter(aff => 
            aff.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            aff.email?.toLowerCase().includes(searchTerm.toLowerCase())
        ).sort((a, b) => (b.affiliateStats?.sales || 0) - (a.affiliateStats?.sales || 0));
    }, [rawAffiliates, searchTerm]);

    const globalStats = useMemo(() => {
        if (!rawAffiliates) return { total: 0, sales: 0, earnings: 0, clicks: 0 };
        return rawAffiliates.reduce((acc, aff) => ({
            total: acc.total + 1,
            sales: acc.sales + (aff.affiliateStats?.sales || 0),
            earnings: acc.earnings + (aff.affiliateStats?.earnings || 0),
            clicks: acc.clicks + (aff.affiliateStats?.clicks || 0)
        }), { total: 0, sales: 0, earnings: 0, clicks: 0 });
    }, [rawAffiliates]);

    return (
        <div className="space-y-8 pb-20 animate-in fade-in duration-700">
            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
                <div>
                    <div className="flex items-center gap-2 text-primary mb-1">
                        <Users2 className="h-4 w-4" />
                        <span className="text-[10px] font-black uppercase tracking-[0.3em]">Réseau de Croissance</span>
                    </div>
                    <h1 className="text-3xl font-black text-white uppercase tracking-tight">Gestion des Ambassadeurs</h1>
                    <p className="text-slate-400 text-sm font-medium mt-1">Supervisez le programme d'affiliation Ndara Afrique.</p>
                </div>
                <Button className="h-12 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black uppercase text-[10px] tracking-widest shadow-xl">
                    <Plus className="mr-2 h-4 w-4" /> Nouvel Accord
                </Button>
            </header>

            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard title="Total Ambassadeurs" value={globalStats.total.toString()} icon={Users2} isLoading={isLoading} />
                <StatCard title="Ventes Réseau" value={globalStats.sales.toString()} icon={ShoppingCart} isLoading={isLoading} />
                <StatCard title="Commissions Totales" value={`${globalStats.earnings.toLocaleString('fr-FR')} XOF`} icon={Landmark} isLoading={isLoading} />
                <StatCard title="Portée (Clics)" value={globalStats.clicks.toLocaleString('fr-FR')} icon={MousePointer2} isLoading={isLoading} />
            </section>

            <Tabs defaultValue="list" className="w-full">
                <TabsList className="bg-slate-900 border-slate-800 h-14 p-1 rounded-2xl w-full sm:w-auto">
                    <TabsTrigger value="list" className="px-6 font-bold uppercase text-[10px] tracking-widest gap-2 h-full">
                        <Users2 className="h-3.5 w-3.5" /> Annuaire Ambassadeurs
                    </TabsTrigger>
                    <TabsTrigger value="settings" className="px-6 font-bold uppercase text-[10px] tracking-widest gap-2 h-full text-primary">
                        <Settings className="h-3.5 w-3.5" /> Règles & Bonus
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="list" className="mt-8 space-y-6">
                    <div className="relative max-w-sm">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                        <Input 
                            placeholder="Rechercher un ambassadeur..." 
                            className="h-12 pl-12 bg-slate-900 border-slate-800 rounded-xl"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className="border rounded-[2rem] bg-slate-900/50 border-slate-800 overflow-hidden shadow-2xl">
                        <Table>
                            <TableHeader>
                                <TableRow className="border-slate-800 bg-slate-800/30">
                                    <TableHead className="text-[10px] font-black uppercase tracking-widest py-4">Ambassadeur</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase tracking-widest">Performances</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-right">Gains Générés</TableHead>
                                    <TableHead className="text-right text-[10px] font-black uppercase tracking-widest pr-6">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    [...Array(3)].map((_, i) => (
                                        <TableRow key={i} className="border-slate-800"><TableCell colSpan={4}><Skeleton className="h-10 w-full bg-slate-800/50 rounded-xl"/></TableCell></TableRow>
                                    ))
                                ) : filteredAffiliates.length > 0 ? (
                                    filteredAffiliates.map(aff => (
                                        <TableRow key={aff.uid} className="group border-slate-800 hover:bg-slate-800/20">
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <Avatar className="h-10 w-10 border border-slate-700 shadow-lg">
                                                        <AvatarImage src={aff.profilePictureURL} className="object-cover" />
                                                        <AvatarFallback className="bg-slate-800 text-[10px] font-black">{aff.fullName?.charAt(0)}</AvatarFallback>
                                                    </Avatar>
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-sm text-white uppercase">{aff.fullName}</span>
                                                        <span className="text-[9px] text-slate-500 font-bold">{aff.email}</span>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex gap-4">
                                                    <div>
                                                        <p className="text-[10px] text-slate-500 font-bold uppercase">Clics</p>
                                                        <p className="text-xs font-black text-white">{aff.affiliateStats?.clicks || 0}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] text-slate-500 font-bold uppercase">Ventes</p>
                                                        <p className="text-xs font-black text-primary">{aff.affiliateStats?.sales || 0}</p>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-black text-white">{(aff.affiliateStats?.earnings || 0).toLocaleString('fr-FR')} XOF</span>
                                                    <span className="text-[9px] font-bold text-emerald-500 uppercase">Solde: {(aff.affiliateBalance || 0).toLocaleString('fr-FR')} XOF</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right pr-6">
                                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-slate-800"><ChevronRight className="h-4 w-4" /></Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={4} className="h-48 text-center opacity-20">
                                            <BadgeEuro className="h-12 w-12 mx-auto mb-4" />
                                            <p className="font-black uppercase text-xs">Aucun ambassadeur actif</p>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </TabsContent>

                <TabsContent value="settings" className="mt-8">
                    <div className="grid md:grid-cols-2 gap-8">
                        <Card className="bg-slate-900 border-slate-800 rounded-[2.5rem] overflow-hidden shadow-2xl">
                            <CardHeader className="bg-slate-800/30 p-8 border-b border-white/5">
                                <CardTitle className="text-lg font-black text-white uppercase flex items-center gap-3">
                                    <BadgeEuro className="text-primary"/> Configuration Commission
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-8 space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Commission de base (%)</label>
                                    <Input type="number" defaultValue={10} className="h-12 bg-slate-950 border-slate-800 font-black text-xl text-primary" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Durée du Cookie (Jours)</label>
                                    <Input type="number" defaultValue={30} className="h-12 bg-slate-950 border-slate-800" />
                                </div>
                                <Button className="w-full h-14 rounded-2xl bg-primary font-black uppercase text-xs">Mettre à jour les règles</Button>
                            </CardContent>
                        </Card>

                        <Card className="bg-slate-900 border-slate-800 rounded-[2.5rem] overflow-hidden shadow-2xl">
                            <CardHeader className="bg-emerald-500/5 p-8 border-b border-white/5">
                                <CardTitle className="text-lg font-black text-white uppercase flex items-center gap-3">
                                    <ShieldCheck className="text-emerald-500"/> Sécurisation Réseau
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-8 space-y-6">
                                <p className="text-sm text-slate-400 leading-relaxed font-medium italic">
                                    "Les commissions sont gelées pendant 14 jours par défaut pour prévenir la fraude et les remboursements."
                                </p>
                                <div className="p-4 bg-slate-950 rounded-2xl border border-white/5 flex items-center justify-between">
                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Délai de libération</span>
                                    <span className="font-bold text-white uppercase text-xs">14 Jours</span>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
