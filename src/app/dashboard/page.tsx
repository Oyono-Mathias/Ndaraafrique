
'use client';

import { useRole } from '@/context/RoleContext';
import { StudentDashboard } from '@/components/dashboards/student-dashboard';
import { InstructorDashboard } from '@/components/dashboards/instructor-dashboard';
import { AdminDashboard } from '@/components/dashboards/admin-dashboard';
import { Skeleton } from '@/components/ui/skeleton';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

export default function DashboardPage() {
  const { role, isUserLoading, user, formaAfriqueUser } = useRole();
  const router = useRouter();

  useEffect(() => {
    // If loading is done and there's no user, redirect to login.
    if (!isUserLoading && !user) {
      router.push('/');
    }
  }, [user, isUserLoading, router]);

  if (isUserLoading || !user) {
    return (
        <div className="flex h-screen w-full items-center justify-center bg-background dark:bg-slate-900">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    );
  }
  
  if (formaAfriqueUser?.role === 'admin') {
    return <AdminDashboard />;
  }

  if (role === 'instructor') {
     return <InstructorDashboard />;
  }

  return <StudentDashboard />;
}
