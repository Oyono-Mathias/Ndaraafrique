
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { getFirestore, addDoc, collection, serverTimestamp, getDoc, doc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Star, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import type { Course } from '@/lib/types';

const reviewSchema = z.object({
  rating: z.number().min(1, 'La note est requise.').max(5),
  comment: z.string().min(10, 'Le commentaire doit faire au moins 10 caractères.'),
});

interface ReviewFormProps {
  courseId: string;
  userId: string;
  onReviewSubmit: () => void;
}

export function ReviewForm({ courseId, userId, onReviewSubmit }: ReviewFormProps) {
  const { toast } = useToast();
  const [hoverRating, setHoverRating] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const db = getFirestore();

  const form = useForm<z.infer<typeof reviewSchema>>({
    resolver: zodResolver(reviewSchema),
    defaultValues: {
      rating: 0,
      comment: '',
    },
  });

  const onSubmit = async (values: z.infer<typeof reviewSchema>) => {
    setIsSubmitting(true);
    
    try {
      // Fetch course to get instructorId
      const courseRef = doc(db, 'courses', courseId);
      const courseSnap = await getDoc(courseRef);
      if (!courseSnap.exists()) {
          toast({ variant: 'destructive', title: 'Erreur', description: 'Le cours n\'existe pas.' });
          setIsSubmitting(false);
          return;
      }
      const courseData = courseSnap.data() as Course;

      const reviewPayload = {
        courseId,
        userId,
        instructorId: courseData.instructorId, // Add instructorId here
        rating: values.rating,
        comment: values.comment,
        createdAt: serverTimestamp(),
      };
      
      const reviewsCollection = collection(db, 'reviews');
      await addDoc(reviewsCollection, reviewPayload);
      
      toast({ title: 'Avis soumis !', description: 'Merci pour votre contribution.' });
      setSubmitted(true);
      onReviewSubmit();

    } catch (error) {
      console.error("Error submitting review:", error);
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: 'reviews',
        operation: 'create',
        requestResourceData: { courseId, userId, ...values },
      }));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="text-center p-4 border rounded-lg bg-green-50 text-green-800">
        <p>Merci pour votre avis !</p>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="rating"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Votre note</FormLabel>
              <FormControl>
                <div
                  className="flex items-center gap-1"
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
                        className="p-0 bg-transparent border-none"
                      >
                        <Star
                          className={cn(
                            'w-6 h-6 cursor-pointer transition-colors',
                            ratingValue <= (hoverRating || field.value)
                              ? 'text-yellow-400 fill-yellow-400'
                              : 'text-gray-300'
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
              <FormLabel>Votre commentaire</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Décrivez votre expérience avec ce cours..."
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Soumettre l'avis
        </Button>
      </form>
    </Form>
  );
}
