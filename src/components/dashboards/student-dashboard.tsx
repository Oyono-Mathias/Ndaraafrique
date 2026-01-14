
'use client';

import Link from 'next/link';
import { useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, getFirestore, getDocs, limit, orderBy } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Star, Frown, BookText, Video } from 'lucide-react';
import Image from 'next/image';
import { useMemo, useState, useEffect } from 'react';
import { Skeleton } from '../ui/skeleton';
import type { Course } from '@/lib/types';
import type { FormaAfriqueUser } from '@/context/RoleContext';
import { Badge } from '../ui/badge';
import { Carousel, CarouselContent, CarouselItem } from '@/components/ui/carousel';
import { DynamicCarousel } from '../ui/DynamicCarousel';
import { CourseCard } from '../cards/CourseCard';

const CourseCarousel = ({ title, courses, instructorsMap, isLoading }: { title: string, courses: Course[], instructorsMap: Map<string, Partial<FormaAfriqueUser>>, isLoading: boolean }) => {
    return (
        <section>
            <h2 className="text-2xl font-bold mb-4 text-white">{title}</h2>
            {isLoading ? (
                <div className="flex space-x-6">
                    {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-80 w-64 rounded-2xl bg-slate-800" />)}
                </div>
            ) : courses && courses.length > 0 ? (
                 <Carousel opts={{ align: "start", loop: false }} className="w-full">
                    <CarouselContent className="-ml-6">
                        {courses.map(course => (
                            <CarouselItem key={course.id} className="pl-6 basis-[70%] sm:basis-1/2 md:basis-1/3 lg:basis-1/4">
                                <CourseCard course={course} instructor={instructorsMap.get(course.instructorId) || null} variant="catalogue" />
                            </CarouselItem>
                        ))}
                    </CarouselContent>
                </Carousel>
            ) : (
                 <div className="text-center py-10 px-4 border-2 border-dashed border-slate-700 rounded-xl">
                    <Frown className="mx-auto h-10 w-10 text-slate-500" />
                    <h3 className="mt-2 text-md font-semibold text-slate-300">Aucun cours dans cette section pour le moment.</h3>
                </div>
            )}
        </section>
    );
}

export function StudentDashboard() {
  const db = getFirestore();
  const [instructorsMap, setInstructorsMap] = useState<Map<string, Partial<FormaAfriqueUser>>>(new Map());

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
    if (coursesLoading || !allCourses) return;

    const processData = async () => {
        const neededInstructorIds = [...new Set(allCourses.map(c => c.instructorId).filter(id => id && !instructorsMap.has(id)))];
        if (neededInstructorIds.length > 0) {
            const usersQuery = query(collection(db, 'users'), where('uid', 'in', neededInstructorIds.slice(0, 30)));
            const userSnapshots = await getDocs(usersQuery);
            const newInstructors = new Map(instructorsMap);
            userSnapshots.forEach(doc => newInstructors.set(doc.data().uid, doc.data()));
            setInstructorsMap(newInstructors);
        }
    };
    processData();
  }, [allCourses, coursesLoading, db, instructorsMap]);

  return (
    <div className="bg-slate-900 -m-6 p-6 min-h-screen space-y-12">
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
