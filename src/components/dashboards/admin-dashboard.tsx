
'use client';

import React, { useEffect, useState } from 'react';
import { useRole } from '@/context/RoleContext';
import { collection, query, where, getFirestore, onSnapshot, Timestamp, getDocs, doc, orderBy, limit } from 'firebase/firestore';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, DollarSign, BookOpen, HelpCircle, Activity, ShieldAlert } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { Enrollment, Course, NdaraUser } from '@/lib/types';
import { startOfMonth } from 'date-fns';

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ElementType;
  isLoading: boolean;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, isLoading }) => (
  <Card className="bg-white dark:bg-card shadow-sm transition-transform hover:-translate-y-1">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      {isLoading ? (
        <Skeleton className="h-8 w-3/5" />
      ) : (
        <div className="text-2xl font-bold">{value}</div>
      )}
    </CardContent>
  </Card>
);

const RecentActivityItem = ({ studentName, courseName, time, avatar }: { studentName: string, courseName: string, time: string, avatar: string }) => (
    <div className="flex items-center gap-4 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/50">
        <Avatar className="h-9 w-9">
            <AvatarImage src={avatar} />
            <AvatarFallback>{studentName.charAt(0)}</AvatarFallback>
        </Avatar>
        <div className="flex-1 text-sm">
            <p className="font-medium text-slate-800 dark:text-slate-200">
                <span className="font-bold">{studentName}</span> s'est inscrit(e) à <span className="font-bold">{courseName}</span>.
            </p>
            <p className="text-xs text-muted-foreground">{time}</p>
        </div>
    </div>
);

const ActivityItemSkeleton = () => (
    <div className="flex items-center gap-4 p-2">
        <Skeleton className="h-9 w-9 rounded-full" />
        <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-3 w-1/4" />
        </div>
    </div>
);

interface EnrichedActivity extends Enrollment {
    studentName?: string;
    studentAvatar?: string;
    courseTitle?: string;
}


const AdminDashboard = () => {
    const { currentUser, isUserLoading } = useRole();
    const db = getFirestore();
    const [stats, setStats] = useState({
        totalStudents: 0,
        monthlyRevenue: 0,
        publishedCourses: 0,
        openTickets: 0,
    });
    const [recentActivity, setRecentActivity] = useState<EnrichedActivity[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!currentUser || currentUser.role !== 'admin') {
            if (!isUserLoading) setIsLoading(false);
            return;
        }

        const unsubscribes: (() => void)[] = [];

        // Total students
        const studentsQuery = query(collection(db, 'users'), where('role', '==', 'student'));
        unsubscribes.push(onSnapshot(studentsQuery, snapshot => setStats(s => ({ ...s, totalStudents: snapshot.size }))));

        // Monthly revenue
        const startOfMonthDate = startOfMonth(new Date());
        const revenueQuery = query(collection(db, 'payments'), where('status', '==', 'Completed'), where('date', '>=', Timestamp.fromDate(startOfMonthDate)));
        unsubscribes.push(onSnapshot(revenueQuery, snapshot => {
            const total = snapshot.docs.reduce((sum, doc) => sum + (doc.data().amount || 0), 0);
            setStats(s => ({ ...s, monthlyRevenue: total }));
        }));

        // Published courses
        const coursesQuery = query(collection(db, 'courses'), where('status', '==', 'Published'));
        unsubscribes.push(onSnapshot(coursesQuery, snapshot => setStats(s => ({ ...s, publishedCourses: snapshot.size }))));
        
        // Open support tickets
        const ticketsQuery = query(collection(db, 'support_tickets'), where('status', '==', 'ouvert'));
        unsubscribes.push(onSnapshot(ticketsQuery, snapshot => setStats(s => ({ ...s, openTickets: snapshot.size }))));

        // Recent activity
        const activityQuery = query(collection(db, 'enrollments'), orderBy('enrollmentDate', 'desc'), limit(5));
        unsubscribes.push(onSnapshot(activityQuery, async (snapshot) => {
            const enrollments = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Enrollment));
            const studentIds = [...new Set(enrollments.map(e => e.studentId))];
            const courseIds = [...new Set(enrollments.map(e => e.courseId))];

            const studentsData = new Map<string, NdaraUser>();
            if (studentIds.length > 0) {
                const studentsSnap = await getDocs(query(collection(db, 'users'), where('uid', 'in', studentIds.slice(0, 10))));
                studentsSnap.forEach(doc => studentsData.set(doc.id, doc.data() as NdaraUser));
            }
            
            const coursesData = new Map<string, Course>();
            if (courseIds.length > 0) {
                const coursesSnap = await getDocs(query(collection(db, 'courses'), where('__name__', 'in', courseIds.slice(0, 10))));
                coursesSnap.forEach(doc => coursesData.set(doc.id, doc.data() as Course));
            }

            const enrichedActivity = enrollments.map(e => ({
                ...e,
                studentName: studentsData.get(e.studentId)?.fullName || 'Un étudiant',
                studentAvatar: studentsData.get(e.studentId)?.profilePictureURL || '',
                courseTitle: coursesData.get(e.courseId)?.title || 'un cours',
            }));
            
            setRecentActivity(enrichedActivity);
        }));

        // Initial loading is done after the first fetch of all listeners
        const initialLoadTimer = setTimeout(() => setIsLoading(false), 2000);
        unsubscribes.push(() => clearTimeout(initialLoadTimer));
        
        return () => unsubscribes.forEach(unsub => unsub());

    }, [currentUser, isUserLoading, db]);

    if (!isUserLoading && currentUser?.role !== 'admin') {
      return (
          <div className="flex flex-col items-center justify-center h-[60vh] text-center p-4">
              <ShieldAlert className="w-16 h-16 text-destructive mb-4" />
              <h1 className="text-2xl font-bold text-white">Accès Interdit</h1>
              <p className="text-muted-foreground">Vous n'avez pas les permissions nécessaires pour voir ce tableau de bord.</p>
          </div>
      );
    }

  return (
    <div className="space-y-8">
        <header>
            <h1 className="text-3xl font-bold text-white">Tableau de Bord</h1>
            <p className="text-muted-foreground">Vue d'ensemble de l'activité de la plateforme.</p>
        </header>

      <section className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Étudiants" value={stats.totalStudents.toLocaleString('fr-FR')} icon={Users} isLoading={isLoading} />
        <StatCard title="Revenus (Mois)" value={`${stats.monthlyRevenue.toLocaleString('fr-FR')} XOF`} icon={DollarSign} isLoading={isLoading} />
        <StatCard title="Cours Publiés" value={stats.publishedCourses.toString()} icon={BookOpen} isLoading={isLoading} />
        <StatCard title="Tickets Ouverts" value={stats.openTickets.toString()} icon={HelpCircle} isLoading={isLoading} />
      </section>

      <section>
        <Card className="bg-white dark:bg-card shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
                <Activity />
                Activité Récente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {isLoading ? (
                <>
                  <ActivityItemSkeleton />
                  <ActivityItemSkeleton />
                  <ActivityItemSkeleton />
                </>
              ) : recentActivity.length > 0 ? (
                recentActivity.map((item) => (
                    <RecentActivityItem 
                        key={item.id}
                        studentName={item.studentName || '...'}
                        courseName={item.courseTitle || '...'}
                        time={item.enrollmentDate ? formatDistanceToNow(item.enrollmentDate.toDate(), { addSuffix: true, locale: fr }) : 'récemment'}
                        avatar={item.studentAvatar || ''}
                    />
                ))
              ) : (
                <div className="text-center py-10 text-muted-foreground">
                    Aucune activité récente.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
};

export default AdminDashboard;
