
'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRole } from '@/context/RoleContext';
import { useCollection, useMemoFirebase } from '@/firebase';
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BookOpen } from 'lucide-react';
import type { Course, Enrollment } from '@/lib/types';
import type { FormaAfriqueUser } from '@/context/RoleContext';

interface EnrolledCourse extends Course {
  progress: number;
  instructorName: string;
}

function CourseCard({ course }: { course: EnrolledCourse }) {
  const isStarted = course.progress > 0;

  return (
    <Card className="overflow-hidden transition-shadow duration-300 hover:shadow-lg rounded-xl border-slate-200 bg-white">
      <div className="flex flex-row items-center gap-4">
        <Link href={`/courses/${course.id}`} className="block shrink-0">
          <Image
            src={course.imageUrl || `https://picsum.photos/seed/${course.id}/150/100`}
            alt={course.title}
            width={150}
            height={100}
            className="aspect-[3/2] object-cover"
          />
        </Link>
        <div className="flex-1 py-3 pr-4">
            <Link href={`/courses/${course.id}`} className="block group">
                <h3 className="font-bold text-sm text-slate-800 line-clamp-2 group-hover:text-primary transition-colors">{course.title}</h3>
                <p className="text-xs text-slate-500 truncate">Par {course.instructorName}</p>
            </Link>
          <div className="mt-2 space-y-2">
            <Progress value={course.progress} className="h-1" />
            <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">{course.progress}%</span>
                <Button asChild size="sm" variant="outline" className="text-xs h-7">
                    <Link href={`/courses/${course.id}`}>
                        {isStarted ? 'Reprendre' : 'Commencer'}
                    </Link>
                </Button>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}


export default function MyLearningPage() {
  const { formaAfriqueUser, isUserLoading } = useRole();
  const db = getFirestore();
  const [courses, setCourses] = useState<EnrolledCourse[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  // 1. Get student's enrollments
  const enrollmentsQuery = useMemoFirebase(
    () => formaAfriqueUser?.uid
      ? query(collection(db, 'enrollments'), where('studentId', '==', formaAfriqueUser.uid))
      : null,
    [db, formaAfriqueUser?.uid]
  );
  const { data: enrollments, isLoading: enrollmentsLoading } = useCollection<Enrollment>(enrollmentsQuery);

  // 2. Based on enrollments, get courses and instructors
  useEffect(() => {
    if (enrollmentsLoading) return;
    if (!enrollments || enrollments.length === 0) {
      setDataLoading(false);
      setCourses([]);
      return;
    }

    const fetchCourseDetails = async () => {
      setDataLoading(true);
      const courseIds = enrollments.map(e => e.courseId);
      const instructorIds = enrollments.map((e: any) => e.instructorId).filter(Boolean);
      
      const coursesMap = new Map<string, Course>();
      if (courseIds.length > 0) {
          const coursesRef = collection(db, 'courses');
          // Firestore 'in' query limit is 30.
          const q = query(coursesRef, where('__name__', 'in', courseIds.slice(0, 30)));
          const courseSnap = await getDocs(q);
          courseSnap.forEach(doc => coursesMap.set(doc.id, { id: doc.id, ...doc.data() } as Course));
      }
      
      const instructorsMap = new Map<string, FormaAfriqueUser>();
      if (instructorIds.length > 0) {
          const instructorsRef = collection(db, 'users');
          // Firestore 'in' query limit is 30.
          const q = query(instructorsRef, where('uid', 'in', instructorIds.slice(0, 30)));
          const instructorSnap = await getDocs(q);
          instructorSnap.forEach(doc => instructorsMap.set(doc.data().uid, doc.data() as FormaAfriqueUser));
      }

      const populatedCourses: EnrolledCourse[] = enrollments.map(enrollment => {
          const course = coursesMap.get(enrollment.courseId);
          const instructor = instructorsMap.get((enrollment as any).instructorId);
          return {
              ...(course as Course),
              progress: enrollment.progress,
              instructorName: instructor?.fullName || 'Instructeur Inconnu',
          };
      }).filter(c => c.id); // Filter out any cases where course details were not found

      setCourses(populatedCourses);
      setDataLoading(false);
    };

    fetchCourseDetails();

  }, [enrollments, enrollmentsLoading, db]);

  const { inProgressCourses, completedCourses, notStartedCourses } = useMemo(() => {
    const inProgress = courses.filter(c => c.progress > 0 && c.progress < 100);
    const completed = courses.filter(c => c.progress === 100);
    const notStarted = courses.filter(c => c.progress === 0);
    return { inProgressCourses: inProgress, completedCourses: completed, notStartedCourses: notStarted };
  }, [courses]);

  const coursesToDisplay = useMemo(() => {
    return [...inProgressCourses, ...notStartedCourses, ...completedCourses];
  }, [inProgressCourses, notStartedCourses, completedCourses]);

  const isLoading = isUserLoading || dataLoading;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-slate-900">Mon apprentissage</h1>
      </header>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="all">Tous les cours</TabsTrigger>
          <TabsTrigger value="in-progress">En cours</TabsTrigger>
          <TabsTrigger value="completed">Terminés</TabsTrigger>
        </TabsList>

        <div className="mt-6">
            <TabsContent value="all">
                <CourseGrid courses={coursesToDisplay} isLoading={isLoading} />
            </TabsContent>
            <TabsContent value="in-progress">
                <CourseGrid courses={inProgressCourses} isLoading={isLoading} emptyMessage="Vous n'avez aucun cours en cours." />
            </TabsContent>
            <TabsContent value="completed">
                <CourseGrid courses={completedCourses} isLoading={isLoading} emptyMessage="Vous n'avez terminé aucun cours pour le moment."/>
            </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

const CourseGrid = ({ courses, isLoading, emptyMessage = "Vous n'êtes inscrit à aucun cours." }: { courses: EnrolledCourse[], isLoading: boolean, emptyMessage?: string }) => {
    if (isLoading) {
        return (
            <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
                 <Skeleton key={i} className="h-[100px] w-full rounded-xl bg-slate-200" />
            ))}
            </div>
        );
    }

    if (courses.length === 0) {
        return (
            <div className="text-center py-20 border-2 border-dashed border-slate-200 rounded-xl mt-8">
                <BookOpen className="mx-auto h-12 w-12 text-slate-400" />
                <h3 className="mt-4 text-lg font-semibold text-slate-600">{emptyMessage}</h3>
                <Button asChild variant="link" className="mt-2">
                    <Link href="/dashboard">Parcourir les cours</Link>
                </Button>
            </div>
        );
    }
    
    return (
        <div className="space-y-4">
            {courses.map(course => (
                <CourseCard key={course.id} course={course} />
            ))}
        </div>
    );
};

    