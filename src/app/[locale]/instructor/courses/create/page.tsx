'use client';

/**
 * @fileOverview Page de création de cours (Vue Android-First).
 * ✅ SÉCURITÉ : Vérifie si le formateur est approuvé avant d'autoriser la création.
 */

import { CourseForm } from '@/components/instructor/CourseForm';
import { createCourseAction } from '@/actions/instructorActions';
import { useRole } from '@/context/RoleContext';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { ShieldAlert, ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function CreateCoursePage() {
  const { currentUser, isUserLoading } = useRole();
  const { toast } = useToast();
  const router = useRouter();

  if (isUserLoading) {
    return (
        <div className="h-[60vh] flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    );
  }

  // Sécurité : Un formateur non approuvé ne peut pas encore créer de cours
  if (!currentUser?.isInstructorApproved && currentUser?.role !== 'admin') {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="flex justify-center mb-8">
            <div className="p-6 bg-red-500/10 rounded-full border-4 border-red-500/20">
                <ShieldAlert className="h-16 w-16 text-red-500" />
            </div>
        </div>
        <div className="text-center space-y-4">
            <h1 className="text-3xl font-black text-white uppercase tracking-tight">Accès restreint</h1>
            <p className="text-slate-400 max-w-md mx-auto leading-relaxed">
                Votre compte formateur est en cours d'examen par notre équipe pédagogique. 
                Dès approbation, vous pourrez créer vos formations et partager votre savoir.
            </p>
        </div>
        <Button variant="outline" asChild className="w-full h-14 rounded-2xl bg-slate-900 border-slate-800 text-slate-300 font-bold uppercase text-[10px] tracking-widest mt-8">
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
      toast({ variant: 'destructive', title: 'Erreur', description: 'Session expirée. Veuillez vous reconnecter.' });
      return;
    }
    
    const result = await createCourseAction({ formData: data, instructorId: currentUser.uid });
    
    if (result.success && result.courseId) {
      toast({ 
        title: 'Félicitations Ndara !', 
        description: 'Votre cours est initialisé. Ajoutez maintenant vos leçons.' 
      });
      router.push(`/instructor/courses/edit/${result.courseId}`);
    } else {
      toast({ variant: 'destructive', title: 'Erreur', description: result.message });
    }
  };

  return (
    <div className="min-h-full bg-slate-950/50 -m-6 p-6 rounded-2xl">
        <CourseForm mode="create" onSubmit={handleCreateCourse} />
    </div>
  );
}
