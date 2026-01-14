

'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRole } from '@/context/RoleContext';
import { useCollection, useMemoFirebase } from '@/firebase';
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BookOpen } from 'lucide-react';
import type { Course, Enrollment } from '@/lib/types';
import type { NdaraUser } from '@/context/RoleContext';
import { CourseCard } from '@/components/cards/CourseCard';
import { useTranslation } from 'react-i18next';

interface EnrolledCourse extends Course {
  progress: number;
  instructorName: string;
}

export default function MyLearningPage() {
  const { formaAfriqueUser: ndaraUser, isUserLoading } = useRole();
  const db = getFirestore();
  const { t } = useTranslation();
  const [courses, setCourses] = useState<EnrolledCourse[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  // 1. Get student's enrollments
  const enrollmentsQuery = useMemoFirebase(
    () => ndaraUser?.uid
      ? query(collection(db, 'enrollments'), where('studentId', '==', ndaraUser.uid))
      : null,
    [db, ndaraUser?.uid]
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
          const q = query(coursesRef, where('__name__', 'in', courseIds.slice(0, 30)));
          const courseSnap = await getDocs(q);
          courseSnap.forEach(doc => coursesMap.set(doc.id, { id: doc.id, ...doc.data() } as Course));
      }
      
      const instructorsMap = new Map<string, NdaraUser>();
      if (instructorIds.length > 0) {
          const instructorsRef = collection(db, 'users');
          const q = query(instructorsRef, where('uid', 'in', instructorIds.slice(0, 30)));
          const instructorSnap = await getDocs(q);
          instructorSnap.forEach(doc => instructorsMap.set(doc.data().uid, doc.data() as NdaraUser));
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

  const { inProgressCourses, completedCourses } = useMemo(() => {
    const inProgress = courses.filter(c => c.progress >= 0 && c.progress < 100);
    const completed = courses.filter(c => c.progress === 100);
    return { inProgressCourses: inProgress, completedCourses: completed };
  }, [courses]);

  const coursesToDisplay = useMemo(() => {
    return [...inProgressCourses, ...courses.filter(c => c.progress === 0), ...completedCourses];
  }, [inProgressCourses, courses, completedCourses]);

  const isLoading = isUserLoading || dataLoading;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold dark:text-white">{t('navMyLearning')}</h1>
        <p className="text-muted-foreground dark:text-slate-400">Reprenez là où vous vous êtes arrêté.</p>
      </header>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-3 dark:bg-slate-800 dark:text-slate-300 dark:data-[state=active]:bg-background">
          <TabsTrigger value="all">{t('all')}</TabsTrigger>
          <TabsTrigger value="in-progress">{t('in_progress')}</TabsTrigger>
          <TabsTrigger value="completed">{t('completed')}</TabsTrigger>
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
    const { t } = useTranslation();
    if (isLoading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-80 w-full rounded-2xl bg-slate-800" />
                ))}
            </div>
        );
    }

    if (courses.length === 0) {
        return (
            <div className="text-center py-20 border-2 border-dashed border-slate-700 rounded-xl mt-8">
                <BookOpen className="mx-auto h-12 w-12 text-slate-400" />
                <h3 className="mt-4 text-lg font-semibold text-slate-300">{emptyMessage}</h3>
                <Button asChild variant="link" className="mt-2">
                    <Link href="/dashboard">{t('browseCourses')}</Link>
                </Button>
            </div>
        );
    }
    
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map(course => (
                 <CourseCard 
                    key={course.id}
                    course={course} 
                    instructor={{ fullName: course.instructorName }}
                    variant="student" 
                />
            ))}
        </div>
    );
};
