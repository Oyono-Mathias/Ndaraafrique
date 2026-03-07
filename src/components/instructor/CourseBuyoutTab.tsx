'use client';

/**
 * @fileOverview Onglet de gestion des droits et cessions.
 * Permet de vendre à Ndara OU de mettre en vente sur le Marché Secondaire.
 */

import { useState, useEffect, useMemo } from 'react';
import type { Course, Settings } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ShoppingCart, CheckCircle2, Loader2, Coins, AlertCircle, ListChecks, Ban, Clock, BadgeEuro, ArrowLeftRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRole } from '@/context/RoleContext';
import { requestCourseBuyoutAction, toggleResaleRightsAction } from '@/actions/courseActions';
import { getFirestore, collection, getDocs, doc, onSnapshot } from 'firebase/firestore';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export function CourseBuyoutTab({ course }: { course: Course }) {
    const { currentUser } = useRole();
    const { toast } = useToast();
    const db = getFirestore();
    
    const [buyoutPrice, setBuyoutPrice] = useState(course.buyoutPrice || 50000);
    const [resalePrice, setResalePrice] = useState(course.resaleRightsPrice || 150000);
    const [agreed, setAgreed] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const [stats, setStats] = useState({ sections: 0, lectures: 0 });
    const [isValidating, setIsValidating] = useState(true);
    const [platformSettings, setPlatformSettings] = useState({
        allowBuyout: true,
        allowResale: true,
        allowTeacherToTeacher: false
    });

    useEffect(() => {
        const unsub = onSnapshot(doc(db, 'settings', 'global'), (snap) => {
            if (snap.exists()) {
                const data = snap.data() as Settings;
                setPlatformSettings({
                    allowBuyout: data.platform?.allowCourseBuyout ?? true,
                    allowResale: data.platform?.allowResaleRights ?? true,
                    allowTeacherToTeacher: data.platform?.allowTeacherToTeacherResale ?? false
                });
            }
        });

        const checkContent = async () => {
            try {
                const sectionsSnap = await getDocs(collection(db, `courses/${course.id}/sections`));
                let lCount = 0;
                for (const sec of sectionsSnap.docs) {
                    const lSnap = await getDocs(collection(db, `courses/${course.id}/sections/${sec.id}/lectures`));
                    lCount += lSnap.size;
                }
                setStats({ sections: sectionsSnap.size, lectures: lCount });
            } finally { setIsValidating(false); }
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
        if (result.success) toast({ title: "Demande transmise !" });
        else toast({ variant: 'destructive', title: "Erreur", description: result.error });
        setIsSubmitting(false);
    };

    const handleTogglePublicResale = async (available: boolean) => {
        if (!currentUser || !canAct) return;
        setIsSubmitting(true);
        const result = await toggleResaleRightsAction({ courseId: course.id, price: resalePrice, available, userId: currentUser.uid });
        if (result.success) toast({ title: available ? "Licence mise en vente !" : "Vente de licence annulée" });
        else toast({ variant: 'destructive', title: "Erreur", description: result.error });
        setIsSubmitting(false);
    };

    if (course.buyoutStatus === 'requested') {
        return (
            <Card className="bg-primary/5 border-primary/20 rounded-[2.5rem] p-12 text-center space-y-4">
                <Clock className="h-12 w-12 text-primary mx-auto animate-pulse" />
                <h3 className="text-xl font-bold text-white uppercase">Audit en cours</h3>
                <p className="text-slate-400">Ndara Afrique examine votre contenu pour finaliser le rachat.</p>
            </Card>
        );
    }

    return (
        <div className="max-w-3xl mx-auto space-y-8 pb-20">
            <Card className="bg-slate-900 border-slate-800 rounded-[2rem] overflow-hidden">
                <CardHeader className="bg-slate-800/30 p-6 border-b border-white/5">
                    <CardTitle className="text-sm font-black uppercase text-slate-400 flex items-center gap-2"><ListChecks className="h-4 w-4"/> Critères d'éligibilité</CardTitle>
                </CardHeader>
                <CardContent className="p-6 grid sm:grid-cols-3 gap-4">
                    {checklist.map((item, i) => (
                        <div key={i} className={cn("p-3 rounded-xl border text-center", item.valid ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-400" : "bg-red-500/5 border-red-500/20 text-red-400")}>
                            {item.valid ? <CheckCircle2 className="h-4 w-4 mx-auto mb-1"/> : <AlertCircle className="h-4 w-4 mx-auto mb-1"/>}
                            <p className="text-[10px] font-bold uppercase">{item.label}</p>
                        </div>
                    ))}
                </CardContent>
            </Card>

            <Tabs defaultValue="buyout" className="w-full">
                <TabsList className="bg-slate-900 border-slate-800 p-1 rounded-2xl h-14 w-full">
                    <TabsTrigger value="buyout" className="flex-1 rounded-xl font-bold uppercase text-[10px] gap-2">
                        <ShoppingCart className="h-4 w-4" /> Vendre à Ndara
                    </TabsTrigger>
                    {platformSettings.allowTeacherToTeacher && (
                        <TabsTrigger value="public" className="flex-1 rounded-xl font-bold uppercase text-[10px] gap-2">
                            <BadgeEuro className="h-4 w-4" /> Marché Secondaire
                        </TabsTrigger>
                    )}
                </TabsList>

                <TabsContent value="buyout" className="mt-6">
                    <Card className={cn("bg-slate-900 border-slate-800 rounded-[2.5rem] overflow-hidden", !canAct && "opacity-40 grayscale pointer-events-none")}>
                        <CardHeader className="bg-primary/10 p-8 border-b border-white/5"><CardTitle className="text-xl font-black text-white uppercase">Cession à la Plateforme</CardTitle></CardHeader>
                        <CardContent className="p-8 space-y-6">
                            <div className="space-y-4">
                                <Label className="text-[10px] font-black uppercase text-slate-500 ml-1">Prix de rachat souhaité (XOF)</Label>
                                <Input type="number" value={buyoutPrice} onChange={(e) => setBuyoutPrice(Number(e.target.value))} className="h-14 bg-slate-950 border-slate-800 rounded-xl text-2xl font-black" />
                            </div>
                            <div className="flex items-start gap-3 p-4 bg-slate-950/50 rounded-2xl border border-white/5">
                                <Checkbox id="agree" checked={agreed} onCheckedChange={(v) => setAgreed(!!v)} />
                                <Label htmlFor="agree" className="text-xs text-slate-400 leading-relaxed cursor-pointer">Je cède mes droits à Ndara Afrique et m'engage à ne plus exploiter ce contenu ailleurs.</Label>
                            </div>
                            <Button onClick={handleBuyoutRequest} disabled={isSubmitting || !agreed || !canAct} className="w-full h-16 rounded-2xl bg-primary text-white font-black uppercase text-xs tracking-widest shadow-xl shadow-primary/30">
                                {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : "Envoyer l'offre à Ndara"}
                            </Button>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="public" className="mt-6">
                    <Card className={cn("bg-slate-900 border-slate-800 rounded-[2.5rem] overflow-hidden", !canAct && "opacity-40 grayscale pointer-events-none")}>
                        <CardHeader className="bg-amber-500/10 p-8 border-b border-white/5"><CardTitle className="text-xl font-black text-white uppercase">Vente de Licence au Public</CardTitle></CardHeader>
                        <CardContent className="p-8 space-y-6">
                            <p className="text-sm text-slate-400 leading-relaxed">Proposez votre licence de revente directement aux investisseurs et aux autres Ndara. Vous recevrez le paiement dès qu'un acheteur finalise la transaction.</p>
                            <div className="space-y-4">
                                <Label className="text-[10px] font-black uppercase text-slate-500 ml-1">Prix de la Licence (XOF)</Label>
                                <Input type="number" value={resalePrice} onChange={(e) => setResalePrice(Number(e.target.value))} className="h-14 bg-slate-950 border-slate-800 rounded-xl text-2xl font-black" />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <Button onClick={() => handleTogglePublicResale(true)} disabled={isSubmitting || course.resaleRightsAvailable} className="h-14 rounded-2xl bg-amber-500 text-black font-black uppercase text-[10px] tracking-widest">
                                    {course.resaleRightsAvailable ? "Déjà en vente" : "Mettre en vente"}
                                </Button>
                                {course.resaleRightsAvailable && (
                                    <Button onClick={() => handleTogglePublicResale(false)} variant="outline" className="h-14 rounded-2xl border-slate-800 font-black uppercase text-[10px] tracking-widest text-red-400">Retirer du marché</Button>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
