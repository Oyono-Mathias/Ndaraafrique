
'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRole } from '@/context/RoleContext';
import { useCollection } from '@/firebase';
import { getFirestore, collection, query, where, getCountFromServer, deleteDoc, doc, getDocs } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { PlusCircle, Search, Users, BookOpen, Trash2, Edit } from 'lucide-react';
import type { Course, Enrollment } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

function InstructorCourseCard({ course, studentCount, onDelete }: { course: Course, studentCount: number, onDelete: (courseId: string) => void }) {
  const [isAlertOpen, setIsAlertOpen] = useState(false);

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsAlertOpen(true);
  };
  
  const confirmDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDelete(course.id);
    setIsAlertOpen(false);
  }

  return (
    <>
      <div className="bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/80 overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-primary/10 hover:-translate-y-1.5 flex flex-col">
        <Link href={`/instructor/courses/edit/${course.id}`} className="block">
            <div className="aspect-video relative">
                <Image
                  src={course.imageUrl || `https://picsum.photos/seed/${course.id}/400/225`}
                  alt={course.title}
                  fill
                  className="object-cover"
                />
            </div>
        </Link>
        <div className="p-5 flex flex-col flex-grow">
          <h3 className="font-semibold text-lg text-slate-800 dark:text-slate-100 line-clamp-2 h-14">{course.title}</h3>
          
          <div className="flex items-center justify-between mt-4 text-sm text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span>{`${studentCount} étudiant(s)`}</span>
            </div>
            <span className="font-bold text-base text-slate-800 dark:text-white">{course.price > 0 ? `${course.price.toLocaleString('fr-FR')} XOF` : 'Gratuit'}</span>
          </div>
        </div>
        <div className="p-3 border-t border-slate-100 dark:border-slate-700/50 grid grid-cols-2 gap-2">
             <Button variant="ghost" size="sm" className="w-full justify-center text-slate-600 hover:text-primary dark:text-slate-300 dark:hover:text-primary" asChild>
                <Link href={`/instructor/courses/edit/${course.id}`}><Edit className="h-4 w-4 mr-2" /> Éditer</Link>
             </Button>
             <Button variant="ghost" size="sm" className="w-full justify-center text-slate-600 hover:text-destructive dark:text-slate-300 dark:hover:text-destructive" onClick={handleDeleteClick}>
                 <Trash2 className="h-4 w-4 mr-2" /> Supprimer
             </Button>
        </div>
      </div>
      
      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
          <AlertDialogContent>
              <AlertDialogHeader>
                  <AlertDialogTitle>Confirmer la suppression ?</AlertDialogTitle>
                  <AlertDialogDescription>
                      La suppression du cours "{course.title}" est définitive et irréversible.
                  </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">
                      Supprimer
                  </AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default function InstructorCoursesPage() {
  const { currentUser, isUserLoading } = useRole();
  const db = getFirestore();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [enrollmentCounts, setEnrollmentCounts] = useState<Record<string, number>>({});

  const coursesQuery = useMemo(
    () => currentUser?.uid
      ? query(collection(db, 'courses'), where('instructorId', '==', currentUser.uid))
      : null,
    [db, currentUser?.uid]
  );
  const { data: courses, isLoading: coursesLoading } = useCollection<Course>(coursesQuery);

  useEffect(() => {
    if (!courses || courses.length === 0) return;

    const fetchEnrollments = async () => {
        const courseIds = courses.map(c => c.id);
        const counts: Record<string, number> = {};

        for (let i = 0; i < courseIds.length; i += 30) {
            const chunk = courseIds.slice(i, i + 30);
            if(chunk.length > 0) {
                const q = query(collection(db, 'enrollments'), where('courseId', 'in', chunk));
                const snapshot = await getDocs(q);
                snapshot.forEach(doc => {
                    const enrollment = doc.data() as Enrollment;
                    counts[enrollment.courseId] = (counts[enrollment.courseId] || 0) + 1;
                });
            }
        }
        setEnrollmentCounts(counts);
    };

    fetchEnrollments();
  }, [courses, db]);

  const filteredCourses = useMemo(() => {
    if (!courses) return [];
    return courses.filter(course =>
      course.title?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [courses, searchTerm]);
  
  const handleDeleteCourse = async (courseId: string) => {
    try {
        await deleteDoc(doc(db, 'courses', courseId));
        toast({
            title: "Cours supprimé",
            description: "Le cours a été retiré de la plateforme.",
        });
    } catch (error) {
        console.error("Error deleting course:", error);
        toast({
            variant: "destructive",
            title: "Erreur",
            description: "Impossible de supprimer le cours.",
        });
    }
  };

  const isLoading = isUserLoading || coursesLoading;

  return (
    <div className="space-y-8 bg-slate-50 dark:bg-slate-900/50 p-6 -m-6 rounded-2xl min-h-full">
      <header className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Mes Cours</h1>
            <p className="text-slate-500 dark:text-slate-400">Gérez et développez vos formations.</p>
        </div>
         <Button asChild className="h-11 shadow-lg shadow-primary/20">
            <Link href="/instructor/courses/create">
                <PlusCircle className="mr-2 h-5 w-5" />
                Créer un nouveau cours
            </Link>
         </Button>
      </header>

      <div className="relative max-w-md">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
        <Input
          placeholder="Rechercher un cours par titre..."
          className="h-12 pl-12 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-base placeholder:text-slate-500 focus-visible:ring-primary/80"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-[350px] w-full rounded-2xl bg-slate-200 dark:bg-slate-800" />
          ))}
        </div>
      ) : filteredCourses.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredCourses.map(course => (
            <InstructorCourseCard 
                key={course.id} 
                course={course} 
                studentCount={enrollmentCounts[course.id] || 0}
                onDelete={handleDeleteCourse} 
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-20 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl mt-10 flex flex-col items-center">
          <BookOpen className="mx-auto h-16 w-16 text-slate-400" />
          <h3 className="mt-4 text-xl font-semibold text-slate-700 dark:text-slate-300">Vous n’avez pas encore créé de cours</h3>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 max-w-sm">Commencez à partager votre savoir en créant votre première formation dès aujourd'hui.</p>
           <Button asChild className="mt-6">
            <Link href="/instructor/courses/create">
                <PlusCircle className="mr-2 h-4 w-4" />
                Créer votre premier cours
            </Link>
         </Button>
        </div>
      )}
      
      <Button asChild className="fixed bottom-6 right-6 h-16 w-16 rounded-full shadow-lg bg-primary hover:bg-primary/90 md:hidden z-20">
        <Link href="/instructor/courses/create">
          <PlusCircle className="h-8 w-8" />
          <span className="sr-only">Créer un nouveau cours</span>
        </Link>
      </Button>
    </div>
  );
}
