'use client';

import { useMemo, useState } from 'react';
import { CourseForm } from '@/components/instructor/CourseForm';
import { ContentManager } from '@/components/instructor/course-content/ContentManager';
import { updateCourseAction } from '@/actions/instructorActions';
import { submitCourseForReviewAction } from '@/actions/courseActions';
import { useDoc } from '@/firebase';
import { doc, getFirestore } from 'firebase/firestore';
import type { Course } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, ArrowLeft, Send, CheckCircle2 } from 'lucide-react';
import { useRole } from '@/context/RoleContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export default function EditCoursePage({ params }: { params: { courseId: string } }) {
  const { courseId } = params;
  const { currentUser } = useRole();
  const db = getFirestore();
  const { toast } = useToast();
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  const courseRef = useMemo(() => doc(db, 'courses', courseId), [db, courseId]);
  const { data: course, isLoading, error } = useDoc<Course>(courseRef);

  const handleUpdateCourse = async (data: any) => {
     const result = await updateCourseAction({ courseId, formData: data });
     if (result.success) {
        toast({ title: 'Modifications enregistrées !' });
     } else {
        toast({ variant: 'destructive', title: 'Erreur', description: result.message });
     }
  };

  const handleSubmitForReview = async () => {
    if (!currentUser || !course) return;
    setIsSubmittingReview(true);
    
    const result = await submitCourseForReviewAction({ 
        courseId: course.id, 
        instructorId: currentUser.uid 
    });

    if (result.success) {
        toast({ 
            title: "C'est envoyé !", 
            description: "Votre cours est en cours d'examen par nos administrateurs." 
        });
    } else {
        toast({ 
            variant: 'destructive', 
            title: "Erreur", 
            description: result.error 
        });
    }
    setIsSubmittingReview(false);
  };
  
  if (isLoading) {
    return (
        <div className="flex justify-center items-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    );
  }

  if (error || !course) {
    return <div className="text-center text-destructive py-20">Impossible de charger le cours.</div>;
  }
  
  if (course.instructorId !== currentUser?.uid) {
    return <div className="text-center text-destructive py-20">Vous n'avez pas la permission de modifier ce cours.</div>
  }

  const isDraft = course.status === 'Draft';
  const isPending = course.status === 'Pending Review';
  const isPublished = course.status === 'Published';

  return (
    <div className="space-y-8 bg-slate-50 dark:bg-slate-900/50 p-6 -m-6 rounded-2xl min-h-full">
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" asChild className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-xl">
                    <Link href="/instructor/courses"><ArrowLeft className="h-4 w-4" /></Link>
                </Button>
                <div>
                    <h1 className="text-2xl font-black text-slate-900 dark:text-white line-clamp-1 uppercase tracking-tight">{course.title}</h1>
                    <div className="flex items-center gap-2 mt-1">
                        <Badge className={cn(
                            "text-[9px] font-black uppercase px-2 py-0 border-none",
                            isPublished ? "bg-green-500/10 text-green-500" : isPending ? "bg-amber-500/10 text-amber-500" : "bg-slate-500/10 text-slate-500"
                        )}>
                            {isPublished ? 'Publié' : isPending ? 'En attente de validation' : 'Brouillon'}
                        </Badge>
                    </div>
                </div>
            </div>

            {isDraft && (
                <Button 
                    onClick={handleSubmitForReview} 
                    disabled={isSubmittingReview}
                    className="h-12 px-8 rounded-xl bg-primary hover:bg-primary/90 text-white font-black uppercase text-xs tracking-widest shadow-xl shadow-primary/20 transition-all active:scale-95"
                >
                    {isSubmittingReview ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                        <Send className="h-4 w-4 mr-2" />
                    )}
                    Soumettre pour validation
                </Button>
            )}

            {isPublished && (
                <div className="flex items-center gap-2 text-green-500 bg-green-500/5 px-4 py-2 rounded-xl border border-green-500/20">
                    <CheckCircle2 className="h-5 w-5" />
                    <span className="text-xs font-bold uppercase tracking-widest">En ligne</span>
                </div>
            )}
        </header>

        <Tabs defaultValue="content" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-slate-200 dark:bg-slate-800 p-1 rounded-xl h-auto">
                <TabsTrigger value="content" className="py-2.5 font-bold uppercase text-[10px] tracking-widest">Contenu du Cours</TabsTrigger>
                <TabsTrigger value="details" className="py-2.5 font-bold uppercase text-[10px] tracking-widest">Détails du Cours</TabsTrigger>
            </TabsList>
            <TabsContent value="details" className="mt-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                <CourseForm mode="edit" initialData={course} onSubmit={handleUpdateCourse} />
            </TabsContent>
            <TabsContent value="content" className="mt-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                <ContentManager courseId={courseId} />
            </TabsContent>
        </Tabs>
    </div>
  );
}
