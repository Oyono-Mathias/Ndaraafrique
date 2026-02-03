
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRole } from '@/context/RoleContext';
import { getFirestore, collection, query, where, getDocs, getCountFromServer } from 'firebase/firestore';
import { ContinueLearning } from './ContinueLearning';
import { RecommendedCourses } from './RecommendedCourses';
import { RecentActivity } from './RecentActivity';
import { DynamicCarousel } from '../ui/DynamicCarousel';
import { StatCard } from '@/components/dashboard/StatCard';
import { BookOpen, Trophy, TrendingUp } from 'lucide-react';
import type { CourseProgress } from '@/lib/types';

export function StudentDashboard() {
  const { currentUser } = useRole();
  const db = getFirestore();
  const [stats, setStats] = useState({ totalCourses: 0, completed: 0, avgProgress: 0 });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!currentUser?.uid) return;

    const fetchStats = async () => {
      setIsLoading(true);
      try {
        const enrollmentsRef = collection(db, 'enrollments');
        const qEnrollments = query(enrollmentsRef, where('studentId', '==', currentUser.uid));
        const enrollmentsSnap = await getCountFromServer(qEnrollments);

        const progressRef = collection(db, 'course_progress');
        const qProgress = query(progressRef, where('userId', '==', currentUser.uid));
        const progressSnap = await getDocs(qProgress);
        
        const progressDocs = progressSnap.docs.map(d => d.data() as CourseProgress);
        const completed = progressDocs.filter(p => p.progressPercent === 100).length;
        
        const totalProgress = progressDocs.reduce((acc, curr) => acc + (curr.progressPercent || 0), 0);
        const avg = progressDocs.length > 0 ? Math.round(totalProgress / progressDocs.length) : 0;

        setStats({
          totalCourses: enrollmentsSnap.data().count,
          completed,
          avgProgress: avg
        });
      } catch (error) {
        console.error("Error fetching student stats:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, [currentUser?.uid, db]);

  return (
    <div className="bg-slate-900 -m-6 p-6 min-h-screen space-y-12">
        <header>
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
                {currentUser?.role !== 'admin' && <RecommendedCourses />}
            </div>
            <div className="lg:col-span-1">
                <RecentActivity />
            </div>
        </div>
    </div>
  );
}
