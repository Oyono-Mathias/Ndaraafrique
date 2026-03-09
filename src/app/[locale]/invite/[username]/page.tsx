'use client';

/**
 * @fileOverview Page de redirection pour les liens courts d'invitation Ndara.
 * Transforme /invite/mathias en /ref/ID?code=CODE.
 */

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getFirestore, collection, query, where, getDocs, limit } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';

export default function InviteRedirectPage() {
    const params = useParams();
    const router = useRouter();
    const username = params.username as string;
    const locale = params.locale as string;

    useEffect(() => {
        const resolveUsername = async () => {
            const db = getFirestore();
            // Recherche de l'instructeur par son nom d'utilisateur
            const q = query(collection(db, 'users'), where('username', '==', username), limit(1));
            const snap = await getDocs(q);

            if (!snap.empty) {
                const userData = snap.docs[0].data();
                const uid = snap.docs[0].id;
                const code = userData.referralCode || 'NDARA';
                // Redirection vers la page de capture de parrainage existante
                router.replace(`/${locale}/ref/${uid}?code=${code}`);
            } else {
                // Fallback vers la recherche si l'utilisateur n'existe pas
                router.replace(`/${locale}/search`);
            }
        };

        if (username) {
            resolveUsername();
        }
    }, [username, router, locale]);

    return (
        <div className="h-screen flex flex-col items-center justify-center bg-slate-950 text-white font-sans">
            <div className="relative">
                <div className="absolute -inset-4 bg-primary/20 rounded-full blur-xl animate-pulse" />
                <Loader2 className="h-12 w-12 animate-spin text-primary mb-6 relative z-10" />
            </div>
            <h1 className="text-sm font-black uppercase tracking-[0.4em] text-white/80 animate-pulse">
                Connexion Ndara...
            </h1>
            <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest mt-4">
                Redirection vers le profil de l'expert
            </p>
        </div>
    );
}
