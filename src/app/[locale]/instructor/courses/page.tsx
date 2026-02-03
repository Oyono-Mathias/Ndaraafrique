
'use client';

/**
 * @fileOverview Liste des cours du formateur optimisée Android.
 * Focus sur le statut et l'engagement (étudiants inscrits).
 */

import { useState, useMemo, useEffect } from 'react';
import { useRole } from '@/context/RoleContext';
import { getFirestore, collection, query, where, onSnapshot, getDocs } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Search, Users, BookOpen, MoreVertical, Edit3, Trash2 } from 'lucide-react';
import type { Course, Enrollment } from '@/lib/types';
import Image from 'next/image';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export default function InstructorCoursesAndroid() {
  const { currentUser } = useRole();
  const db = getFirestore();
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrollmentCounts, setEnrollmentCounts] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!currentUser?.uid) return;

    setIsLoading(true);
    const q = query(collection(db, 'courses'), where('instructorId', '==', currentUser.uid));

    const unsubscribe = onSnapshot(q, async (snap) => {
      const courseData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course));
      setCourses(courseData);
      
      // On récupère aussi les comptages d'étudiants en arrière-plan
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
    });

    return () => unsubscribe();
  }, [currentUser?.uid, db]);

  const filteredCourses = useMemo(() => {
    return courses.filter(c => c.title.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [courses, searchTerm]);

  return (
    <div className="flex flex-col gap-6 p-4 pb-24 relative min-h-screen">
      <header className="pt-2 space-y-4">
        <h1 className="text-2xl font-black text-white">Mes Cours</h1>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <Input 
            placeholder="Rechercher un cours..." 
            className="pl-10 bg-slate-900 border-slate-800 h-12 rounded-xl"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </header>

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-40 w-full rounded-2xl bg-slate-900" />)}
        </div>
      ) : filteredCourses.length > 0 ? (
        <div className="grid gap-4">
          {filteredCourses.map(course => (
            <CardCourse key={course.id} course={course} students={enrollmentCounts[course.id] || 0} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center text-slate-500 bg-slate-900/20 rounded-3xl border border-dashed border-slate-800">
          <BookOpen className="h-12 w-12 mb-4 opacity-20" />
          <p className="text-sm font-medium">Vous n'avez pas encore créé de cours.</p>
          <Button asChild className="mt-4 rounded-xl px-6">
              <Link href="/instructor/courses/create">Créer mon premier cours</Link>
          </Button>
        </div>
      )}

      {/* --- BOUTON FLOTTANT (FAB) ANDROID --- */}
      <Button asChild className="fixed bottom-20 right-6 h-14 w-14 rounded-full shadow-2xl shadow-primary/40 bg-primary hover:bg-primary/90 z-50 transition-transform active:scale-95">
        <Link href="/instructor/courses/create">
          <Plus className="h-8 w-8 text-white" />
          <span className="sr-only">Nouveau cours</span>
        </Link>
      </Button>
    </div>
  );
}

function CardCourse({ course, students }: { course: Course, students: number }) {
    const statusLabel = course.status === 'Published' ? 'Publié' : course.status === 'Pending Review' ? 'En revue' : 'Brouillon';
    const statusColor = course.status === 'Published' ? 'bg-green-500/10 text-green-400' : course.status === 'Pending Review' ? 'bg-amber-500/10 text-amber-400' : 'bg-slate-500/10 text-slate-400';

    return (
        <Card className="bg-slate-900 border-slate-800 overflow-hidden">
            <CardContent className="p-0 flex items-stretch h-36">
                <div className="relative w-32 flex-shrink-0 bg-slate-800">
                    <Image src={course.imageUrl || `https://picsum.photos/seed/${course.id}/200/200`} alt={course.title} fill className="object-cover" />
                </div>
                <div className="flex-1 p-4 flex flex-col justify-between min-w-0">
                    <div>
                        <Badge className={cn("text-[10px] uppercase font-bold px-2 py-0 border-none mb-2", statusColor)}>
                            {statusLabel}
                        </Badge>
                        <h3 className="text-sm font-bold text-white line-clamp-2 leading-snug">{course.title}</h3>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-1.5 text-slate-500">
                            <Users className="h-3.5 w-3.5" />
                            <span className="text-xs font-bold">{students} <span className="font-normal opacity-60">étudiants</span></span>
                        </div>
                        <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800" asChild>
                                <Link href={`/instructor/courses/edit/${course.id}`}><Edit3 className="h-4 w-4" /></Link>
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10">
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
