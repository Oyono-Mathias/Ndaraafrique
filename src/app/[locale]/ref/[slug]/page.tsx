'use client';

/**
 * @fileOverview Page d'invitation parrainage Ndara Afrique.
 * Paramètre unifié [slug] pour éviter les conflits de routage.
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
    
    const slug = params.slug as string; // Paramètre unifié
    const referralCode = searchParams.get('code');

    const instructorRef = useMemo(() => slug ? doc(db, 'users', slug) : null, [db, slug]);
    const { data: instructor, isLoading } = useDoc<NdaraUser>(instructorRef);

    useEffect(() => {
        if (!slug) return;

        // Stockage du parrainage
        const referralData = {
            instructorId: slug,
            referralCode: referralCode || 'DEFAULT',
            timestamp: Date.now(),
            expiresAt: Date.now() + (30 * 24 * 60 * 60 * 1000)
        };

        localStorage.setItem('ndara_referral', JSON.stringify(referralData));

        logTrackingEvent({
            eventType: 'affiliate_click',
            sessionId: 'anon',
            pageUrl: window.location.href,
            metadata: { type: 'instructor_referral', instructorId: slug, referralCode }
        });
    }, [slug, referralCode]);

    if (isLoading) {
        return (
            <div className="h-screen bg-slate-950 flex flex-col items-center justify-center gap-4">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Connexion au réseau Ndara...</p>
            </div>
        );
    }

    return (
        <div className="h-screen bg-slate-950 flex flex-col items-center justify-center p-6 relative bg-grainy">
            <div className="w-full max-w-sm space-y-8 text-center z-10 animate-in fade-in zoom-in duration-700">
                <Avatar className="h-24 w-24 border-4 border-slate-900 shadow-2xl mx-auto">
                    <AvatarImage src={instructor?.profilePictureURL} className="object-cover" />
                    <AvatarFallback className="bg-slate-800 text-3xl font-black text-slate-500">
                        {instructor?.fullName?.charAt(0)}
                    </AvatarFallback>
                </Avatar>

                <div className="space-y-3">
                    <h1 className="text-2xl font-black text-white uppercase tracking-tight">
                        <span className="text-primary">{instructor?.fullName || "Un expert"}</span> <br/>
                        vous invite à apprendre.
                    </h1>
                </div>

                <Button onClick={() => router.push(`/${locale}/search`)} className="w-full h-16 rounded-2xl bg-primary text-white font-black uppercase text-xs tracking-widest shadow-2xl">
                    Explorer les cours
                    <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}
