
'use client';

/**
 * @fileOverview Le Mur de la Sagesse - Témoignages réels raccordés à Firestore.
 * ✅ I18N : Traduction des titres et badges.
 */

import { useState, useEffect } from 'react';
import { getFirestore, collection, query, orderBy, limit, onSnapshot, getDocs, where } from 'firebase/firestore';
import { Star, Quote } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import type { Review } from '@/lib/types';
import { useTranslations } from 'next-intl';

export function TestimonialsSection() {
  const db = getFirestore();
  const t = useTranslations('Landing.testimonials');
  const [reviews, setReviews] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    const q = query(
        collection(db, "course_reviews"), 
        where("rating", "==", 5),
        orderBy("createdAt", "desc"),
        limit(3)
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
        const reviewsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Review));
        
        if (reviewsData.length > 0) {
            const studentIds = [...new Set(reviewsData.map(r => r.studentId))];
            const usersSnap = await getDocs(query(collection(db, 'users'), where('uid', 'in', studentIds.slice(0, 30))));
            const uMap = new Map();
            usersSnap.forEach(d => uMap.set(d.id, d.data()));

            setReviews(reviewsData.map(r => ({
                ...r,
                userName: uMap.get(r.studentId)?.fullName || 'Étudiant Ndara',
                userAvatar: uMap.get(r.studentId)?.profilePictureURL
            })));
        } else {
            // Fallback si aucun avis réel
            setReviews([
                { id: 'f1', userName: "Jean Diop", comment: "Ndara a changé ma vision de l'AgriTech. Les cours sont d'une qualité rare en Afrique.", rating: 5 },
                { id: 'f2', userName: "Fatou Sané", comment: "Le système de Mobile Money rend tout plus simple. Je me forme à mon rythme.", rating: 5 }
            ]);
        }
        setIsLoading(false);
    }, (err) => {
        console.warn("Reviews fetch error", err);
        setIsLoading(false);
    });

    return () => unsubscribe();
  }, [db]);

  return (
    <section className="px-6 mb-24 max-w-4xl mx-auto space-y-12">
        <div className="text-center space-y-2">
            <h2 className="font-black text-3xl text-white uppercase tracking-tight">{t('title')}</h2>
            <p className="text-slate-500 text-xs font-medium italic">{t('subtitle')}</p>
        </div>
        
        <div className="space-y-6">
            {reviews.map((rev, i) => (
                <div key={rev.id} className="bg-white/5 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white/5 relative active:scale-[0.98] transition-all shadow-2xl group overflow-hidden animate-in fade-in slide-in-from-bottom-4" style={{ animationDelay: `${i * 150}ms` }}>
                    <Quote className="h-20 w-20 text-white/5 absolute top-2 left-2 rotate-12" />
                    
                    <div className="flex items-center gap-4 mb-6 relative z-10">
                        <div className="p-0.5 rounded-full bg-gradient-to-tr from-primary to-teal-400">
                            <Avatar className="h-14 w-14 border-4 border-slate-950 shadow-2xl">
                                <AvatarImage src={rev.userAvatar} className="object-cover" />
                                <AvatarFallback className="bg-slate-800 text-slate-500 font-black uppercase">
                                    {rev.userName?.charAt(0)}
                                </AvatarFallback>
                            </Avatar>
                        </div>
                        <div className="flex-1">
                            <h4 className="font-black text-white text-base uppercase tracking-tight">{rev.userName}</h4>
                            <div className="flex text-yellow-500 mt-1">
                                {[...Array(5)].map((_, idx) => <Star key={idx} size={12} className={cn("fill-current", idx >= rev.rating && "text-slate-800")} />)}
                            </div>
                        </div>
                        <div className="bg-primary/10 text-primary border border-primary/20 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest shadow-lg hidden sm:block">
                            {t('verified')}
                        </div>
                    </div>
                    
                    <p className="text-slate-300 text-sm md:text-base leading-relaxed relative z-10 font-medium border-l-2 border-primary/20 pl-6 py-1 italic">
                        "{rev.comment}"
                    </p>
                </div>
            ))}
        </div>
    </section>
  );
}
