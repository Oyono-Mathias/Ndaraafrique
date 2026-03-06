'use client';

import type { Course, NdaraUser } from '@/lib/types';
import { CourseCard } from './CourseCard';

interface EnrolledCourse extends Course {
  progress: number;
  instructorName: string;
}

/**
 * @fileOverview Composant de transition (déprécié).
 * Redirige vers CourseCard avec la variante "list" pour corriger le build.
 */
export function StudentCourseCard({ course }: { course: EnrolledCourse }) {
  const instructor: Partial<NdaraUser> = {
    fullName: course.instructorName,
  };
  
  // On utilise "list" pour correspondre au design compact souhaité par le CEO
  return <CourseCard course={course} instructor={instructor} variant="list" />;
}
