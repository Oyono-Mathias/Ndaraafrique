'use client';

/**
 * @fileOverview Redirection de l'ancienne route vers la nouvelle route unifiée 'wishlist'.
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { Loader2 } from 'lucide-react';

export default function OldWishlistRedirect() {
    const router = useRouter();
    const locale = useLocale();

    useEffect(() => {
        router.replace(`/${locale}/student/wishlist`);
    }, [router, locale]);

    return (
        <div className="h-screen bg-slate-950 flex flex-col items-center justify-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Chargement de vos favoris...</p>
        </div>
    );
}