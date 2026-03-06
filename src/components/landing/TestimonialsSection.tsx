
'use client';

/**
 * @fileOverview Section des témoignages Ndara Afrique - 100% Réelle.
 * ✅ RÉSOLU : Suppression des données simulées.
 * ✅ TEMPS RÉEL : Affiche les derniers avis 4/5 étoiles de Firestore.
 */

import { useState, useEffect } from 'react';
import { getFirestore, collection, query, where, orderBy, limit, onSnapshot, getDocs, doc } from 'firebase/firestore';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Star, MessageSquare, Quote } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import type { Review, NdaraUser } from '@/lib/types';
import { cn } from '@/lib/utils';

interface EnrichedReview extends Review {
    userName?: string;
    userAvatar?: string;
}

const TestimonialCard = ({ review }: { review: EnrichedReview }) => (
    <Card className="h-full flex flex-col justify-between p-8 bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 shadow-xl rounded-[2.5rem] relative overflow-hidden group hover:border-primary/30 transition-all duration-500">
        <div className="absolute -right-4 -top-4 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
            <Quote size={120} className="text-primary" />
        </div>
        
        <CardContent className="p-0 relative z-10">
            <div className="flex items-center gap-1 mb-6">
                {[...Array(5)].map((_, i) => (
                    <Star 
                        key={i} 
                        size={14} 
                        className={cn(
                            "transition-all duration-500",
                            i < review.rating ? "text-yellow-400 fill-yellow-400" : "text-slate-200 dark:text-slate-800"
                        )} 
                    />
                ))}
            </div>
            <blockquote className="text-slate-600 dark:text-slate-300 italic text-lg leading-relaxed font-medium">
                “{review.comment}”
            </blockquote>
        </CardContent>

        <div className="flex items-center gap-4 mt-10 pt-8 border-t border-slate-50 dark:border-white/5 relative z-10">
            <Avatar className="h-12 w-12 border-2 border-white dark:border-slate-800 shadow-lg">
                <AvatarImage src={review.userAvatar} alt={review.userName} className="object-cover" />
                <AvatarFallback className="bg-primary/10 text-primary font-black uppercase">
                    {review.userName?.charAt(0) || 'N'}
                </AvatarFallback>
            </Avatar>
            <div>
                <p className="font-black text-slate-900 dark:text-white uppercase tracking-tight text-sm">
                    {review.userName || 'Étudiant Ndara'}
                </p>
                <p className="text-[10px] font-bold text-primary uppercase tracking-[0.2em]">Membre Certifié</p>
            </div>
        </div>
    </Card>
);

export function TestimonialsSection() {
  const [reviews, setReviews] = useState<EnrichedReview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const db = getFirestore();

  useEffect(() => {
    setIsLoading(true);
    
    // On récupère les 3 derniers avis avec une note de 4 ou 5
    const q = query(
        collection(db, 'reviews'), 
        where('rating', '>=', 4),
        orderBy('rating', 'desc'),
        orderBy('createdAt', 'desc'),
        limit(3)
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
        try {
            const rawReviews = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Review));
            
            if (rawReviews.length === 0) {
                setReviews([]);
                setIsLoading(false);
                return;
            }

            const userIds = [...new Set(rawReviews.map(r => r.userId))];
            const usersMap = new Map<string, NdaraUser>();

            // Récupération groupée des profils utilisateurs
            const usersQuery = query(collection(db, 'users'), where('uid', 'in', userIds.slice(0, 30)));
            const usersSnap = await getDocs(usersQuery);
            usersSnap.forEach(d => usersMap.set(d.id, d.data() as NdaraUser));

            const enriched = rawReviews.map(r => {
                const user = usersMap.get(r.userId);
                return {
                    ...r,
                    userName: user?.fullName,
                    userAvatar: user?.profilePictureURL
                };
            });

            setReviews(enriched);
        } catch (err) {
            console.warn("Testimonials load error:", err);
        } finally {
            setIsLoading(false);
        }
    });

    return () => unsubscribe();
  }, [db]);

  if (isLoading) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 py-12">
            {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-64 w-full rounded-[2.5rem] bg-slate-100 dark:bg-slate-800" />
            ))}
        </div>
    );
  }

  if (reviews.length === 0) {
      return (
          <div className="py-24 text-center">
              <div className="inline-block p-4 bg-primary/5 rounded-full mb-6">
                <MessageSquare className="h-10 w-10 text-primary opacity-20" />
              </div>
              <h3 className="text-xl font-black text-slate-400 uppercase tracking-tight">Le savoir en marche</h3>
              <p className="text-slate-400 text-sm mt-2 max-w-sm mx-auto font-medium">
                Nos premiers diplômés préparent leurs témoignages. Rejoignez l'aventure pour être le prochain !
              </p>
          </div>
      );
  }

  return (
    <section className="py-24">
      <div className="text-center mb-16 space-y-4">
        <h2 className="text-brand-primary font-black tracking-[0.3em] uppercase text-[10px]">Impact Réel</h2>
        <h3 className="text-3xl md:text-5xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
          Ce que disent <span className="text-primary">nos Ndara</span>
        </h3>
        <p className="mt-4 text-lg text-slate-500 max-w-2xl mx-auto font-medium">
          La réussite de nos étudiants est notre seule et unique métrique de succès.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {reviews.map((review) => (
            <TestimonialCard key={review.id} review={review} />
        ))}
      </div>
    </section>
  );
}
