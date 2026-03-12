'use client';

/**
 * @fileOverview Centre SEO Ndara Afrique.
 * Pilotage de la visibilité sur Google et les réseaux sociaux.
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
    Globe, 
    Search, 
    Share2, 
    Image as ImageIcon, 
    CheckCircle2, 
    Loader2, 
    RefreshCw,
    Link as LinkIcon
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function AdminSeoPage() {
    const { toast } = useToast();
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = () => {
        setIsSaving(true);
        setTimeout(() => {
            setIsSaving(false);
            toast({ title: "SEO Mis à jour !", description: "Le sitemap sera régénéré sous 24h." });
        }, 1500);
    };

    return (
        <div className="space-y-8 pb-20 animate-in fade-in duration-700">
            <header>
                <div className="flex items-center gap-2 text-primary mb-1">
                    <Globe className="h-4 w-4" />
                    <span className="text-[10px] font-black uppercase tracking-[0.3em]">Souveraineté Digitale</span>
                </div>
                <h1 className="text-3xl font-black text-white uppercase tracking-tight">Indexation & SEO</h1>
                <p className="text-slate-400 text-sm font-medium mt-1">Contrôlez l'image de Ndara Afrique sur le web mondial.</p>
            </header>

            <div className="grid lg:grid-cols-2 gap-8">
                
                {/* --- META TAGS GLOBAUX --- */}
                <Card className="bg-slate-900 border-slate-800 rounded-[2.5rem] overflow-hidden shadow-2xl">
                    <CardHeader className="bg-slate-800/30 p-8 border-b border-white/5">
                        <CardTitle className="text-lg font-black text-white uppercase flex items-center gap-3">
                            <Search className="text-primary"/> Référencement Google
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-8 space-y-6">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-slate-500 ml-1">Titre de l'accueil (Meta Title)</Label>
                            <Input defaultValue="Ndara Afrique - L'excellence panafricaine par le savoir" className="h-12 bg-slate-950 border-slate-800" />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-slate-500 ml-1">Description (Meta Description)</Label>
                            <Textarea rows={4} defaultValue="Rejoignez la plus grande plateforme d'e-learning africaine. Apprenez avec des experts locaux et monétisez votre savoir." className="bg-slate-950 border-slate-800" />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-slate-500 ml-1">Mots-clés (Keywords)</Label>
                            <Input defaultValue="elearning, afrique, formation, fintech, agritech" className="h-12 bg-slate-950 border-slate-800" />
                        </div>
                    </CardContent>
                </Card>

                {/* --- OPEN GRAPH & SOCIAL --- */}
                <div className="space-y-6">
                    <Card className="bg-slate-900 border-slate-800 rounded-[2.5rem] overflow-hidden shadow-xl">
                        <CardHeader className="bg-primary/5 p-8 border-b border-white/5">
                            <CardTitle className="text-lg font-black text-white uppercase flex items-center gap-3">
                                <Share2 className="text-primary"/> Image de partage Social
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-8 space-y-6">
                            <div className="w-full aspect-[1.91/1] bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden relative group">
                                <div className="absolute inset-0 flex items-center justify-center opacity-20 group-hover:opacity-40 transition-opacity">
                                    <ImageIcon size={40} />
                                </div>
                                <Button variant="outline" className="absolute bottom-4 right-4 h-10 bg-slate-900 border-slate-800 text-[10px] font-black uppercase">Changer l'image</Button>
                            </div>
                            <p className="text-[10px] text-slate-500 font-bold uppercase leading-relaxed italic">
                                Cette image (1200x630) s'affichera lors du partage de Ndara sur WhatsApp, Facebook et X.
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="bg-slate-900 border-slate-800 rounded-[2.5rem] p-8 space-y-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <LinkIcon className="text-primary h-5 w-5" />
                                <span className="font-black text-white uppercase text-sm">Sitemap XML</span>
                            </div>
                            <Button variant="outline" size="sm" className="h-9 border-slate-800 bg-slate-950 text-[10px] font-black uppercase">
                                <RefreshCw className="mr-2 h-3.5 w-3.5" /> Régénérer
                            </Button>
                        </div>
                        <div className="p-4 bg-slate-950 rounded-xl border border-white/5 flex items-center justify-between">
                            <code className="text-xs text-slate-500">/sitemap.xml</code>
                            <Badge className="bg-emerald-500/10 text-emerald-500 border-none font-black text-[8px] uppercase">Dernier passage: 2h</Badge>
                        </div>
                    </Card>
                </div>
            </div>

            <div className="flex justify-end pt-4">
                <Button onClick={handleSave} disabled={isSaving} className="h-16 px-12 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black uppercase text-xs tracking-widest shadow-xl shadow-primary/30">
                    {isSaving ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <CheckCircle2 className="mr-2 h-5 w-5" />}
                    Valider la Stratégie SEO
                </Button>
            </div>
        </div>
    );
}
