

'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import type { Course, NdaraUser } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Play } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { CourseCard } from './CourseCard';

interface EnrolledCourse extends Course {
  progress: number;
  instructorName: string;
}

// This component is now deprecated and replaced by the more versatile CourseCard.
// It is kept for reference but should be removed in a future cleanup.
export function StudentCourseCard({ course }: { course: EnrolledCourse }) {
  const instructor: Partial<NdaraUser> = {
    fullName: course.instructorName,
  }
  return <CourseCard course={course} instructor={instructor} variant="student" />;
}
