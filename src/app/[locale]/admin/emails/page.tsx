'use client';

/**
 * @fileOverview Gestionnaire d'Emails Transactionnels.
 * Pilotage des communications automatiques Ndara Afrique.
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
    Mail, 
    Eye, 
    Edit3, 
    Send, 
    Smartphone, 
    Monitor,
    CheckCircle2,
    AlertCircle,
    History
} from 'lucide-react';
import { cn } from '@/lib/utils';

const templates = [
    { id: 'welcome', name: 'Bienvenue Ndara', trigger: 'Inscription', status: 'Actif', lastMod: '12/03/24' },
    { id: 'payment', name: 'Confirmation Paiement', trigger: 'Achat réussi', status: 'Actif', lastMod: '10/03/24' },
    { id: 'cert', name: 'Délivrance Certificat', trigger: 'Cours fini (100%)', status: 'Actif', lastMod: '01/03/24' },
    { id: 'reset', name: 'Réinitialisation Password', trigger: 'Mot de passe oublié', status: 'Système', lastMod: '01/01/24' },
];

export default function AdminEmailsPage() {
    return (
        <div className="space-y-8 pb-20 animate-in fade-in duration-700">
            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
                <div>
                    <div className="flex items-center gap-2 text-primary mb-1">
                        <Mail className="h-4 w-4" />
                        <span className="text-[10px] font-black uppercase tracking-[0.3em]">Communication Systémique</span>
                    </div>
                    <h1 className="text-3xl font-black text-white uppercase tracking-tight">Emails Transactionnels</h1>
                    <p className="text-slate-400 text-sm font-medium mt-1">Gérez les messages automatiques envoyés aux Ndara.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" className="h-12 border-slate-800 bg-slate-900 font-bold uppercase text-[10px]">
                        <History className="mr-2 h-4 w-4" /> Historique Envois
                    </Button>
                </div>
            </header>

            <div className="grid lg:grid-cols-3 gap-8">
                
                {/* --- LISTE DES TEMPLATES --- */}
                <div className="lg:col-span-2">
                    <div className="border rounded-[2rem] bg-slate-900/50 border-slate-800 overflow-hidden shadow-2xl">
                        <Table>
                            <TableHeader>
                                <TableRow className="border-slate-800 bg-slate-800/30">
                                    <TableHead className="text-[10px] font-black uppercase tracking-widest py-4">Nom du Modèle</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase tracking-widest">Déclencheur</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase tracking-widest">Statut</TableHead>
                                    <TableHead className="text-right text-[10px] font-black uppercase tracking-widest pr-6">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {templates.map(t => (
                                    <TableRow key={t.id} className="group border-slate-800 hover:bg-slate-800/20">
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-bold text-sm text-white uppercase">{t.name}</span>
                                                <span className="text-[9px] text-slate-500 font-bold uppercase">MAJ le {t.lastMod}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <span className="text-xs text-slate-400 font-medium italic">{t.trigger}</span>
                                        </TableCell>
                                        <TableCell>
                                            <Badge className={cn("text-[9px] font-black uppercase", t.status === 'Actif' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-800 text-slate-500')}>
                                                {t.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right pr-6">
                                            <div className="flex justify-end gap-2">
                                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-slate-800"><Eye className="h-4 w-4" /></Button>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-slate-800"><Edit3 className="h-4 w-4" /></Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </div>

                {/* --- APERÇU RAPIDE --- */}
                <Card className="bg-slate-900 border-slate-800 rounded-[2.5rem] overflow-hidden flex flex-col h-fit sticky top-24">
                    <CardHeader className="bg-slate-800/30 p-6 border-b border-white/5">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-xs font-black uppercase text-slate-400 tracking-widest">Prévisualisation</CardTitle>
                            <div className="flex gap-1">
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-primary"><Smartphone size={14}/></Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-600"><Monitor size={14}/></Button>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0 aspect-[3/4] bg-slate-950 flex items-center justify-center relative group">
                        <div className="text-center space-y-4 opacity-20 group-hover:opacity-40 transition-opacity">
                            <Mail size={48} className="mx-auto" />
                            <p className="text-[10px] font-black uppercase tracking-[0.2em]">Sélectionnez un modèle</p>
                        </div>
                        <Button className="absolute bottom-6 left-1/2 -translate-x-1/2 h-10 px-6 rounded-xl bg-slate-800 text-[10px] font-black uppercase tracking-widest gap-2 opacity-0 group-hover:opacity-100 transition-all">
                            <Send size={14} /> Envoyer un test
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
