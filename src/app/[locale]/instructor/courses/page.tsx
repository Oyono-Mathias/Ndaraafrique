
'use client';

/**
 * @fileOverview Liste des cours du formateur optimisée Android.
 * Focus sur le statut et l'engagement (étudiants inscrits).
 * Ajout d'une boîte de dialogue de confirmation pour la suppression.
 */

import { useState, useMemo, useEffect } from 'react';
import { useRole } from '@/context/RoleContext';
import { getFirestore, collection, query, where, onSnapshot, getDocs, doc, deleteDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Search, Users, BookOpen, MoreVertical, Edit3, Trash2, AlertCircle, Loader2 } from 'lucide-react';
import type { Course, Enrollment } from '@/lib/types';
import Image from 'next/image';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function InstructorCoursesAndroid() {
  const { currentUser } = useRole();
  const db = getFirestore();
  const { toast } = useToast();
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrollmentCounts, setEnrollmentCounts] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!currentUser?.uid) return;

    setIsLoading(true);
    // On récupère tous les cours de l'instructeur
    const q = query(collection(db, 'courses'), where('instructorId', '==', currentUser.uid));

    const unsubscribe = onSnapshot(q, async (snap) => {
      const courseData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course));
      
      // Tri chronologique en mémoire (plus récent en premier)
      const sortedCourses = courseData.sort((a, b) => {
          const dateA = (a.createdAt as any)?.toDate?.() || new Date(0);
          const dateB = (b.createdAt as any)?.toDate?.() || new Date(0);
          return dateB.getTime() - dateA.getTime();
      });

      setCourses(sortedCourses);
      
      // Récupération asynchrone du nombre d'inscrits par cours
      if (courseData.length > 0) {
          const counts: Record<string, number> = {};
          const enrollQuery = query(collection(db, 'enrollments'), where('instructorId', '==', currentUser.uid));
          const enrollSnap = await getDocs(enrollQuery);
          enrollSnap.forEach(doc => {
              const e = doc.data() as Enrollment;
              counts[e.courseId] = (counts[e.courseId] || 0) + 1;
          });
          setEnrollmentCounts(counts);
      }
      setIsLoading(false);
    }, (error) => {
        console.error("Error fetching instructor courses:", error);
        setIsLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser?.uid, db]);

  const filteredCourses = useMemo(() => {
    return courses.filter(c => c.title.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [courses, searchTerm]);

  const handleDeleteCourse = async (courseId: string) => {
      try {
          await deleteDoc(doc(db, 'courses', courseId));
          toast({ title: "Cours supprimé", description: "La formation a été retirée de votre catalogue." });
      } catch (error) {
          toast({ variant: 'destructive', title: "Erreur", description: "Impossible de supprimer ce cours." });
      }
  };

  return (
    <div className="flex flex-col gap-6 p-4 pb-24 relative min-h-screen bg-grainy">
      <header className="pt-2 space-y-4">
        <h1 className="text-3xl font-black text-white uppercase tracking-tight">Mon Catalogue</h1>
        <p className="text-slate-500 text-sm font-medium -mt-2">Gérez et suivez l'évolution de vos formations.</p>
        
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-600" />
          <Input 
            placeholder="Rechercher une formation..." 
            className="h-14 pl-12 bg-slate-900 border-slate-800 rounded-2xl text-white placeholder:text-slate-600 shadow-xl focus-visible:ring-primary/30"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </header>

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-40 w-full rounded-[2rem] bg-slate-900" />)}
        </div>
      ) : filteredCourses.length > 0 ? (
        <div className="grid gap-4 animate-in fade-in duration-700">
          {filteredCourses.map(course => (
            <CardCourse 
                key={course.id} 
                course={course} 
                students={enrollmentCounts[course.id] || 0} 
                onDelete={() => handleDeleteCourse(course.id)}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center text-slate-500 bg-slate-900/20 rounded-[3rem] border-2 border-dashed border-slate-800 animate-in zoom-in duration-500">
          <div className="p-6 bg-slate-800/50 rounded-full mb-6">
            <BookOpen className="h-16 w-16 text-slate-700" />
          </div>
          <h3 className="text-xl font-black text-white uppercase tracking-tight">Catalogue vide</h3>
          <p className="text-sm font-medium mt-2 max-w-[200px] mx-auto">Vous n'avez pas encore créé de formation. Partagez votre savoir !</p>
          <Button asChild className="mt-8 rounded-xl h-12 px-8 bg-primary hover:bg-primary/90 text-white font-black uppercase text-[10px] tracking-widest shadow-xl shadow-primary/20">
              <Link href="/instructor/courses/create">Créer mon premier cours</Link>
          </Button>
        </div>
      )}

      {/* --- BOUTON FLOTTANT (FAB) ANDROID --- */}
      <Button asChild className="fixed bottom-24 right-6 h-16 w-16 rounded-full shadow-2xl shadow-primary/40 bg-primary hover:bg-primary/90 z-50 transition-transform active:scale-90 flex items-center justify-center p-0">
        <Link href="/instructor/courses/create">
          <Plus className="h-8 w-8 text-white" />
          <span className="sr-only">Nouveau cours</span>
        </Link>
      </Button>
    </div>
  );
}

function CardCourse({ course, students, onDelete }: { course: Course, students: number, onDelete: () => void }) {
    const statusLabel = course.status === 'Published' ? 'En ligne' : course.status === 'Pending Review' ? 'En examen' : 'Brouillon';
    const statusColor = course.status === 'Published' ? 'bg-green-500/10 text-green-400' : course.status === 'Pending Review' ? 'bg-amber-500/10 text-amber-400' : 'bg-slate-500/10 text-slate-400';

    return (
        <Card className="bg-slate-900 border-slate-800 overflow-hidden rounded-[2rem] shadow-xl group active:scale-[0.98] transition-all">
            <CardContent className="p-0 flex items-stretch h-40">
                <div className="relative w-36 flex-shrink-0 bg-slate-800">
                    <Image 
                        src={course.imageUrl || `https://picsum.photos/seed/${course.id}/300/300`} 
                        alt={course.title} 
                        fill 
                        className="object-cover transition-transform duration-500 group-hover:scale-110" 
                    />
                    <div className="absolute inset-0 bg-black/20" />
                </div>
                <div className="flex-1 p-5 flex flex-col justify-between min-w-0">
                    <div>
                        <Badge className={cn("text-[9px] uppercase font-black px-2.5 py-0.5 border-none mb-3 tracking-widest", statusColor)}>
                            {statusLabel}
                        </Badge>
                        <h3 className="text-sm font-bold text-white line-clamp-2 leading-tight uppercase tracking-tight group-hover:text-primary transition-colors">
                            {course.title}
                        </h3>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-2 text-slate-500">
                            <div className="p-1.5 bg-slate-800 rounded-lg">
                                <Users className="h-3.5 w-3.5 text-primary" />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-tighter">
                                {students} <span className="opacity-50">Apprenants</span>
                            </span>
                        </div>
                        <div className="flex gap-1.5">
                            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-all" asChild>
                                <Link href={`/instructor/courses/edit/${course.id}`}><Edit3 className="h-4.5 w-4.5" /></Link>
                            </Button>
                            
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all">
                                        <Trash2 className="h-4.5 w-4.5" />
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="bg-slate-900 border-slate-800 rounded-[2rem]">
                                    <AlertDialogHeader>
                                        <AlertDialogTitle className="text-xl font-black text-white uppercase tracking-tight">Supprimer ?</AlertDialogTitle>
                                        <AlertDialogDescription className="text-slate-400 text-sm">
                                            Êtes-vous sûr de vouloir supprimer <b>{course.title}</b> ? Cette action est irréversible et supprimera tout le contenu associé.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter className="mt-4">
                                        <AlertDialogCancel className="bg-slate-800 border-none rounded-xl font-bold uppercase text-[10px] tracking-widest">Annuler</AlertDialogCancel>
                                        <AlertDialogAction onClick={onDelete} className="bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold uppercase text-[10px] tracking-widest shadow-xl shadow-red-900/20">
                                            Confirmer la suppression
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
