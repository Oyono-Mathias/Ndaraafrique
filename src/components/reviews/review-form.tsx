'use client';

/**
 * @fileOverview Formulaire d'avis Ndara Afrique.
 * ✅ RÉSOLU : Met à jour dynamiquement la note moyenne et le compteur du cours dans Firestore.
 * ✅ SÉCURITÉ : Vérifie si l'utilisateur a déjà laissé un avis.
 */

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { getFirestore, addDoc, collection, serverTimestamp, getDoc, doc, updateDoc, getDocs, query, where, limit } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Star, Loader2, CheckCircle2, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Course, Review } from '@/lib/types';

const reviewSchema = z.object({
  rating: z.number().min(1, 'La note est requise.').max(5),
  comment: z.string().min(10, 'Le commentaire doit faire au moins 10 caractères.'),
});

interface ReviewFormProps {
  courseId: string;
  userId: string;
  onReviewSubmit?: () => void;
}

export function ReviewForm({ courseId, userId, onReviewSubmit }: ReviewFormProps) {
  const { toast } = useToast();
  const [hoverRating, setHoverRating] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasAlreadyReviewed, setHasAlreadyReviewed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const db = getFirestore();

  const form = useForm<z.infer<typeof reviewSchema>>({
    resolver: zodResolver(reviewSchema),
    defaultValues: {
      rating: 0,
      comment: '',
    },
  });

  // Vérifier si l'utilisateur a déjà laissé un avis
  useEffect(() => {
    const checkReview = async () => {
      if (!userId || !courseId) return;
      const q = query(
        collection(db, 'reviews'),
        where('courseId', '==', courseId),
        where('userId', '==', userId),
        limit(1)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        setHasAlreadyReviewed(true);
      }
      setIsLoading(false);
    };
    checkReview();
  }, [courseId, userId, db]);

  const onSubmit = async (values: z.infer<typeof reviewSchema>) => {
    setIsSubmitting(true);
    
    try {
      const courseRef = doc(db, 'courses', courseId);
      const courseSnap = await getDoc(courseRef);
      
      if (!courseSnap.exists()) {
          toast({ variant: 'destructive', title: 'Erreur', description: 'Le cours n\'existe pas.' });
          return;
      }
      
      const courseData = courseSnap.data() as Course;

      // 1. Enregistrer le nouvel avis
      const reviewPayload = {
        courseId,
        userId,
        instructorId: courseData.instructorId,
        rating: values.rating,
        comment: values.comment,
        createdAt: serverTimestamp(),
      };
      
      await addDoc(collection(db, 'reviews'), reviewPayload);

      // 2. RECULCULER LA MOYENNE (Pour que les cartes de cours s'actualisent)
      const allReviewsQuery = query(collection(db, 'reviews'), where('courseId', '==', courseId));
      const allReviewsSnap = await getDocs(allReviewsQuery);
      const reviews = allReviewsSnap.docs.map(d => d.data() as Review);
      
      const totalReviews = reviews.length;
      const averageRating = reviews.reduce((acc, curr) => acc + curr.rating, 0) / totalReviews;

      // 3. Mettre à jour le document du cours
      await updateDoc(courseRef, {
        rating: Number(averageRating.toFixed(1)),
        participantsCount: totalReviews 
      });
      
      toast({ title: 'Avis publié !', description: 'Merci pour votre retour cher Ndara.' });
      setHasAlreadyReviewed(true);
      if (onReviewSubmit) onReviewSubmit();

    } catch (error) {
      console.error("Error submitting review:", error);
      toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible d\'envoyer votre avis.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <div className="flex justify-center p-4"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  if (hasAlreadyReviewed) {
    return (
      <div className="text-center p-6 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl space-y-2">
        <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto" />
        <h3 className="font-bold text-white text-sm uppercase">Avis déjà enregistré</h3>
        <p className="text-xs text-slate-500">Merci d'avoir partagé votre expérience sur cette formation.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 bg-primary/10 rounded-lg">
          <MessageSquare className="h-5 w-5 text-primary" />
        </div>
        <h3 className="text-lg font-black text-white uppercase tracking-tight">Votre avis compte</h3>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="rating"
            render={({ field }) => (
              <FormItem className="text-center">
                <FormControl>
                  <div
                    className="flex items-center justify-center gap-3"
                    onMouseLeave={() => setHoverRating(0)}
                  >
                    {[...Array(5)].map((_, i) => {
                      const ratingValue = i + 1;
                      return (
                        <button
                          type="button"
                          key={ratingValue}
                          onClick={() => field.onChange(ratingValue)}
                          onMouseEnter={() => setHoverRating(ratingValue)}
                          className="p-0 bg-transparent border-none transition-transform active:scale-110"
                        >
                          <Star
                            className={cn(
                              'w-10 h-10 cursor-pointer transition-all duration-300',
                              ratingValue <= (hoverRating || field.value)
                                ? 'text-yellow-400 fill-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.4)]'
                                : 'text-slate-800'
                            )}
                          />
                        </button>
                      );
                    })}
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="comment"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Commentaire (min. 10 caract.)</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Qu'avez-vous pensé de cette formation ?"
                    className="bg-slate-950 border-slate-800 rounded-2xl resize-none p-4 text-white focus-visible:ring-primary/30"
                    rows={4}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button 
              type="submit" 
              disabled={isSubmitting || form.watch('rating') === 0} 
              className="w-full h-14 rounded-2xl bg-primary hover:bg-primary/90 font-black uppercase text-xs tracking-widest shadow-xl shadow-primary/20 transition-all active:scale-[0.98]"
          >
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Publier mon avis
          </Button>
        </form>
      </Form>
    </div>
  );
}
