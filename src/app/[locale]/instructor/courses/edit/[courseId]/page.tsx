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
import { Loader2, ArrowLeft, Send, CheckCircle2, ShoppingCart, ShieldAlert, AlertTriangle, ShieldCheck } from 'lucide-react';
import { useRole } from '@/context/RoleContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { CourseBuyoutTab } from '@/components/instructor/CourseBuyoutTab';

export default function EditCoursePage({ params }: { params: { courseId: string } }) {
  const { courseId } = params;
  const { currentUser } = useRole();
  const db = getFirestore();
  const { toast } = useToast();
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [rejectionData, setRejectionData] = useState<{ score: number, issues: string[], comment: string } | null>(null);

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
    setRejectionData(null);
    
    const result = await submitCourseForReviewAction({ 
        courseId: course.id, 
        instructorId: currentUser.uid 
    });

    if (result.success) {
        toast({ 
            title: "C'est envoyé !", 
            description: "Votre cours a passé l'audit Mathias et attend la validation finale." 
        });
    } else {
        if (result.issues) {
            setRejectionData({ 
                score: result.score || 0, 
                issues: result.issues, 
                comment: result.comment || "" 
            });
        }
        toast({ 
            variant: 'destructive', 
            title: result.error || "Échec de l'audit", 
            description: "Votre contenu ne respecte pas encore nos standards de qualité." 
        });
    }
    setIsSubmittingReview(false);
  };
  
  if (isLoading) {
    return (
        <div className="flex justify-center items-center h-full min-h-[60vh]">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
    );
  }

  if (error || !course) {
    return <div className="text-center text-destructive py-20 font-black uppercase tracking-widest">Formation introuvable.</div>;
  }
  
  const isAuthorized = course.instructorId === currentUser?.uid || (course.isPlatformOwned && currentUser?.role === 'admin');

  if (!isAuthorized) {
    return (
        <div className="max-w-2xl mx-auto py-20 px-4 text-center space-y-6">
            <div className="p-6 bg-red-500/10 rounded-full inline-block">
                <ShieldAlert className="h-16 w-16 text-red-500" />
            </div>
            <h1 className="text-3xl font-black text-white uppercase tracking-tight">Accès Révoqué</h1>
            <p className="text-slate-400 leading-relaxed">Cette formation appartient désormais à Ndara Afrique.</p>
            <Button asChild className="mt-8 h-14 rounded-2xl bg-primary text-slate-950 font-black uppercase text-xs">
                <Link href="/instructor/courses">Retour au catalogue</Link>
            </Button>
        </div>
    );
  }

  const isDraft = course.status === 'Draft';
  const isPending = course.status === 'Pending Review';
  const isPublished = course.status === 'Published';

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-700">
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" asChild className="bg-slate-900 border-white/5 rounded-2xl h-12 w-12 text-slate-500 hover:text-white transition active:scale-90">
                    <Link href="/instructor/courses"><ArrowLeft className="h-5 w-5" /></Link>
                </Button>
                <div>
                    <h1 className="text-2xl font-black text-white uppercase tracking-tight leading-none line-clamp-1">{course.title}</h1>
                    <div className="flex items-center gap-2 mt-2">
                        <Badge className={cn(
                            "text-[8px] font-black uppercase px-2 py-0.5 border-none",
                            isPublished ? "bg-emerald-500/10 text-emerald-500" : isPending ? "bg-amber-500/10 text-amber-500" : "bg-slate-800 text-slate-500"
                        )}>
                            {isPublished ? 'En ligne' : isPending ? 'En examen' : 'Brouillon'}
                        </Badge>
                        {course.isAiVerified && (
                             <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-primary/10 border border-primary/20">
                                <ShieldCheck className="h-3 w-3 text-primary" />
                                <span className="text-[8px] font-black text-primary uppercase tracking-widest">Audit Mathias OK</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {isDraft && (
                <Button 
                    onClick={handleSubmitForReview} 
                    disabled={isSubmittingReview}
                    className="h-14 px-8 rounded-2xl bg-primary hover:bg-emerald-400 text-slate-950 font-black uppercase text-[10px] tracking-widest shadow-xl shadow-primary/20 transition-all active:scale-95"
                >
                    {isSubmittingReview ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                    Publier le savoir
                </Button>
            )}
        </header>

        {/* --- AI REJECTION PANEL --- */}
        {rejectionData && (
            <div className="bg-red-500/5 border border-red-500/20 rounded-[2.5rem] p-8 space-y-6 animate-in slide-in-from-top-4 duration-500 shadow-2xl">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-500 shadow-inner">
                            <AlertTriangle size={24} />
                        </div>
                        <div>
                            <h3 className="font-black text-white text-lg uppercase tracking-tight">Audit Mathias : Rejet Qualité</h3>
                            <p className="text-red-400 text-[10px] font-black uppercase tracking-widest">Score actuel : {rejectionData.score}/100 (Requis: 80)</p>
                        </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => setRejectionData(null)} className="text-slate-600 hover:text-white"><X className="h-5 w-5"/></Button>
                </div>
                
                <div className="p-6 bg-black/40 rounded-3xl border border-white/5 space-y-4">
                    <p className="text-slate-300 text-sm font-medium italic">"{rejectionData.comment}"</p>
                    <div className="space-y-2">
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Points à corriger :</p>
                        <ul className="space-y-1.5">
                            {rejectionData.issues.map((issue, idx) => (
                                <li key={idx} className="flex items-start gap-3 text-xs text-red-300">
                                    <div className="h-1.5 w-1.5 rounded-full bg-red-500 mt-1.5 shrink-0" />
                                    {issue}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>
        )}

        <Tabs defaultValue="content" className="w-full">
            <TabsList className="bg-slate-900 border-slate-800 p-1 rounded-2xl h-14 w-full sm:w-auto mb-8 shadow-2xl">
                <TabsTrigger value="content" className="rounded-xl font-bold uppercase text-[10px] tracking-widest px-8 h-full">Contenu</TabsTrigger>
                <TabsTrigger value="details" className="rounded-xl font-bold uppercase text-[10px] tracking-widest px-8 h-full">Détails</TabsTrigger>
                {!course.isPlatformOwned && (
                    <TabsTrigger value="buyout" className="rounded-xl font-bold uppercase text-[10px] tracking-widest px-8 h-full text-primary gap-2">
                        <ShoppingCart className="h-3.5 w-3.5" /> Vendre à Ndara
                    </TabsTrigger>
                )}
            </TabsList>
            
            <TabsContent value="content" className="mt-0 outline-none">
                <ContentManager courseId={courseId} />
            </TabsContent>
            
            <TabsContent value="details" className="mt-0 outline-none">
                <CourseForm mode="edit" initialData={course} onSubmit={handleUpdateCourse} />
            </TabsContent>

            {!course.isPlatformOwned && (
                <TabsContent value="buyout" className="mt-0 outline-none">
                    <CourseBuyoutTab course={course} />
                </TabsContent>
            )}
        </Tabs>
    </div>
  );
}

function X({ className, size }: { className?: string, size?: number }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width={size || 24} height={size || 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
        </svg>
    );
}
