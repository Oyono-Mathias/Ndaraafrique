
'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRole } from '@/context/RoleContext';
import { useCollection, useMemoFirebase } from '@/firebase';
import { getFirestore, collection, query, where, getCountFromServer, deleteDoc, doc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { PlusCircle, Search, Users, BookOpen, Trash2, Edit } from 'lucide-react';
import type { Course } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';


function CourseCard({ course, onDelete }: { course: Course, onDelete: (courseId: string) => void }) {
  const [enrollmentCount, setEnrollmentCount] = useState(0);
  const [loadingCount, setLoadingCount] = useState(true);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const db = getFirestore();

  useEffect(() => {
    const getCount = async () => {
      setLoadingCount(true);
      const q = query(collection(db, 'enrollments'), where('courseId', '==', course.id));
      const snapshot = await getCountFromServer(q);
      setEnrollmentCount(snapshot.data().count);
      setLoadingCount(false);
    };
    getCount();
  }, [course.id, db]);

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
      <div className="bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-1 flex flex-col">
        <Link href={`/instructor/courses/edit/${course.id}`} className="block">
            <Image
              src={course.imageUrl || `https://picsum.photos/seed/${course.id}/300/170`}
              alt={course.title}
              width={300}
              height={170}
              className="aspect-video object-cover w-full"
            />
        </Link>
        <div className="p-4 flex flex-col flex-grow">
          <h3 className="font-bold text-base text-slate-800 dark:text-slate-100 line-clamp-2 h-12">{course.title}</h3>
          <div className="flex-grow"></div>
          <div className="flex items-center justify-between mt-3 text-xs text-slate-500 dark:text-slate-400">
            {loadingCount ? <Skeleton className="h-4 w-20" /> : (
                <div className="flex items-center gap-1.5">
                    <Users className="w-4 h-4" />
                    <span>{`${enrollmentCount} étudiant(s)`}</span>
                </div>
            )}
            <span className="font-semibold">{course.price > 0 ? `${course.price.toLocaleString('fr-FR')} XOF` : 'Gratuit'}</span>
          </div>
        </div>
        <div className="p-2 border-t border-slate-100 dark:border-slate-700/50 flex gap-1">
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

  const coursesQuery = useMemoFirebase(
    () => currentUser?.uid
      ? query(collection(db, 'courses'), where('instructorId', '==', currentUser.uid))
      : null,
    [db, currentUser?.uid]
  );
  const { data: courses, isLoading: coursesLoading } = useCollection<Course>(coursesQuery);

  const filteredCourses = useMemo(() => {
    if (!courses) return [];
    return courses.filter(course =>
      course.title?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [courses, searchTerm]);
  
  const handleDeleteCourse = async (courseId: string) => {
    try {
        await deleteDoc(doc(db, 'courses', courseId));
        // Note: Subcollections like sections, lectures, etc., are not deleted automatically.
        // A cloud function would be needed for cascading deletes in a production app.
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
    <div className="p-4 md:p-6 space-y-6 dark:bg-[#0f172a] min-h-screen">
      <header className="flex justify-between items-center">
        <div>
            <h1 className="text-3xl font-bold dark:text-white">Mes cours</h1>
            <p className="text-slate-500 dark:text-slate-400">Gérez, modifiez et créez de nouvelles formations ici.</p>
        </div>
         <Button asChild className="hidden md:flex">
            <Link href="/instructor/courses/create">
                <PlusCircle className="mr-2 h-4 w-4" />
                Créer un nouveau cours
            </Link>
         </Button>
      </header>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          placeholder="Rechercher un cours..."
          className="pl-10 dark:bg-slate-800 border-slate-200 dark:border-slate-700 dark:text-white placeholder:text-slate-500 focus-visible:ring-primary"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-72 w-full rounded-xl bg-slate-100 dark:bg-slate-800" />
          ))}
        </div>
      ) : filteredCourses.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredCourses.map(course => (
            <CourseCard key={course.id} course={course} onDelete={handleDeleteCourse} />
          ))}
        </div>
      ) : (
        <div className="text-center py-20 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl mt-8">
          <BookOpen className="mx-auto h-12 w-12 text-slate-400" />
          <h3 className="mt-4 text-lg font-semibold text-slate-600 dark:text-slate-300">Aucun cours trouvé</h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Cliquez sur "Créer un nouveau cours" pour commencer.</p>
        </div>
      )}
      
      <Button asChild className="fixed bottom-6 right-6 h-16 w-16 rounded-full shadow-lg bg-primary hover:bg-primary/90 md:hidden">
        <Link href="/instructor/courses/create">
          <PlusCircle className="h-8 w-8" />
          <span className="sr-only">Créer un nouveau cours</span>
        </Link>
      </Button>
    </div>
  );
}
