'use client';

/**
 * @fileOverview Centre de Marketing & Engagement Ndara Afrique.
 * Permet de piloter les campagnes de croissance et les automatisations.
 * ✅ FIX : Ajout des imports manquants (cn, Badge, Button, Table, Tabs, Card).
 */

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
    Target, 
    Mail, 
    Bell, 
    TrendingUp, 
    Plus, 
    MousePointer2, 
    Users, 
    CheckCircle2, 
    Clock, 
    ArrowUpRight,
    Zap
} from 'lucide-react';
import { StatCard } from '@/components/dashboard/StatCard';
import { cn } from '@/lib/utils';

const mockCampaigns = [
    { id: '1', name: 'Offre Spéciale Ramadan', type: 'Email', status: 'Active', sent: 1200, clicks: 450, conversions: 82 },
    { id: '2', name: 'Relance Paniers Abandonnés', type: 'Automation', status: 'Active', sent: 85, clicks: 32, conversions: 14 },
    { id: '3', name: 'Nouveau cours AI - Notification', type: 'Push', status: 'Draft', sent: 0, clicks: 0, conversions: 0 },
];

export default function AdminMarketingPage() {
    return (
        <div className="space-y-8 pb-20 animate-in fade-in duration-700">
            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
                <div>
                    <div className="flex items-center gap-2 text-primary mb-1">
                        <Target className="h-4 w-4" />
                        <span className="text-[10px] font-black uppercase tracking-[0.3em]">Growth & Engagement</span>
                    </div>
                    <h1 className="text-3xl font-black text-white uppercase tracking-tight">Marketing Automation</h1>
                    <p className="text-slate-400 text-sm font-medium mt-1">Pilotez la croissance du réseau Ndara Afrique.</p>
                </div>
                <Button className="h-12 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black uppercase text-[10px] tracking-widest shadow-xl shadow-primary/20 transition-all active:scale-95">
                    <Plus className="mr-2 h-4 w-4" /> Nouvelle Campagne
                </Button>
            </header>

            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard title="Emails Envoyés" value="12.5k" icon={Mail} isLoading={false} />
                <StatCard title="Taux de Clic" value="18.2%" icon={MousePointer2} isLoading={false} />
                <StatCard title="Conversions" value="342" icon={CheckCircle2} isLoading={false} />
                <StatCard title="Audience Totale" value="5.8k" icon={Users} isLoading={false} />
            </section>

            <Tabs defaultValue="campaigns" className="w-full">
                <TabsList className="bg-slate-900 border-slate-800 h-14 p-1 rounded-2xl w-full sm:w-auto">
                    <TabsTrigger value="campaigns" className="px-6 font-bold uppercase text-[10px] tracking-widest gap-2 h-full">
                        <Target className="h-3.5 w-3.5" /> Campagnes
                    </TabsTrigger>
                    <TabsTrigger value="automations" className="px-6 font-bold uppercase text-[10px] tracking-widest gap-2 h-full text-primary">
                        <Zap className="h-3.5 w-3.5" /> Automations
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="campaigns" className="mt-8">
                    <div className="border rounded-[2rem] bg-slate-900/50 border-slate-800 overflow-hidden shadow-2xl">
                        <Table>
                            <thead>
                                <TableRow className="border-slate-800 bg-slate-800/30">
                                    <th className="text-[10px] font-black uppercase tracking-widest py-4 text-left px-4">Nom de la Campagne</th>
                                    <th className="text-[10px] font-black uppercase tracking-widest text-left px-4">Type</th>
                                    <th className="text-[10px] font-black uppercase tracking-widest text-left px-4">Performance</th>
                                    <th className="text-[10px] font-black uppercase tracking-widest text-left px-4">Statut</th>
                                    <th className="text-right text-[10px] font-black uppercase tracking-widest pr-6">Action</th>
                                </TableRow>
                            </thead>
                            <TableBody>
                                {mockCampaigns.map(camp => (
                                    <TableRow key={camp.id} className="group border-slate-800 hover:bg-slate-800/20">
                                        <TableCell>
                                            <span className="font-bold text-sm text-white uppercase">{camp.name}</span>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="text-[9px] border-slate-700 text-slate-400">{camp.type}</Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex gap-4">
                                                <div>
                                                    <p className="text-[10px] text-slate-500 font-bold uppercase">Clics</p>
                                                    <p className="text-xs font-black text-white">{camp.clicks}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] text-slate-500 font-bold uppercase">Conv.</p>
                                                    <p className="text-xs font-black text-primary">{camp.conversions}</p>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge className={cn("text-[9px] font-black uppercase", camp.status === 'Active' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-800 text-slate-500')}>
                                                {camp.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right pr-6">
                                            <Button variant="ghost" size="sm" className="h-8 rounded-lg hover:bg-slate-800">
                                                <ArrowUpRight className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </TabsContent>

                <TabsContent value="automations" className="mt-8">
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <AutomationCard 
                            title="Bienvenue Ndara" 
                            desc="Email envoyé dès l'inscription." 
                            stats="98% envoyé" 
                        />
                        <AutomationCard 
                            title="Succès Certificat" 
                            desc="Félicitations dès la fin d'un cours." 
                            stats="100% envoyé" 
                        />
                        <AutomationCard 
                            title="Relance Wishlist" 
                            desc="Promo si un cours reste 7j en favoris." 
                            stats="Active" 
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
        <Card className={cn("bg-slate-900 border-slate-800 rounded-3xl overflow-hidden shadow-xl", isPrimary && "border-primary/20")}>
            <CardHeader className="p-6 border-b border-white/5">
                <CardTitle className="text-sm font-black text-white uppercase tracking-widest">{title}</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
                <p className="text-xs text-slate-400 leading-relaxed font-medium">{desc}</p>
                <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-[9px] uppercase font-bold text-primary border-primary/20">{stats}</Badge>
                    <Button variant="ghost" size="sm" className="text-[10px] font-black uppercase text-slate-500">Configurer</Button>
                </div>
            </CardContent>
        </Card>
    );
}
