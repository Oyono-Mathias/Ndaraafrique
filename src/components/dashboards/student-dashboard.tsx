
'use client';

import { ContinueLearning } from './ContinueLearning';
import { RecommendedCourses } from './RecommendedCourses';
import { RecentActivity } from './RecentActivity';
import { DynamicCarousel } from '../ui/DynamicCarousel';
import { useRole } from '@/context/RoleContext';

export function StudentDashboard() {
  const { currentUser } = useRole();
  return (
    <div className="bg-slate-900 -m-6 p-6 min-h-screen space-y-12">
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
