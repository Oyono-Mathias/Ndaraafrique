
'use client';

import React from 'react';
import { useRole } from '@/context/RoleContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { LandingPageClient } from '@/components/landing/LandingPageClient';

export default function LandingPage() {
  const { user, isUserLoading, role } = useRole();
  const router = useRouter();

  useEffect(() => {
    if (!isUserLoading && user) {
      if (role === 'admin') {
        router.push('/admin');
      } else if (role === 'instructor') {
        router.push('/instructor/courses');
      } else {
        router.push('/student/dashboard');
      }
    }
  }, [isUserLoading, user, role, router]);

  if (isUserLoading || user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return <LandingPageClient />;
}
