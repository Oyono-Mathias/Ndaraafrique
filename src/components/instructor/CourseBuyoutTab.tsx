'use client';

/**
 * @fileOverview Onglet de cession de cours avec vérification des conditions CEO.
 * ✅ CONDITIONS : Min 2 sections, 5 leçons, Statut 'Published', Profil complet, Pas de sanctions.
 * ✅ NOUVEAU : Respecte le bouton d'activation global de l'admin.
 */

import { useState, useEffect, useMemo } from 'react';
import { Course, Section, Lecture, Settings } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ShoppingCart, ShieldAlert, CheckCircle2, Loader2, Coins, AlertCircle, ListChecks, Info, Ban } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRole } from '@/context/RoleContext';
import { requestCourseBuyoutAction } from '@/actions/courseActions';
import { getFirestore, collection, query, getDocs, doc, onSnapshot } from 'firebase/firestore';
import { cn } from '@/lib/utils';

export function CourseBuyoutTab({ course }: { course: Course }) {
    const { currentUser } = useRole();
    const { toast } = useToast();
    const db = getFirestore();
    
    const [price, setPrice] = useState(course.buyoutPrice || 50000);
    const [agreed, setAgreed] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const [stats, setStats] = useState({ sections: 0, lectures: 0 });
    const [isValidating, setIsValidating] = useState(true);
    const [isBuyoutEnabled, setIsBuyoutEnabled] = useState(true);

    useEffect(() => {
        // 1. Écouter les réglages plateforme pour savoir si le rachat est activé
        const unsubSettings = onSnapshot(doc(db, 'settings', 'global'), (snap) => {
            if (snap.exists()) {
                const data = snap.data() as Settings;
                setIsBuyoutEnabled(data.platform?.allowCourseBuyout ?? true);
            }
        });

        // 2. Vérifier le contenu du cours
        const checkContent = async () => {
            setIsValidating(true);
            try {
                const sectionsSnap = await getDocs(collection(db, `courses/${course.id}/sections`));
                let lectureCount = 0;
                
                for (const secDoc of sectionsSnap.docs) {
                    const lecturesSnap = await getDocs(collection(db, `courses/${course.id}/sections/${secDoc.id}/lectures`));
                    lectureCount += lecturesSnap.size;
                }
                
                setStats({ sections: sectionsSnap.size, lectures: lectureCount });
            } catch (e) {
                console.error("Check content error:", e);
            } finally {
                setIsValidating(false);
            }
        };
        
        checkContent();
        return () => unsubSettings();
    }, [course.id, db]);

    const isRequested = course.buyoutStatus === 'requested';

    const checklist = useMemo(() => [
        { 
            label: "Formation publiée officiellement", 
            valid: course.status === 'Published',
            desc: "Seuls les cours en ligne peuvent être rachetés."
        },
        { 
            label: "Volume de contenu suffisant", 
            valid: stats.sections >= 2 && stats.lectures >= 5,
            desc: `Minimum 2 sections et 5 leçons (${stats.sections}/${stats.lectures} actuels).`
        },
        { 
            label: "Profil formateur complet", 
            valid: currentUser?.isProfileComplete === true,
            desc: "Identité vérifiée requise pour la transaction."
        },
        { 
            label: "Absence de litiges passés", 
            valid: !currentUser?.buyoutSanctions?.isSanctioned,
            desc: "Votre historique de rachat doit être vierge."
        }
    ], [course.status, stats, currentUser]);

    const canSell = checklist.every(c => c.valid) && isBuyoutEnabled;

    const handleRequest = async () => {
        if (!currentUser || !agreed || !canSell) return;
        setIsSubmitting(true);
        
        try {
            const result = await requestCourseBuyoutAction({
                courseId: course.id,
                instructorId: currentUser.uid,
                requestedPrice: price
            });

            if (result.success) {
                toast({ title: "Demande de rachat transmise", description: "L'équipe Finance va analyser votre dossier." });
            } else {
                toast({ variant: 'destructive', title: "Échec", description: result.error });
            }
        } catch (e) {
            toast({ variant: 'destructive', title: "Erreur technique" });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isRequested) {
        return (
            <Card className="bg-primary/5 border-primary/20 rounded-[2.5rem] p-12 text-center space-y-6 animate-in zoom-in duration-700">
                <div className="p-4 bg-primary/10 rounded-full inline-block animate-pulse">
                    <ClockIcon className="h-12 w-12 text-primary" />
                </div>
                <h3 className="text-2xl font-black text-white uppercase tracking-tight">Négociation en cours</h3>
                <p className="text-slate-400 max-w-md mx-auto leading-relaxed font-medium">
                    Votre offre de <span className="text-white font-bold">{course.buyoutPrice?.toLocaleString('fr-FR')} XOF</span> est en cours d'audit. <br/>
                    Nous vérifions l'originalité de vos sources et la qualité pédagogique.
                </p>
            </Card>
        );
    }

    if (!isBuyoutEnabled) {
        return (
            <Card className="bg-slate-900 border-slate-800 rounded-[2.5rem] p-12 text-center space-y-6 animate-in fade-in duration-700">
                <div className="p-4 bg-slate-800 rounded-full inline-block">
                    <Ban className="h-12 w-12 text-slate-500" />
                </div>
                <h3 className="text-2xl font-black text-white uppercase tracking-tight">Programme Suspendu</h3>
                <p className="text-slate-400 max-w-md mx-auto leading-relaxed font-medium">
                    L'option de rachat direct de formations est actuellement désactivée par l'administration. 
                    Vous recevrez une notification dès que les acquisitions reprendront.
                </p>
            </Card>
        );
    }

    return (
        <div className="max-w-2xl mx-auto space-y-8 pb-20">
            <Card className="bg-slate-900 border-slate-800 rounded-[2.5rem] overflow-hidden shadow-2xl">
                <CardHeader className="bg-slate-800/30 p-8 border-b border-white/5">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-slate-800 rounded-2xl text-slate-400">
                            <ListChecks className="h-6 w-6" />
                        </div>
                        <div>
                            <CardTitle className="text-xl font-bold text-white uppercase tracking-tight">Éligibilité au rachat</CardTitle>
                            <CardDescription className="text-slate-500">Conditions impératives pour céder votre formation.</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-8 space-y-4">
                    {isValidating ? (
                        <div className="space-y-3">
                            {[...Array(4)].map((_, i) => <div key={i} className="h-12 w-full bg-slate-800/50 rounded-xl animate-pulse" />)}
                        </div>
                    ) : (
                        checklist.map((item, idx) => (
                            <div key={idx} className={cn(
                                "flex items-start gap-4 p-4 rounded-2xl border transition-all",
                                item.valid ? "bg-emerald-500/5 border-emerald-500/10" : "bg-red-500/5 border-red-500/10 opacity-80"
                            )}>
                                {item.valid ? (
                                    <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                                ) : (
                                    <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                                )}
                                <div>
                                    <p className={cn("text-sm font-bold", item.valid ? "text-white" : "text-red-400")}>{item.label}</p>
                                    <p className="text-[10px] font-medium text-slate-500 uppercase tracking-tighter mt-0.5">{item.desc}</p>
                                </div>
                            </div>
                        ))
                    )}
                </CardContent>
            </Card>

            <Card className={cn(
                "bg-slate-900 border-slate-800 rounded-[2.5rem] overflow-hidden shadow-2xl transition-all",
                !canSell && "opacity-40 grayscale pointer-events-none"
            )}>
                <CardHeader className="bg-primary/10 p-8 border-b border-white/5">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-primary/20 rounded-2xl text-primary">
                            <ShoppingCart className="h-6 w-6" />
                        </div>
                        <div>
                            <CardTitle className="text-xl font-bold text-white uppercase tracking-tight">Proposer un prix</CardTitle>
                            <CardDescription className="text-slate-500">Montant net que vous recevrez immédiatement.</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-8 space-y-8">
                    <div className="p-6 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-start gap-4">
                        <ShieldAlert className="h-6 w-6 text-amber-500 shrink-0 mt-0.5" />
                        <div className="space-y-2">
                            <p className="text-xs font-black text-amber-400 uppercase tracking-widest">Contrat de Cession Définitive</p>
                            <p className="text-[11px] text-amber-200/70 font-medium leading-relaxed">
                                En vendant ce cours, vous transférez la <b>propriété exclusive</b> à Ndara Afrique. Toute republication, même partielle, sur YouTube, Udemy ou d'autres plateformes entraînera un <b>bannissement immédiat</b> et une action légale pour violation de copyright.
                            </p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Prix de rachat souhaité (XOF)</Label>
                        <div className="relative">
                            <Coins className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-primary opacity-50" />
                            <Input 
                                type="number" 
                                value={price} 
                                onChange={(e) => setPrice(Number(e.target.value))}
                                className="h-14 pl-12 bg-slate-950 border-slate-800 rounded-xl text-2xl font-black text-white" 
                            />
                        </div>
                        <p className="text-[10px] text-slate-600 italic">L'équipe Ndara se réserve le droit de négocier ce prix selon l'expertise démontrée.</p>
                    </div>

                    <div className="flex items-start gap-3 p-4 bg-slate-950/50 rounded-2xl border border-white/5">
                        <Checkbox 
                            id="terms" 
                            checked={agreed} 
                            onCheckedChange={(v) => setAgreed(!!v)}
                            className="mt-1 border-slate-700 data-[state=checked]:bg-primary"
                        />
                        <Label htmlFor="terms" className="text-xs text-slate-400 leading-relaxed cursor-pointer font-medium">
                            Je confirme être le créateur original de ce contenu. J'accepte de céder l'intégralité de mes droits d'exploitation et m'engage à ne jamais republier ce contenu ailleurs.
                        </Label>
                    </div>

                    <Button 
                        onClick={handleRequest}
                        disabled={isSubmitting || !agreed || price < 10000 || !canSell}
                        className="w-full h-16 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black uppercase text-xs tracking-widest shadow-xl shadow-primary/30 active:scale-95 transition-all"
                    >
                        {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <CheckCircle2 className="h-5 w-5 mr-2" />}
                        {canSell ? "Soumettre pour rachat immédiat" : "Conditions non remplies"}
                    </Button>
                </CardContent>
            </Card>

            {!canSell && !isValidating && isBuyoutEnabled && (
                <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 animate-in slide-in-from-bottom-2">
                    <Info className="h-5 w-5" />
                    <p className="text-[10px] font-black uppercase tracking-widest">Améliorez votre formation pour débloquer l'option de rachat.</p>
                </div>
            )}
        </div>
    );
}

function ClockIcon(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
    </svg>
  );
}
