
'use client';

import { useMemo } from 'react';
import { CourseForm } from '@/components/instructor/CourseForm';
import { updateCourseAction } from '@/actions/instructorActions';
import { useDoc } from '@/firebase';
import { doc, getFirestore } from 'firebase/firestore';
import type { Course } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2 } from 'lucide-react';
import { useRole } from '@/context/RoleContext';

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

  return <CourseForm mode="edit" initialData={course} onSubmit={handleUpdateCourse} />;
}
