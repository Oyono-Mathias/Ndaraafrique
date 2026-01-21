
'use client';

import { useRole } from '@/context/RoleContext';
import { StudentDashboard } from '@/components/dashboards/student-dashboard';
import { InstructorDashboard } from '@/components/dashboards/instructor-dashboard';
import { useRouter } from 'next-intl/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function DashboardPage() {
  const { role, loading, user, currentUser } = useRole();
  const router = useRouter();

  useEffect(() => {
    // If loading is done and there's no user, redirect to login.
    if (!loading && !user) {
      router.push('/');
      return;
    }
    
    // If the user's primary role is admin AND they have selected the admin role, redirect to /admin
    if (!loading && user && currentUser?.role === 'admin' && role === 'admin') {
      router.push('/admin');
    }
  }, [loading, user, currentUser, role, router]);

  // Use the combined loading state. Redirect logic is handled in useEffect.
  const showLoader = loading;

  // Always return a stable component structure.
  // Toggle visibility using `hidden` class instead of conditional rendering.
  return (
    <>
      <div className={cn(
        "flex h-screen w-full items-center justify-center bg-background dark:bg-slate-900",
        { 'hidden': !showLoader }
      )}>
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>

      <div className={cn({ 'hidden': showLoader })}>
        <div className={cn({ 'hidden': role !== 'student' })}>
          <StudentDashboard />
        </div>
        <div className={cn({ 'hidden': role !== 'instructor' })}>
          <InstructorDashboard />
        </div>
      </div>
    </>
  );
}
