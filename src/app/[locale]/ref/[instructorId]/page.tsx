
'use client';

/**
 * @fileOverview Route de capture des parrainages formateurs.
 * Enregistre le lien de parrainage et redirige vers l'accueil.
 */

import { useEffect } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { logTrackingEvent } from '@/actions/trackingActions';
import { Loader2 } from 'lucide-react';

export default function ReferralCapturePage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const router = useRouter();
    const locale = useLocale();
    
    const instructorId = params.instructorId as string;
    const referralCode = searchParams.get('code');

    useEffect(() => {
        if (!instructorId) {
            router.push(`/${locale}`);
            return;
        }

        // 1. Stockage persistant du parrainage
        const referralData = {
            instructorId,
            referralCode: referralCode || 'DEFAULT',
            timestamp: Date.now(),
            expiresAt: Date.now() + (30 * 24 * 60 * 60 * 1000) // 30 jours
        };

        localStorage.setItem('ndara_referral', JSON.stringify(referralData));

        // 2. Logging de l'événement de clic
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

        // 3. Redirection douce vers la landing page
        setTimeout(() => {
            router.push(`/${locale}`);
        }, 1000);

    }, [instructorId, referralCode, router, locale]);

    return (
        <div className="h-screen bg-slate-950 flex flex-col items-center justify-center gap-4 text-center p-6">
            <div className="relative">
                <div className="h-16 w-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center text-primary font-black text-xl italic">N</div>
            </div>
            <h1 className="text-white font-black uppercase tracking-[0.3em] text-xs">Ndara Afrique</h1>
            <p className="text-slate-500 text-[10px] uppercase font-bold tracking-widest animate-pulse">Activation du lien partenaire...</p>
        </div>
    );
}
