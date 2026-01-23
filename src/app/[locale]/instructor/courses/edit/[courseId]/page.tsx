
'use client';

import { useMemo } from 'react';
import { CourseForm } from '@/components/instructor/CourseForm';
import { ContentManager } from '@/components/instructor/course-content/ContentManager';
import { updateCourseAction } from '@/actions/instructorActions';
import { useDoc } from '@/firebase';
import { doc, getFirestore } from 'firebase/firestore';
import type { Course } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, ArrowLeft } from 'lucide-react';
import { useRole } from '@/context/RoleContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Link } from 'next-intl/navigation';

export default function EditCoursePage({ params }: { params: { courseId: string } }) {
  const { courseId } = params;
  const { currentUser } = useRole();
  const db = getFirestore();
  const { toast } = useToast();

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
  
  if (isLoading) {
    return (
        <div className="flex justify-center items-center h-full">
            <Loader2 className="h-8 w-8 animate-spin" />
        </div>
    );
  }

  if (error || !course) {
    return <div className="text-center text-destructive">Impossible de charger le cours.</div>;
  }
  
  if (course.instructorId !== currentUser?.uid) {
    return <div className="text-center text-destructive">Vous n'avez pas la permission de modifier ce cours.</div>
  }

  return (
    <div className="space-y-8 bg-slate-50 dark:bg-slate-900/50 p-6 -m-6 rounded-2xl min-h-full">
        <header className="flex items-center gap-4">
            <Button variant="outline" size="icon" asChild className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                <Link href="/instructor/courses"><ArrowLeft className="h-4 w-4" /></Link>
            </Button>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white line-clamp-1">{course.title}</h1>
        </header>

        <Tabs defaultValue="content" className="w-full">
            <TabsList className="grid w-full grid-cols-2 dark:bg-slate-800 dark:text-slate-300 dark:data-[state=active]:bg-background">
                <TabsTrigger value="content">Contenu du Cours</TabsTrigger>
                <TabsTrigger value="details">Détails du Cours</TabsTrigger>
            </TabsList>
            <TabsContent value="details" className="mt-6">
                <CourseForm mode="edit" initialData={course} onSubmit={handleUpdateCourse} />
            </TabsContent>
            <TabsContent value="content" className="mt-6">
                <ContentManager courseId={courseId} />
            </TabsContent>
        </Tabs>
    </div>
  );
}
