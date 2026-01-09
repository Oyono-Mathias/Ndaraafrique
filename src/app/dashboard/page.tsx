
'use client';

import { useRole } from '@/context/RoleContext';
import { StudentDashboard } from '@/components/dashboards/student-dashboard';
import { InstructorDashboard } from '@/components/dashboards/instructor-dashboard';
import { AdminDashboard } from '@/components/dashboards/admin-dashboard';
import { Skeleton } from '@/components/ui/skeleton';

export default function DashboardPage() {
  const { role, loading, formaAfriqueUser } = useRole();

  if (loading) {
    return (
        <div className="space-y-8">
            <header>
                <Skeleton className="h-8 w-48" />
            </header>
            <div className="space-y-6">
                <Skeleton className="h-6 w-1/3" />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Skeleton className="h-28 w-full rounded-xl" />
                  <Skeleton className="h-28 w-full rounded-xl" />
                  <Skeleton className="h-28 w-full rounded-xl hidden sm:block" />
                  <Skeleton className="h-28 w-full rounded-xl hidden lg:block" />
                </div>
            </div>
             <div className="space-y-6">
                <Skeleton className="h-6 w-1/4" />
                 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-72 w-full rounded-2xl" />)}
                </div>
            </div>
        </div>
    );
  }
  
  // Correction: Vérifier le rôle réel de l'utilisateur d'abord.
  // Un admin verra toujours son tableau de bord, quel que soit le mode sélectionné.
  if(formaAfriqueUser?.role === 'admin') {
    return <AdminDashboard />;
  }

  // Ensuite, utiliser le rôle sélectionné pour basculer entre étudiant et instructeur.
  if (role === 'instructor') {
     return <InstructorDashboard />;
  }

  // Le rôle par défaut est étudiant.
  return <StudentDashboard />;
}
