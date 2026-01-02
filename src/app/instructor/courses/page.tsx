
'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRole } from '@/context/RoleContext';
import { useCollection, useMemoFirebase } from '@/firebase';
import { getFirestore, collection, query, where, getCountFromServer } from 'firebase/firestore';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { PlusCircle, Search, Users, BookOpen } from 'lucide-react';
import type { Course } from '@/lib/types';


function CourseCard({ course }: { course: Course }) {
  const [enrollmentCount, setEnrollmentCount] = useState(0);
  const [loadingCount, setLoadingCount] = useState(true);
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

  return (
    <Card className="overflow-hidden transition-shadow duration-300 hover:shadow-lg rounded-xl border-slate-200 bg-white">
      <Link href={`/instructor/courses/edit/${course.id}`} className="block">
        <div className="relative">
          <Image
            src={course.imageUrl || `https://picsum.photos/seed/${course.id}/600/400`}
            alt={course.title}
            width={600}
            height={400}
            className="aspect-video object-cover w-full"
          />
        </div>
        <CardContent className="p-4">
          <h3 className="font-bold text-lg truncate text-slate-800">{course.title}</h3>
        </CardContent>
      </Link>
       <CardContent className="p-4 pt-0">
         <div className="flex items-center justify-between">
             {loadingCount ? <Skeleton className="h-5 w-24" /> : (
                <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Users className="w-4 h-4 text-blue-600" />
                    <span>{enrollmentCount} étudiant(s)</span>
                </div>
            )}
          <Button variant="outline" size="sm" asChild className="text-blue-600 border-blue-200 hover:bg-blue-50 hover:text-blue-700">
             <Link href={`/instructor/courses/edit/${course.id}`}>Modifier</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function InstructorCoursesPage() {
  const { formaAfriqueUser, isUserLoading } = useRole();
  const db = getFirestore();
  const [searchTerm, setSearchTerm] = useState('');

  const coursesQuery = useMemoFirebase(
    () => formaAfriqueUser?.uid
      ? query(collection(db, 'courses'), where('instructorId', '==', formaAfriqueUser.uid))
      : null,
    [db, formaAfriqueUser?.uid]
  );
  const { data: courses, isLoading: coursesLoading } = useCollection<Course>(coursesQuery);

  const filteredCourses = useMemo(() => {
    if (!courses) return [];
    return courses.filter(course =>
      course.title?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [courses, searchTerm]);

  const isLoading = isUserLoading || coursesLoading;

  return (
    <div className="p-6 space-y-6 bg-white min-h-screen">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Mes Cours</h1>
          <p className="text-slate-500">Gérez vos formations et suivez les inscriptions.</p>
        </div>
        <Button asChild className="bg-blue-600 hover:bg-blue-700 text-white">
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
          className="pl-10 bg-slate-100 border-slate-200 text-slate-900 placeholder:text-slate-500 focus-visible:ring-blue-500"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-[250px] w-full rounded-xl bg-slate-100" />
          ))}
        </div>
      ) : filteredCourses.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.map(course => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>
      ) : (
        <div className="text-center py-20 border-2 border-dashed border-slate-200 rounded-xl mt-8">
          <BookOpen className="mx-auto h-12 w-12 text-slate-400" />
          <h3 className="mt-4 text-lg font-semibold text-slate-600">Aucun cours trouvé</h3>
          <p className="mt-1 text-sm text-slate-500">Commencez par créer votre premier contenu pédagogique.</p>
        </div>
      )}
    </div>
  );
}
