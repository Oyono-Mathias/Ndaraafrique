'use client';

/**
 * @fileOverview Onglet de gestion des droits et cessions.
 * ✅ I18N : Traduction dynamique des retours serveur.
 */

import { useState, useEffect, useMemo } from 'react';
import type { Course, Settings } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ShoppingCart, CheckCircle2, Loader2, Coins, AlertCircle, ListChecks, Clock, BadgeEuro, TrendingUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRole } from '@/context/RoleContext';
import { requestCourseBuyoutAction, toggleResaleRightsAction } from '@/actions/courseActions';
import { getFirestore, collection, getDocs, doc, onSnapshot } from 'firebase/firestore';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTranslations } from 'next-intl';

export function CourseBuyoutTab({ course }: { course: Course }) {
    const { currentUser } = useRole();
    const { toast } = useToast();
    const db = getFirestore();
    const tActions = useTranslations('Actions');
    
    const [buyoutPrice, setBuyoutPrice] = useState(course.buyoutPrice || 50000);
    const [resalePrice, setResalePrice] = useState(course.resaleRightsPrice || 150000);
    const [agreed, setAgreed] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const [stats, setStats] = useState({ sections: 0, lectures: 0 });
    const [platformSettings, setPlatformSettings] = useState({ allowBuyout: true, allowResale: true });

    useEffect(() => {
        const unsub = onSnapshot(doc(db, 'settings', 'global'), (snap) => {
            if (snap.exists()) {
                const data = snap.data() as Settings;
                setPlatformSettings({
                    allowBuyout: data.marketplace?.allowCourseBuyout ?? true,
                    allowResale: data.marketplace?.allowResaleRights ?? true,
                });
            }
        });

        const checkContent = async () => {
            const sectionsSnap = await getDocs(collection(db, `courses/${course.id}/sections`));
            let lCount = 0;
            for (const sec of sectionsSnap.docs) {
                const lSnap = await getDocs(collection(db, `courses/${course.id}/sections/${sec.id}/lectures`));
                lCount += lSnap.size;
            }
            setStats({ sections: sectionsSnap.size, lectures: lCount });
        };
        
        checkContent();
        return () => unsub();
    }, [course.id, db]);

    const checklist = useMemo(() => [
        { label: "Formation publiée", valid: course.status === 'Published' },
        { label: "Consistance (2 mod / 5 leçons)", valid: stats.sections >= 2 && stats.lectures >= 5 },
        { label: "Profil complet", valid: currentUser?.isProfileComplete === true }
    ], [course.status, stats, currentUser]);

    const canAct = checklist.every(c => c.valid) && !currentUser?.buyoutSanctions?.isSanctioned;

    const handleBuyoutRequest = async () => {
        if (!currentUser || !agreed || !canAct) return;
        setIsSubmitting(true);
        const result = await requestCourseBuyoutAction({ courseId: course.id, instructorId: currentUser.uid, requestedPrice: buyoutPrice });
        if (result.success) {
            toast({ title: tActions('success.payout_requested') });
        } else {
            toast({ 
                variant: 'destructive', 
                title: tActions('error.generic'), 
                description: result.error ? tActions(result.error as any) : undefined 
            });
        }
        setIsSubmitting(false);
    };

    const handleTogglePublicResale = async (available: boolean) => {
        if (!currentUser || !canAct) return;
        setIsSubmitting(true);
        const result = await toggleResaleRightsAction({ 
            courseId: course.id, 
            price: resalePrice, 
            available, 
            userId: currentUser.uid 
        });
        if (result.success) {
            toast({ title: tActions(available ? 'success.generic' : 'success.generic') });
        } else {
            toast({ 
                variant: 'destructive', 
                title: tActions('error.generic'), 
                description: result.error ? tActions(result.error as any) : undefined 
            });
        }
        setIsSubmitting(false);
    };

    if (course.buyoutStatus === 'requested') {
        return (
            <Card className="bg-primary/5 border-primary/20 rounded-[2.5rem] p-12 text-center space-y-4">
                <Clock className="h-12 w-12 text-primary mx-auto animate-pulse" />
                <h3 className="text-xl font-bold text-white uppercase">Audit en cours</h3>
                <p className="text-slate-400">Ndara Afrique examine votre contenu pour finaliser le rachat direct.</p>
            </Card>
        );
    }

    return (
        <div className="max-w-3xl mx-auto space-y-8 pb-20">
            <Card className="bg-slate-900 border-slate-800 rounded-[2rem] overflow-hidden">
                <CardHeader className="bg-slate-800/30 p-6 border-b border-white/5">
                    <CardTitle className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-2 tracking-[0.2em]"><ListChecks className="h-4 w-4"/> Éligibilité Financière</CardTitle>
                </CardHeader>
                <CardContent className="p-6 grid sm:grid-cols-3 gap-4">
                    {checklist.map((item, i) => (
                        <div key={i} className={cn("p-4 rounded-2xl border text-center transition-all", item.valid ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-400" : "bg-red-500/5 border-red-500/20 text-red-400")}>
                            {item.valid ? <CheckCircle2 className="h-5 w-5 mx-auto mb-2"/> : <AlertCircle className="h-5 w-5 mx-auto mb-2"/>}
                            <p className="text-[9px] font-black uppercase tracking-widest">{item.label}</p>
                        </div>
                    ))}
                </CardContent>
            </Card>

            <Tabs defaultValue="public" className="w-full">
                <TabsList className="bg-slate-900 border-slate-800 p-1 rounded-2xl h-14 w-full">
                    <TabsTrigger value="public" className="flex-1 rounded-xl font-black uppercase text-[10px] tracking-widest gap-2 data-[state=active]:bg-amber-500 data-[state=active]:text-black transition-all">
                        <TrendingUp className="h-4 w-4" /> La Bourse (Marché Public)
                    </TabsTrigger>
                    <TabsTrigger value="buyout" className="flex-1 rounded-xl font-black uppercase text-[10px] tracking-widest gap-2">
                        <ShoppingCart className="h-4 w-4" /> Vente Directe (Ndara)
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="public" className="mt-6 animate-in slide-in-from-bottom-4 duration-500">
                    <Card className={cn("bg-slate-900 border-slate-800 rounded-[2.5rem] overflow-hidden shadow-2xl relative", !canAct && "opacity-40 grayscale pointer-events-none")}>
                        <div className="absolute top-0 right-0 p-6 opacity-5"><BadgeEuro size={120} /></div>
                        <CardHeader className="bg-amber-500/10 p-8 border-b border-white/5">
                            <CardTitle className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-3">
                                <BadgeEuro className="text-amber-500" /> Mise en vente publique
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-8 space-y-8">
                            <div className="space-y-4">
                                <Label className="text-[10px] font-black uppercase text-slate-500 ml-1">Prix de la Licence (XOF)</Label>
                                <Input type="number" value={resalePrice} onChange={(e) => setResalePrice(Number(e.target.value))} className="h-16 bg-slate-950 border-slate-800 rounded-xl text-3xl font-black text-white px-6" />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <button onClick={() => handleTogglePublicResale(true)} disabled={isSubmitting || course.resaleRightsAvailable} className="h-16 rounded-[1.5rem] bg-amber-500 text-black font-black uppercase text-xs tracking-widest shadow-xl">
                                    {isSubmitting ? <Loader2 className="animate-spin" /> : course.resaleRightsAvailable ? "ACTIF EN BOURSE" : "LISTER EN BOURSE"}
                                </button>
                                {course.resaleRightsAvailable && (
                                    <button onClick={() => handleTogglePublicResale(false)} className="h-16 rounded-[1.5rem] border border-slate-800 bg-slate-900 font-black uppercase text-[10px] tracking-widest text-red-400">RETIRER</button>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="buyout" className="mt-6">
                    <Card className={cn("bg-slate-900 border-slate-800 rounded-[2.5rem] overflow-hidden shadow-2xl", !canAct && "opacity-40 grayscale pointer-events-none")}>
                        <CardHeader className="bg-primary/10 p-8 border-b border-white/5"><CardTitle className="text-xl font-black text-white uppercase">Cession à Ndara Afrique</CardTitle></CardHeader>
                        <CardContent className="p-8 space-y-6">
                            <div className="space-y-4">
                                <Label className="text-[10px] font-black uppercase text-slate-500 ml-1">Prix souhaité (XOF)</Label>
                                <Input type="number" value={buyoutPrice} onChange={(e) => setBuyoutPrice(Number(e.target.value))} className="h-14 bg-slate-950 border-slate-800 rounded-xl text-2xl font-black text-white" />
                            </div>
                            <div className="flex items-start gap-3 p-5 bg-slate-950/50 rounded-2xl border border-white/5">
                                <Checkbox id="agree" checked={agreed} onCheckedChange={(v: boolean) => setAgreed(v)} className="mt-1" />
                                <Label htmlFor="agree" className="text-xs text-slate-400 leading-relaxed cursor-pointer font-medium italic">Je certifie être l'unique auteur et accepte de céder mes droits à Ndara Afrique.</Label>
                            </div>
                            <Button onClick={handleBuyoutRequest} disabled={isSubmitting || !agreed || !canAct} className="w-full h-16 rounded-[1.5rem] bg-primary text-slate-950 font-black uppercase text-xs tracking-widest shadow-xl">
                                {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : "PROPOSER LE RACHAT"}
                            </Button>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
