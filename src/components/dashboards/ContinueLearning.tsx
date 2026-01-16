
'use client';

import { useMemo, useState, useEffect } from 'react';
import { useRole } from '@/context/RoleContext';
import { useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, getFirestore, orderBy, limit, getDocs } from 'firebase/firestore';
import type { Course, Enrollment, NdaraUser } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { CourseCard } from '@/components/cards/CourseCard';
import { BookOpen } from 'lucide-react';

interface EnrolledCourse extends Course {
    progress: number;
    instructorName: string;
}

export function ContinueLearning() {
    const { currentUser, isUserLoading } = useRole();
    const db = getFirestore();
    const [enrolledCourses, setEnrolledCourses] = useState<EnrolledCourse[]>([]);
    const [dataLoading, setDataLoading] = useState(true);

    const enrollmentsQuery = useMemoFirebase(
        () => currentUser?.uid
            ? query(
                collection(db, 'enrollments'),
                where('studentId', '==', currentUser.uid),
                where('progress', '<', 100),
                orderBy('lastAccessedAt', 'desc'),
                limit(3)
            )
            : null,
        [db, currentUser?.uid]
    );
    const { data: enrollments, isLoading: enrollmentsLoading } = useCollection<Enrollment>(enrollmentsQuery);

    useEffect(() => {
        if (enrollmentsLoading) return;
        if (!enrollments || enrollments.length === 0) {
            setDataLoading(false);
            setEnrolledCourses([]);
            return;
        }

        const fetchDetails = async () => {
            setDataLoading(true);
            const courseIds = enrollments.map(e => e.courseId);
            const instructorIds = enrollments.map(e => e.instructorId).filter(Boolean);

            const coursesMap = new Map<string, Course>();
            if (courseIds.length > 0) {
                const coursesRef = collection(db, 'courses');
                const q = query(coursesRef, where('__name__', 'in', courseIds));
                const courseSnap = await getDocs(q);
                courseSnap.forEach(doc => coursesMap.set(doc.id, { id: doc.id, ...doc.data() } as Course));
            }

            const instructorsMap = new Map<string, NdaraUser>();
            if (instructorIds.length > 0) {
                const instructorsRef = collection(db, 'users');
                const q = query(instructorsRef, where('uid', 'in', instructorIds));
                const instructorSnap = await getDocs(q);
                instructorSnap.forEach(doc => instructorsMap.set(doc.data().uid, doc.data() as NdaraUser));
            }

            const populatedCourses: EnrolledCourse[] = enrollments.map(enrollment => {
                const course = coursesMap.get(enrollment.courseId);
                const instructor = instructorsMap.get(enrollment.instructorId);
                return {
                    ...(course as Course),
                    id: enrollment.courseId,
                    progress: enrollment.progress,
                    instructorName: instructor?.fullName || 'Instructeur Inconnu',
                };
            }).filter(c => c.id);

            setEnrolledCourses(populatedCourses);
            setDataLoading(false);
        };

        fetchDetails();
    }, [enrollments, enrollmentsLoading, db]);

    const isLoading = isUserLoading || dataLoading;

    if (!isLoading && enrolledCourses.length === 0) {
        return null; // Don't show the section if there's nothing to continue
    }

    return (
        <section>
            <h2 className="text-2xl font-bold mb-4 text-white">Reprendre l'apprentissage</h2>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {isLoading ? (
                    [...Array(3)].map((_, i) => (
                        <Skeleton key={i} className="h-80 w-full rounded-2xl bg-slate-800" />
                    ))
                ) : (
                    enrolledCourses.map(course => (
                        <CourseCard 
                            key={course.id}
                            course={course} 
                            instructor={{ fullName: course.instructorName }}
                            variant="student" 
                        />
                    ))
                )}
            </div>
        </section>
    );
}
