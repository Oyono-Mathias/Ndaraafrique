
'use client';

import { CourseForm } from '@/components/instructor/CourseForm';
import { createCourseAction } from '@/actions/instructorActions';
import { useRole } from '@/context/RoleContext';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function CreateCoursePage() {
  const { currentUser, isUserLoading } = useRole();
  const { toast } = useToast();
  const router = useRouter();

  if (isUserLoading) return null;

  // Sécurité : Un formateur non approuvé ne peut pas créer de cours
  if (!currentUser?.isInstructorApproved) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4 space-y-6">
        <Alert variant="destructive" className="bg-red-500/10 border-red-500/20 text-red-400">
          <ShieldAlert className="h-5 w-5" />
          <AlertTitle className="font-bold uppercase tracking-tight">Accès restreint</AlertTitle>
          <AlertDescription className="mt-2 text-sm opacity-90 leading-relaxed">
            Votre compte formateur n'a pas encore été approuvé par nos administrateurs. 
            Vous recevrez une notification dès que vous pourrez commencer à publier vos formations.
          </AlertDescription>
        </Alert>
        <Button variant="outline" asChild className="w-full h-12 rounded-xl">
          <Link href="/instructor/dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour au tableau de bord
          </Link>
        </Button>
      </div>
    );
  }

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
