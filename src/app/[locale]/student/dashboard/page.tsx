
'use client';

import { useRole } from '@/context/RoleContext';
import { StudentDashboard } from '@/components/dashboards/student-dashboard';
import { InstructorDashboard } from '@/components/dashboards/instructor-dashboard';
import { Loader2 } from 'lucide-react';
import AdminDashboard from '@/components/dashboards/admin-dashboard';

export default function DashboardPage() {
  const { role, isUserLoading } = useRole();

  if (isUserLoading) {
    return <div className="flex h-full w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }
  
  // This page is now the student dashboard, but we keep role-based rendering
  // as a fallback. The main router logic now points here for students.
  if (role === 'instructor') {
      return <InstructorDashboard />;
  }
  
  if (role === 'admin') {
      return <AdminDashboard />;
  }

  // Default to student dashboard
  return <StudentDashboard />;
}
