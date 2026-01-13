'use client';

import React, { useState, useEffect } from 'react';
import { Users, DollarSign, BookOpen, MessageSquare, TrendingUp, ShieldAlert } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useRole } from '@/context/RoleContext';
import { collection, query, where, onSnapshot, getFirestore, Timestamp, orderBy, limit, getDocs, doc } from 'firebase/firestore';
import type { Course, Enrollment, FormaAfriqueUser } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

// --- TYPES ---
interface Stats {
  totalStudents: number | null;
  monthlyRevenue: number | null;
  publishedCourses: number | null;
  openSupportTickets: number | null;
}

interface RecentActivity {
  id: string;
  studentName: string;
  studentAvatar?: string;
  courseName: string;
  enrolledAt: Date;
}

// --- COMPOSANT DE CARTE STATISTIQUE ---
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

// --- COMPOSANT DU TABLEAU DE BORD PRINCIPAL ---
const AdminDashboard = () => {
  const { formaAfriqueUser, isUserLoading } = useRole();
  const db = getFirestore();

  const [stats, setStats] = useState<Stats>({
    totalStudents: null,
    monthlyRevenue: null,
    publishedCourses: null,
    openSupportTickets: null,
  });
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [loadingState, setLoadingState] = useState({
    stats: true,
    activity: true,
  });

  // --- FETCHING LOGIC ---
  useEffect(() => {
    if (!formaAfriqueUser || formaAfriqueUser.role !== 'admin') return;

    const unsubscribes: (() => void)[] = [];

    // --- Statistiques ---
    // Total Students
    const studentsQuery = query(collection(db, 'users'), where('role', '==', 'student'));
    unsubscribes.push(onSnapshot(studentsQuery, snapshot => {
      setStats(prev => ({ ...prev, totalStudents: snapshot.size }));
      setLoadingState(prev => ({...prev, stats: false}));
    }));

    // Published Courses
    const coursesQuery = query(collection(db, 'courses'), where('status', '==', 'Published'));
    unsubscribes.push(onSnapshot(coursesQuery, snapshot => {
      setStats(prev => ({ ...prev, publishedCourses: snapshot.size }));
    }));

    // Open Support Tickets
    const ticketsQuery = query(collection(db, 'support_tickets'), where('status', '==', 'ouvert'));
    unsubscribes.push(onSnapshot(ticketsQuery, snapshot => {
      setStats(prev => ({ ...prev, openSupportTickets: snapshot.size }));
    }));

    // Monthly Revenue
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const startOfMonthTimestamp = Timestamp.fromDate(startOfMonth);

    const paymentsQuery = query(
      collection(db, 'payments'),
      where('status', '==', 'Completed'),
      where('date', '>=', startOfMonthTimestamp)
    );
    unsubscribes.push(onSnapshot(paymentsQuery, snapshot => {
      const total = snapshot.docs.reduce((sum, doc) => sum + (doc.data().amount || 0), 0);
      setStats(prev => ({ ...prev, monthlyRevenue: total }));
    }));

    // --- Recent Activity ---
    const activityQuery = query(collection(db, 'enrollments'), orderBy('enrollmentDate', 'desc'), limit(5));
    unsubscribes.push(onSnapshot(activityQuery, async (snapshot) => {
        const enrollments = snapshot.docs.map(d => ({id: d.id, ...d.data()} as Enrollment));
        
        const userIds = [...new Set(enrollments.map(e => e.studentId))];
        const courseIds = [...new Set(enrollments.map(e => e.courseId))];

        const usersData: Record<string, FormaAfriqueUser> = {};
        if (userIds.length > 0) {
            const usersSnap = await getDocs(query(collection(db, 'users'), where('uid', 'in', userIds.slice(0,10))));
            usersSnap.forEach(d => usersData[d.id] = d.data() as FormaAfriqueUser);
        }

        const coursesData: Record<string, Course> = {};
        if (courseIds.length > 0) {
            const coursesSnap = await getDocs(query(collection(db, 'courses'), where('__name__', 'in', courseIds.slice(0,10))));
            coursesSnap.forEach(d => coursesData[d.id] = d.data() as Course);
        }
        
        const activities = enrollments.map(enrollment => ({
            id: enrollment.id,
            studentName: usersData[enrollment.studentId]?.fullName || 'Un étudiant',
            studentAvatar: usersData[enrollment.studentId]?.profilePictureURL,
            courseName: coursesData[enrollment.courseId]?.title || 'un cours',
            enrolledAt: (enrollment.enrollmentDate as Timestamp)?.toDate() || new Date(),
        }));
        
        setRecentActivities(activities);
        setLoadingState(prev => ({...prev, activity: false}));
    }));

    return () => unsubscribes.forEach(unsub => unsub());
  }, [formaAfriqueUser, db]);


  // --- Authorization Check ---
  if (!isUserLoading && formaAfriqueUser?.role !== 'admin') {
    return (
        <div className="flex flex-col items-center justify-center h-[50vh] text-center p-4">
             <ShieldAlert className="w-16 h-16 text-destructive mb-4" />
            <h1 className="text-2xl font-bold">Accès Interdit</h1>
            <p className="text-muted-foreground">Vous n'avez pas les autorisations nécessaires pour accéder à cette page.</p>
        </div>
    )
  }

  const isLoading = isUserLoading || loadingState.stats || loadingState.activity;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Étudiants"
          value={stats.totalStudents?.toLocaleString('fr-FR') ?? '...'}
          icon={Users}
          isLoading={isLoading}
        />
        <StatCard
          title="Revenus (Mois en cours)"
          value={`${stats.monthlyRevenue?.toLocaleString('fr-FR') ?? '...'} XOF`}
          icon={DollarSign}
          isLoading={isLoading}
        />
        <StatCard
          title="Cours Publiés"
          value={stats.publishedCourses?.toLocaleString('fr-FR') ?? '...'}
          icon={BookOpen}
          isLoading={isLoading}
        />
        <StatCard
          title="Tickets Support Ouverts"
          value={stats.openSupportTickets?.toLocaleString('fr-FR') ?? '...'}
          icon={MessageSquare}
          isLoading={isLoading}
        />
      </div>

      <Card className="bg-white dark:bg-card shadow-sm">
        <CardHeader>
          <CardTitle>Activité Récente</CardTitle>
          <CardDescription>Les dernières inscriptions sur la plateforme.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Étudiant</TableHead>
                <TableHead className="hidden sm:table-cell">Cours</TableHead>
                <TableHead className="text-right">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(3)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell className="hidden sm:table-cell"><Skeleton className="h-5 w-48" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-5 w-24" /></TableCell>
                  </TableRow>
                ))
              ) : recentActivities.length > 0 ? (
                recentActivities.map((activity) => (
                  <TableRow key={activity.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                           <AvatarImage src={activity.studentAvatar} />
                          <AvatarFallback>{activity.studentName.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{activity.studentName}</span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">{activity.courseName}</TableCell>
                    <TableCell className="text-right text-muted-foreground text-xs">
                       {formatDistanceToNow(activity.enrolledAt, { locale: fr, addSuffix: true })}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={3} className="h-24 text-center">
                    Aucune activité récente à afficher.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;
