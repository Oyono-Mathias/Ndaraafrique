
'use client';

import Link from 'next/link';
import { useCollection } from '@/firebase/firestore/use-collection';
import { useMemoFirebase } from '@/firebase/provider';
import { collection, query, where, getFirestore, getDocs, limit, orderBy } from 'firebase/firestore';
import { Frown } from 'lucide-react';
import { useMemo, useState, useEffect } from 'react';
import { Skeleton } from '../ui/skeleton';
import type { Course, NdaraUser } from '@/lib/types';
import { Carousel, CarouselContent, CarouselItem } from '@/components/ui/carousel';
import { DynamicCarousel } from '../ui/DynamicCarousel';
import { CourseCard } from '../cards/CourseCard';
import { Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ContinueLearning } from './ContinueLearning';
import { RecommendedCourses } from './RecommendedCourses';
import { RecentActivity } from './RecentActivity';

const CourseCarousel = ({ title, courses, instructorsMap, isLoading }: { title: string, courses: Course[], instructorsMap: Map<string, Partial<NdaraUser>>, isLoading: boolean }) => {
    if (isLoading && courses.length === 0) {
        return (
            <section>
                <h2 className="text-2xl font-bold mb-4 text-white">{title}</h2>
                <div className="flex space-x-6">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="w-[280px] shrink-0">
                           <Skeleton className="h-80 rounded-2xl bg-slate-800" />
                        </div>
                    ))}
                </div>
            </section>
        );
    }
    if (!courses || courses.length === 0) {
        return null;
    }
    return (
        <section>
            <h2 className="text-2xl font-bold mb-4 text-white">{title}</h2>
             <Carousel opts={{ align: "start", loop: false }} className="w-full">
                <CarouselContent className="-ml-6">
                    {courses.map(course => (
                        <CarouselItem key={course.id} className="pl-6 basis-[80%] sm:basis-1/2 md:basis-1/3 lg:basis-1/4">
                            <CourseCard course={course} instructor={instructorsMap.get(course.instructorId) || null} variant="catalogue" />
                        </CarouselItem>
                    ))}
                </CarouselContent>
            </Carousel>
        </section>
    );
};

export function StudentDashboard() {
  const db = getFirestore();
  const [instructorsMap, setInstructorsMap] = useState<Map<string, Partial<NdaraUser>>>(new Map());

  // Fetch all published courses
  const allCoursesQuery = useMemoFirebase(() => {
    return query(collection(db, 'courses'), where('status', '==', 'Published'), orderBy('createdAt', 'desc'));
  }, [db]);
  const { data: allCourses, isLoading: coursesLoading } = useCollection<Course>(allCoursesQuery);

  // Group courses by category
  const coursesByCategory = useMemo(() => {
    if (!allCourses) return {};
    return allCourses.reduce((acc, course) => {
      const category = course.category || 'Autres';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(course);
      return acc;
    }, {} as Record<string, Course[]>);
  }, [allCourses]);

  const sortedCategories = useMemo(() => Object.keys(coursesByCategory).sort(), [coursesByCategory]);

  const newCourses = useMemo(() => {
    if (!allCourses) return [];
    return allCourses.slice(0, 12);
  }, [allCourses]);

  const popularCourses = useMemo(() => {
    if (!allCourses) return [];
    return allCourses.filter(c => c.isPopular).slice(0, 12);
  }, [allCourses]);

  const freeCourses = useMemo(() => {
    if (!allCourses) return [];
    return allCourses.filter(c => c.price === 0).slice(0, 12);
  }, [allCourses]);

  useEffect(() => {
    if (!allCourses || coursesLoading) return;

    const fetchInstructors = async () => {
        const neededInstructorIds = [...new Set(allCourses.map(c => c.instructorId).filter(id => id && !instructorsMap.has(id)))];
        
        if (neededInstructorIds.length > 0) {
            // Firestore 'in' query limit is 30. We chunk it for safety.
            const chunks: string[][] = [];
            for (let i = 0; i < neededInstructorIds.length; i += 30) {
                chunks.push(neededInstructorIds.slice(i, i + 30));
            }

            const newInstructors = new Map(instructorsMap);
            for (const chunk of chunks) {
                const usersQuery = query(collection(db, 'users'), where('uid', 'in', chunk));
                const userSnapshots = await getDocs(usersQuery);
                userSnapshots.forEach(doc => {
                    newInstructors.set(doc.data().uid, doc.data() as NdaraUser);
                });
            }
            setInstructorsMap(newInstructors);
        }
    };
    
    fetchInstructors();
  }, [allCourses, coursesLoading, db, instructorsMap]);

  return (
    <div className="bg-slate-900 -m-6 p-6 min-h-screen space-y-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            <div className="lg:col-span-2 space-y-12">
                <ContinueLearning />
                <RecommendedCourses />
            </div>
            <div className="lg:col-span-1">
                <RecentActivity />
            </div>
        </div>

        <DynamicCarousel />

        <CourseCarousel 
            title="Les nouveautés à ne pas rater"
            courses={newCourses}
            instructorsMap={instructorsMap}
            isLoading={coursesLoading}
        />
        <CourseCarousel 
            title="Populaires ce mois-ci"
            courses={popularCourses}
            instructorsMap={instructorsMap}
            isLoading={coursesLoading}
        />
        <CourseCarousel 
            title="Découvrir gratuitement"
            courses={freeCourses}
            instructorsMap={instructorsMap}
            isLoading={coursesLoading}
        />
        {sortedCategories.map(category => (
             <CourseCarousel 
                key={category}
                title={category}
                courses={coursesByCategory[category] || []}
                instructorsMap={instructorsMap}
                isLoading={coursesLoading}
            />
        ))}
    </div>
  );
}
