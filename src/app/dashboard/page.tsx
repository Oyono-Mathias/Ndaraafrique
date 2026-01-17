
'use client';

import { useRole } from '@/context/RoleContext';
import { StudentDashboard } from '@/components/dashboards/student-dashboard';
import { InstructorDashboard } from '@/components/dashboards/instructor-dashboard';
import { Skeleton } from '@/components/ui/skeleton';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function DashboardPage() {
  const { role, isUserLoading, user, currentUser } = useRole();
  const router = useRouter();

  useEffect(() => {
    // If loading is done and there's no user, redirect to login.
    if (!isUserLoading && !user) {
      router.push('/');
      return;
    }
    
    // If the user's primary role is admin AND they have selected the admin role, redirect to /admin
    if (!isUserLoading && user && currentUser?.role === 'admin' && role === 'admin') {
      router.push('/admin');
    }
  }, [user, isUserLoading, currentUser, role, router]);

  // Show a loader while redirecting or if the user role is still being determined.
  if (isUserLoading || !user || (currentUser?.role === 'admin' && role === 'admin')) {
    return (
        <div className="flex h-screen w-full items-center justify-center bg-background dark:bg-slate-900">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    );
  }

  // Render both dashboards but only show the one corresponding to the current role.
  // This prevents React from unmounting/remounting large component trees on role change,
  // which is the root cause of the "NotFoundError: Failed to execute 'removeChild'" error.
  return (
    <>
      <div className={cn({ 'hidden': role !== 'student' })}>
        <StudentDashboard />
      </div>
      <div className={cn({ 'hidden': role !== 'instructor' })}>
        <InstructorDashboard />
      </div>
    </>
  );
}
