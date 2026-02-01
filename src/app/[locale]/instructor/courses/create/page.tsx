
'use client';

import { CourseForm } from '@/components/instructor/CourseForm';
import { createCourseAction } from '@/actions/instructorActions';
import { useRole } from '@/context/RoleContext';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

export default function CreateCoursePage() {
  const { currentUser } = useRole();
  const { toast } = useToast();
  const router = useRouter();

  const handleCreateCourse = async (data: any) => {
    if (!currentUser) {
      toast({ variant: 'destructive', title: 'Erreur', description: 'Vous devez être connecté.' });
      return;
    }
    
    const result = await createCourseAction({ formData: data, instructorId: currentUser.uid });
    
    if (result.success && result.courseId) {
      toast({ title: 'Cours créé !', description: 'Vous pouvez maintenant ajouter du contenu.' });
      router.push(`/instructor/courses/edit/${result.courseId}`);
    } else {
      toast({ variant: 'destructive', title: 'Erreur', description: result.message });
    }
  };

  return <CourseForm mode="create" onSubmit={handleCreateCourse} />;
}
