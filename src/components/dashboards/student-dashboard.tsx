'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRole } from '@/context/RoleContext';
import { getFirestore, collection, query, where, onSnapshot, getDocs, doc, documentId } from 'firebase/firestore';
import { ContinueLearning } from './ContinueLearning';
import { RecommendedCourses } from './RecommendedCourses';
import { RecentActivity } from './RecentActivity';
import { DynamicCarousel } from '../ui/DynamicCarousel';
import { StatCard } from '@/components/dashboard/StatCard';
import { BookOpen, Trophy, TrendingUp, Sparkles } from 'lucide-react';
import type { CourseProgress, Enrollment, Course, NdaraUser } from '@/lib/types';
import { SectionHeader } from '../dashboard/SectionHeader';
import { CourseCard } from '../cards/CourseCard';
import { Skeleton } from '../ui/skeleton';

export function StudentDashboard() {
  const { currentUser, isUserLoading } = useRole();
  const db = getFirestore();
  const [stats, setStats] = useState({ totalCourses: 0, completed: 0, avgProgress: 0 });
  const [newCourses, setNewEnrollments] = useState<Course[]>([]);
  const [instructorsMap, setInstructorsMap] = useState<Map<string, Partial<NdaraUser>>>(new Map());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!currentUser?.uid) return;

    setIsLoading(true);

    const enrollmentsQuery = query(collection(db, 'enrollments'), where('studentId', '==', currentUser.uid));
    const progressQuery = query(collection(db, 'course_progress'), where('userId', '==', currentUser.uid));

    // Écoute des inscriptions
    const unsubEnrollments = onSnapshot(enrollmentsQuery, async (enrollSnap) => {
        const enrollments = enrollSnap.docs.map(d => ({ id: d.id, ...d.data() } as Enrollment));
        
        // Écoute des progrès (imbriquée pour avoir les deux sources)
        const unsubProgress = onSnapshot(progressQuery, async (progressSnap) => {
            const progressDocs = progressSnap.docs.map(d => d.data() as CourseProgress);
            const startedCourseIds = new Set(progressDocs.map(p => p.courseId));
            
            const completed = progressDocs.filter(p => p.progressPercent === 100).length;
            const totalProgress = progressDocs.reduce((acc, curr) => acc + (curr.progressPercent || 0), 0);
            const avg = progressDocs.length > 0 ? Math.round(totalProgress / progressDocs.length) : 0;

            setStats({
                totalCourses: enrollments.length,
                completed,
                avgProgress: avg
            });

            // Identification des cours achetés mais non commencés
            const unstartedEnrollments = enrollments.filter(e => !startedCourseIds.has(e.courseId));
            
            if (unstartedEnrollments.length > 0) {
                const unstartedCourseIds = unstartedEnrollments.map(e => e.courseId);
                const coursesRef = collection(db, 'courses');
                // Firestore limite 'in' à 30 IDs
                const qCourses = query(coursesRef, where(documentId(), 'in', unstartedCourseIds.slice(0, 30)));
                const coursesSnap = await getDocs(qCourses);
                const fetchedCourses = coursesSnap.docs.map(d => ({ id: d.id, ...d.data() } as Course));
                setNewEnrollments(fetchedCourses);

                const instructorIds = [...new Set(fetchedCourses.map(c => c.instructorId))];
                if (instructorIds.length > 0) {
                    const usersRef = collection(db, 'users');
                    const qInstructors = query(usersRef, where('uid', 'in', instructorIds.slice(0, 30)));
                    const instructorsSnap = await getDocs(qInstructors);
                    const newInstructors = new Map<string, Partial<NdaraUser>>();
                    instructorsSnap.forEach(d => {
                        const data = d.data();
                        newInstructors.set(data.uid, { fullName: data.fullName, profilePictureURL: data.profilePictureURL });
                    });
                    setInstructorsMap(newInstructors);
                }
            } else {
                setNewEnrollments([]);
            }
            
            setIsLoading(false);
        });

        return () => unsubProgress();
    });

    return () => unsubEnrollments();
  }, [currentUser?.uid, db]);

  return (
    <div className="bg-slate-900 -m-6 p-6 min-h-screen space-y-12">
        <header className="animate-in fade-in slide-in-from-top-4 duration-500">
            <h1 className="text-3xl font-bold text-white mb-2">Bonjour, {currentUser?.fullName?.split(' ')[0]} 👋</h1>
            <p className="text-slate-400">Heureux de vous revoir ! Voici un aperçu de votre progression.</p>
        </header>

        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            <StatCard 
                title="Cours inscrits" 
                value={stats.totalCourses.toString()} 
                icon={BookOpen} 
                isLoading={isLoading} 
            />
            <StatCard 
                title="Certificats obtenus" 
                value={stats.completed.toString()} 
                icon={Trophy} 
                isLoading={isLoading} 
            />
            <StatCard 
                title="Progression moyenne" 
                value={`${stats.avgProgress}%`} 
                icon={TrendingUp} 
                isLoading={isLoading} 
            />
        </section>

        <DynamicCarousel />
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            <div className="lg:col-span-2 space-y-12">
                <ContinueLearning />
                
                {newCourses.length > 0 && (
                    <section className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                        <SectionHeader title="Nouveaux cours" className="mb-4">
                            <Sparkles className="h-5 w-5 text-amber-400" />
                        </SectionHeader>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {newCourses.map(course => (
                                <CourseCard 
                                    key={course.id} 
                                    course={course} 
                                    instructor={instructorsMap.get(course.instructorId) || null} 
                                    variant="catalogue" 
                                />
                            ))}
                        </div>
                    </section>
                )}

                {currentUser?.role !== 'admin' && <RecommendedCourses />}
            </div>
            <div className="lg:col-span-1">
                <RecentActivity />
            </div>
        </div>
    </div>
  );
}
