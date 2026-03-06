'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, Sparkles, CheckCircle2, ShieldAlert, Database } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

/**
 * @fileOverview Page de débogage pour le CEO afin de tester manuellement le moteur de recommandation.
 */
export default function TestRecommendationsPage() {
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
    const { toast } = useToast();

    const triggerCalculation = async () => {
        setIsLoading(true);
        setResult(null);
        try {
            const response = await fetch('/api/cron/recommendations');
            const data = await response.json();
            
            if (response.ok) {
                setResult({ success: true, message: data.message });
                toast({ title: "Calcul terminé !", description: data.message });
            } else {
                throw new Error(data.error || "Échec du calcul");
            }
        } catch (error: any) {
            setResult({ success: false, message: error.message });
            toast({ variant: 'destructive', title: "Erreur", description: error.message });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto space-y-8 p-4 pt-12">
            <header className="text-center space-y-2">
                <div className="p-3 bg-primary/10 rounded-full inline-block">
                    <Sparkles className="h-8 w-8 text-primary" />
                </div>
                <h1 className="text-3xl font-black text-white uppercase tracking-tight">Moteur Ndara IA</h1>
                <p className="text-slate-500">Outil de test manuel pour les recommandations personnalisées.</p>
            </header>

            <Card className="bg-slate-900 border-slate-800 rounded-[2.5rem] overflow-hidden shadow-2xl">
                <CardHeader className="p-8 border-b border-white/5 bg-slate-800/30">
                    <CardTitle className="text-xl font-bold">Lancer le cycle de calcul</CardTitle>
                    <CardDescription>Cette action va analyser les intérêts de tous les utilisateurs actifs et générer leur Top 10.</CardDescription>
                </CardHeader>
                <CardContent className="p-8 space-y-6">
                    <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-start gap-3">
                        <ShieldAlert className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                        <p className="text-xs font-bold text-amber-200/80 uppercase leading-relaxed">
                            Attention : Cette opération peut prendre quelques secondes. Elle met à jour la collection <span className="text-white">recommended_courses</span> dans Firestore.
                        </p>
                    </div>

                    {result && (
                        <div className={cn(
                            "p-6 rounded-2xl border animate-in zoom-in duration-500",
                            result.success ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-red-500/10 border-red-500/20 text-red-400"
                        )}>
                            <div className="flex items-center gap-3">
                                {result.success ? <CheckCircle2 className="h-6 w-6" /> : <ShieldAlert className="h-6 w-6" />}
                                <p className="font-bold uppercase text-[10px] tracking-widest">{result.message}</p>
                            </div>
                        </div>
                    )}

                    <Button 
                        onClick={triggerCalculation} 
                        disabled={isLoading}
                        className="w-full h-16 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black uppercase text-xs tracking-widest shadow-xl shadow-primary/20 transition-all active:scale-95"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="mr-3 h-5 w-5 animate-spin" />
                                Analyse et Scoring en cours...
                            </>
                        ) : (
                            <>
                                <Database className="mr-3 h-5 w-5" />
                                Lancer le calcul global (Manuellement)
                            </>
                        )}
                    </Button>
                </CardContent>
            </Card>

            <div className="text-center pt-8">
                <p className="text-[10px] font-black text-slate-700 uppercase tracking-[0.4em]">CEO Access Only • Ndara IA Engine v1.0</p>
            </div>
        </div>
    );
}

function cn(...inputs: any[]) {
    return inputs.filter(Boolean).join(' ');
}
