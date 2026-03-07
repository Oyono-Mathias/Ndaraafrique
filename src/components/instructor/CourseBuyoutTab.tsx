'use client';

/**
 * @fileOverview Onglet de cession de cours à la plateforme.
 * Permet au formateur de demander un rachat immédiat de sa formation.
 */

import { useState } from 'react';
import { Course } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ShoppingCart, ShieldAlert, CheckCircle2, Loader2, Coins } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRole } from '@/context/RoleContext';
import { requestCourseBuyoutAction } from '@/actions/courseActions';
import { cn } from '@/lib/utils';

export function CourseBuyoutTab({ course }: { course: Course }) {
    const { currentUser } = useRole();
    const { toast } = useToast();
    const [price, setPrice] = useState(course.buyoutPrice || 50000);
    const [agreed, setAgreed] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const isRequested = course.buyoutStatus === 'requested';

    const handleRequest = async () => {
        if (!currentUser || !agreed) return;
        setIsSubmitting(true);
        
        try {
            const result = await requestCourseBuyoutAction({
                courseId: course.id,
                instructorId: currentUser.uid,
                requestedPrice: price
            });

            if (result.success) {
                toast({ title: "Demande envoyée !", description: "Ndara Afrique va examiner votre offre." });
            } else {
                toast({ variant: 'destructive', title: "Erreur", description: result.error });
            }
        } catch (e) {
            toast({ variant: 'destructive', title: "Erreur technique" });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isRequested) {
        return (
            <Card className="bg-primary/5 border-primary/20 rounded-[2rem] p-12 text-center space-y-6">
                <div className="p-4 bg-primary/10 rounded-full inline-block animate-pulse">
                    <ClockIcon className="h-12 w-12 text-primary" />
                </div>
                <h3 className="text-2xl font-black text-white uppercase tracking-tight">Négociation en cours</h3>
                <p className="text-slate-400 max-w-md mx-auto leading-relaxed">
                    Vous avez proposé ce cours à la vente pour <span className="text-white font-bold">{course.buyoutPrice?.toLocaleString('fr-FR')} XOF</span>. 
                    Notre équipe finance examine votre demande. Vous recevrez une notification d'ici 48h.
                </p>
            </Card>
        );
    }

    return (
        <div className="max-w-2xl mx-auto space-y-8">
            <Card className="bg-slate-900 border-slate-800 rounded-[2.5rem] overflow-hidden shadow-2xl">
                <CardHeader className="bg-primary/10 p-8 border-b border-white/5">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-primary/20 rounded-2xl text-primary">
                            <ShoppingCart className="h-6 w-6" />
                        </div>
                        <div>
                            <CardTitle className="text-xl font-bold text-white uppercase tracking-tight">Vendre ma formation</CardTitle>
                            <CardDescription className="text-slate-500">Cédez vos droits à Ndara Afrique pour un gain immédiat.</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-8 space-y-8">
                    <div className="p-6 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-start gap-4">
                        <ShieldAlert className="h-6 w-6 text-amber-500 shrink-0 mt-0.5" />
                        <div className="space-y-2">
                            <p className="text-xs font-black text-amber-400 uppercase tracking-widest">Règles de Cession Stricte</p>
                            <ul className="text-[11px] text-amber-200/70 space-y-1.5 list-disc pl-4 font-medium">
                                <li>Vous vendez l'intégralité de vos droits d'exploitation à Ndara Afrique.</li>
                                <li>Vous vous engagez à **ne jamais republier** ce contenu ailleurs (YouTube, Udemy, etc.).</li>
                                <li>Toute violation entraîne un **bannissement immédiat** et une retenue sur vos gains futurs.</li>
                            </ul>
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
                        <p className="text-[10px] text-slate-600 italic">Un prix réaliste (basé sur la qualité du contenu) accélère la validation.</p>
                    </div>

                    <div className="flex items-start gap-3 p-4 bg-slate-950/50 rounded-2xl border border-white/5">
                        <Checkbox 
                            id="terms" 
                            checked={agreed} 
                            onCheckedChange={(v) => setAgreed(!!v)}
                            className="mt-1 border-slate-700 data-[state=checked]:bg-primary"
                        />
                        <Label htmlFor="terms" className="text-xs text-slate-400 leading-relaxed cursor-pointer">
                            Je confirme être le créateur original de ce contenu et j'accepte de céder tous les droits à Ndara Afrique. Je comprends qu'une republication entraînera des sanctions sévères.
                        </Label>
                    </div>

                    <Button 
                        onClick={handleRequest}
                        disabled={isSubmitting || !agreed || price < 5000}
                        className="w-full h-16 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black uppercase text-xs tracking-widest shadow-xl shadow-primary/30 active:scale-95 transition-all"
                    >
                        {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <CheckCircle2 className="h-5 w-5 mr-2" />}
                        Proposer la vente au plateau
                    </Button>
                </CardContent>
            </Card>
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
