
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { getFirestore, doc, updateDoc } from 'firebase/firestore';
import { useDoc, useMemoFirebase } from '@/firebase';
import { useRole } from '@/context/RoleContext';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Tag } from 'lucide-react';
import type { Course } from '@/lib/types';


const coursePricingSchema = z.object({
  price: z.coerce.number().min(0, 'Le prix ne peut pas être négatif.'),
});

type CoursePricingFormValues = z.infer<typeof coursePricingSchema>;

export default function PricingPage() {
    const { courseId } = useParams();
    const { toast } = useToast();
    const db = getFirestore();
    const [isSaving, setIsSaving] = useState(false);

    const courseRef = useMemoFirebase(() => doc(db, 'courses', courseId as string), [db, courseId]);
    const { data: course, isLoading } = useDoc<Course>(courseRef);

    const form = useForm<CoursePricingFormValues>({
        resolver: zodResolver(coursePricingSchema),
        defaultValues: { price: 0 },
    });

    useEffect(() => {
        if (course) {
            form.reset({ price: course.price });
        }
    }, [course, form]);

    const onSubmit = async (data: CoursePricingFormValues) => {
        if (!courseId) return;
        setIsSaving(true);
        try {
            const courseDocRef = doc(db, 'courses', courseId as string);
            await updateDoc(courseDocRef, { price: data.price });
            toast({
                title: 'Prix enregistré !',
                description: 'Le prix de votre cours a été mis à jour.',
            });
        } catch (error) {
            console.error('Error updating price:', error);
            toast({
                variant: 'destructive',
                title: 'Erreur',
                description: 'Impossible de sauvegarder le prix.',
            });
        } finally {
            setIsSaving(false);
        }
    };
    
    if (isLoading) {
        return <Skeleton className="h-48 w-full dark:bg-slate-700" />
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <Card className="dark:bg-[#1e293b] dark:border-slate-700">
                    <CardHeader>
                        <CardTitle className="text-xl flex items-center gap-2 dark:text-white">
                            <Tag className="h-5 w-5" />
                            Prix du cours
                        </CardTitle>
                        <CardDescription className="dark:text-slate-400">
                            Définissez le prix de votre cours en Francs CFA (XOF). Mettez 0 pour un cours gratuit.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                         <FormField
                            control={form.control}
                            name="price"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel className="dark:text-slate-300">Prix (XOF)</FormLabel>
                                <FormControl>
                                    <Input type="number" placeholder="0" {...field} className="dark:bg-slate-700 dark:border-slate-600" />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                            />
                    </CardContent>
                </Card>
                 <div className="flex justify-end">
                    <Button type="submit" disabled={isSaving}>
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Enregistrer le prix
                    </Button>
                </div>
            </form>
        </Form>
    );
}
