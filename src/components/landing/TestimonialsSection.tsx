'use client';

/**
 * @fileOverview Section Témoignages (Le Mur de la Sagesse) Ndara Afrique.
 * Design ultra-prestige basé sur le code de Qwen.
 */

import { useState, useEffect } from 'react';
import { getFirestore, collection, query, orderBy, limit, onSnapshot, getDocs, where } from 'firebase/firestore';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Star, Quote, ShieldCheck } from 'lucide-react';
import type { Review, NdaraUser } from '@/lib/types';
import { cn } from '@/lib/utils';

interface EnrichedReview extends Review {
    userName?: string;
    userAvatar?: string;
    userRole?: string;
}

export function TestimonialsSection() {
  const [reviews, setReviews] = useState<EnrichedReview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const db = getFirestore();

  useEffect(() => {
    setIsLoading(true);
    const q = query(collection(db, 'course_reviews'), orderBy('createdAt', 'desc'), limit(6));

    const unsubscribe = onSnapshot(q, async (snapshot) => {
        try {
            if (snapshot.empty) {
                setReviews([]);
                setIsLoading(false);
                return;
            }

            const rawReviews = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Review));
            const studentIds = [...new Set(rawReviews.map(r => r.studentId))];
            const usersMap = new Map<string, NdaraUser>();

            const usersSnap = await getDocs(query(collection(db, 'users'), where('uid', 'in', studentIds.slice(0, 30))));
            usersSnap.forEach(d => usersMap.set(d.id, d.data() as NdaraUser));

            const enriched = rawReviews.map(r => ({
                ...r,
                userName: usersMap.get(r.studentId)?.fullName,
                userAvatar: usersMap.get(r.studentId)?.profilePictureURL,
                userRole: usersMap.get(r.studentId)?.careerGoals?.currentRole || 'Étudiant Ndara'
            }));

            setReviews(enriched.filter(r => r.rating >= 4).slice(0, 3));
        } catch (err) {
            console.warn("Testimonials error:", err);
        } finally {
            setIsLoading(false);
        }
    });

    return () => unsubscribe();
  }, [db]);

  if (isLoading || reviews.length === 0) return null;

  return (
    <section className="py-24 md:py-32">
        <div className="max-w-7xl mx-auto px-4">
            <div className="text-center mb-20 space-y-4">
                <h2 className="text-4xl sm:text-6xl font-black uppercase tracking-tight">
                    <span className="text-white">Le Mur de la </span>
                    <span className="gradient-text">Sagesse</span>
                </h2>
                <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto font-medium italic">
                    Découvrez les témoignages de nos Ndara qui ont transformé leur vie par le savoir.
                </p>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {reviews.map((review, idx) => (
                    <div 
                        key={review.id} 
                        className="testimonial-card glassmorphism rounded-[2.5rem] p-8 flex flex-col justify-between relative overflow-hidden group animate-in fade-in slide-in-from-bottom-8 duration-700"
                        style={{ animationDelay: `${idx * 200}ms` }}
                    >
                        <div className="absolute -right-4 -top-4 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
                            <Quote size={120} className="text-primary" />
                        </div>

                        <div className="relative z-10">
                            <div className="flex items-center gap-1 mb-6">
                                {[...Array(5)].map((_, i) => (
                                    <Star 
                                        key={i} 
                                        size={14} 
                                        className={cn(
                                            "transition-all duration-500",
                                            i < review.rating ? "text-yellow-400 fill-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.4)]" : "text-slate-800"
                                        )} 
                                    />
                                ))}
                            </div>
                            <blockquote className="text-slate-300 italic text-lg leading-relaxed font-medium mb-8">
                                “{review.comment}”
                            </blockquote>
                        </div>

                        <div className="flex items-center gap-4 pt-8 border-t border-white/5 relative z-10">
                            <Avatar className="h-14 w-14 border-2 border-primary/20 shadow-xl">
                                <AvatarImage src={review.userAvatar} alt={review.userName} className="object-cover" />
                                <AvatarFallback className="bg-slate-800 text-slate-500 font-black uppercase">
                                    {review.userName?.charAt(0)}
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                                <p className="font-black text-white uppercase tracking-tight text-sm truncate">
                                    {review.userName}
                                </p>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest truncate">{review.userRole}</span>
                                    <Badge className="bg-primary/10 text-primary border-none text-[8px] font-black uppercase h-4 px-1.5 shrink-0">
                                        <ShieldCheck size={10} className="mr-1" /> Certifié
                                    </Badge>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    </section>
  );
}
