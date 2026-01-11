
'use client';

import { useRole } from '@/context/RoleContext';
import { StudentDashboard } from '@/components/dashboards/student-dashboard';
import { InstructorDashboard } from '@/components/dashboards/instructor-dashboard';
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
      return;
    }
    
    if (!isUserLoading && user && formaAfriqueUser?.role === 'admin' && role === 'admin') {
      router.push('/admin');
    }
  }, [user, isUserLoading, formaAfriqueUser, role, router]);

  // Show a loader while redirecting or if the user role is still being determined.
  if (isUserLoading || !user || (formaAfriqueUser?.role === 'admin' && role === 'admin')) {
    return (
        <div className="flex h-screen w-full items-center justify-center bg-background dark:bg-slate-900">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    );
  }

  if (role === 'instructor') {
     return <InstructorDashboard />;
  }

  // Default to student dashboard
  return <StudentDashboard />;
}
