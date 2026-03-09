'use client';

/**
 * @fileOverview Page d'invitation parrainage Ndara Afrique.
 * Affiche l'invitation de l'instructeur avant de rediriger vers le catalogue.
 */

import { useEffect, useMemo } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { logTrackingEvent } from '@/actions/trackingActions';
import { useDoc } from '@/firebase';
import { getFirestore, doc } from 'firebase/firestore';
import { Loader2, Users, ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { NdaraUser } from '@/lib/types';

export default function ReferralCapturePage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const router = useRouter();
    const locale = useLocale();
    const db = getFirestore();
    
    const instructorId = params.instructorId as string;
    const referralCode = searchParams.get('code');

    const instructorRef = useMemo(() => instructorId ? doc(db, 'users', instructorId) : null, [db, instructorId]);
    const { data: instructor, isLoading } = useDoc<NdaraUser>(instructorRef);

    useEffect(() => {
        if (!instructorId) return;

        // Stockage immédiat du parrainage (Tracking furtif)
        const referralData = {
            instructorId,
            referralCode: referralCode || 'DEFAULT',
            timestamp: Date.now(),
            expiresAt: Date.now() + (30 * 24 * 60 * 60 * 1000) // 30 jours
        };

        localStorage.setItem('ndara_referral', JSON.stringify(referralData));

        logTrackingEvent({
            eventType: 'affiliate_click',
            sessionId: 'anon',
            pageUrl: window.location.href,
            metadata: { 
                type: 'instructor_referral',
                instructorId,
                referralCode 
            }
        });
    }, [instructorId, referralCode]);

    if (isLoading) {
        return (
            <div className="h-screen bg-slate-950 flex flex-col items-center justify-center gap-4 text-center">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Connexion au réseau Ndara...</p>
            </div>
        );
    }

    return (
        <div className="h-screen bg-slate-950 flex flex-col items-center justify-center p-6 relative overflow-hidden bg-grainy">
            <div className="absolute inset-0 bg-primary/5 blur-[120px] rounded-full pointer-events-none" />
            
            <div className="w-full max-w-sm space-y-8 text-center z-10 animate-in fade-in zoom-in duration-700">
                <div className="relative inline-block">
                    <div className="absolute -inset-4 bg-primary/20 rounded-full blur-xl animate-pulse" />
                    <Avatar className="h-24 w-24 border-4 border-slate-900 shadow-2xl relative mx-auto">
                        <AvatarImage src={instructor?.profilePictureURL} className="object-cover" />
                        <AvatarFallback className="bg-slate-800 text-3xl font-black text-slate-500">
                            {instructor?.fullName?.charAt(0)}
                        </AvatarFallback>
                    </Avatar>
                </div>

                <div className="space-y-3">
                    <h1 className="text-2xl font-black text-white leading-tight uppercase tracking-tight">
                        <span className="text-primary">{instructor?.fullName || "Un expert"}</span> <br/>
                        vous invite à apprendre.
                    </h1>
                    <p className="text-slate-400 text-sm font-medium leading-relaxed italic">
                        "Rejoignez-moi sur Ndara Afrique pour maîtriser les compétences clés du futur continent."
                    </p>
                </div>

                <div className="bg-slate-900/50 border border-white/5 p-6 rounded-[2rem] space-y-4 shadow-xl">
                    <div className="flex items-center gap-3 text-left">
                        <div className="p-2 bg-primary/10 rounded-lg text-primary"><Sparkles size={18}/></div>
                        <div>
                            <p className="text-xs font-bold text-white uppercase">Accès Communautaire</p>
                            <p className="text-[10px] text-slate-500">Bénéficiez du réseau de votre parrain.</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 text-left">
                        <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400"><Users size={18}/></div>
                        <div>
                            <p className="text-xs font-bold text-white uppercase">Tuteur MATHIAS 24h/24</p>
                            <p className="text-[10px] text-slate-500">Une IA dédiée à votre réussite.</p>
                        </div>
                    </div>
                </div>

                <Button 
                    onClick={() => router.push(`/${locale}/search`)}
                    className="w-full h-16 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black uppercase text-xs tracking-widest shadow-2xl shadow-primary/30 gap-2 transition-all active:scale-95"
                >
                    Explorer les cours
                    <ArrowRight size={16} />
                </Button>

                <p className="text-[9px] font-black text-slate-700 uppercase tracking-[0.4em]">Ndara Afrique • Excellence Réseautée</p>
            </div>
        </div>
    );
}
