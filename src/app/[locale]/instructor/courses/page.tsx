'use client';

/**
 * @fileOverview Liste des cours du formateur (Format Liste Unifié).
 * ✅ STYLE : Utilise le format LISTE (Admin style).
 */

import { useState, useMemo, useEffect } from 'react';
import { useRole } from '@/context/RoleContext';
import { getFirestore, collection, query, where, onSnapshot, doc, deleteDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Search, BookOpen, Edit3, Trash2 } from 'lucide-react';
import type { Course } from '@/lib/types';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { CourseCard } from '@/components/cards/CourseCard';
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

export default function InstructorCoursesPage() {
  const { currentUser } = useRole();
  const db = getFirestore();
  const { toast } = useToast();
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!currentUser?.uid) return;

    setIsLoading(true);
    const q = query(collection(db, 'courses'), where('instructorId', '==', currentUser.uid));

    const unsubscribe = onSnapshot(q, (snap) => {
      const courseData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course));
      const sortedCourses = courseData.sort((a, b) => {
          const dateA = (a.createdAt as any)?.toDate?.() || new Date(0);
          const dateB = (b.createdAt as any)?.toDate?.() || new Date(0);
          return dateB.getTime() - dateA.getTime();
      });
      setCourses(sortedCourses);
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
          toast({ title: "Formation supprimée" });
      } catch (error) {
          toast({ variant: 'destructive', title: "Erreur" });
      }
  };

  return (
    <div className="flex flex-col gap-6 pb-24">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-3xl font-black text-foreground uppercase tracking-tight">Mon Catalogue</h1>
          <p className="text-muted-foreground text-sm font-medium">Gérez vos formations et suivez vos élèves.</p>
        </div>
        <Button asChild className="h-12 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-black uppercase text-[10px] tracking-widest shadow-xl shadow-primary/20">
            <Link href="/instructor/courses/create">
                <Plus className="mr-2 h-4 w-4" /> Créer un cours
            </Link>
        </Button>
      </header>

      <div className="relative max-w-md">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input 
          placeholder="Filtrer mes cours..." 
          className="h-12 pl-12 rounded-xl"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-2xl" />)}
        </div>
      ) : filteredCourses.length > 0 ? (
        <div className="grid gap-4 animate-in fade-in duration-700">
          {filteredCourses.map(course => (
            <CourseCard 
                key={course.id} 
                course={course} 
                instructor={null}
                variant="list"
                actions={
                    <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg bg-background/80 backdrop-blur-sm shadow-sm" asChild>
                            <Link href={`/instructor/courses/edit/${course.id}`}><Edit3 className="h-3.5 w-3.5" /></Link>
                        </Button>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white shadow-sm">
                                    <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Supprimer ?</AlertDialogTitle>
                                    <AlertDialogDescription>Voulez-vous vraiment supprimer "{course.title}" ? Cette action est irréversible.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeleteCourse(course.id)} className="bg-red-600">Supprimer</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                }
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center bg-muted/20 rounded-[3rem] border-2 border-dashed border-border animate-in zoom-in duration-500">
          <BookOpen className="h-16 w-16 text-muted-foreground mb-6 opacity-20" />
          <h3 className="text-xl font-black uppercase tracking-tight">Votre catalogue est vide</h3>
          <p className="text-sm text-muted-foreground mt-2 max-w-[250px] mx-auto">Partagez votre expertise avec la communauté Ndara Afrique.</p>
          <Button asChild className="mt-8 rounded-xl h-12 px-8 font-black uppercase text-[10px] tracking-widest shadow-xl">
              <Link href="/instructor/courses/create">Lancer mon premier cours</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
