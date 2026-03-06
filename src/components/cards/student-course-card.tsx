'use client';

import type { Course, NdaraUser } from '@/lib/types';
import { CourseCard } from './CourseCard';

interface EnrolledCourse extends Course {
  progress: number;
  instructorName: string;
}

/**
 * @fileOverview Composant de transition corrigé pour le build.
 */
export function StudentCourseCard({ course }: { course: EnrolledCourse }) {
  const instructor: Partial<NdaraUser> = {
    fullName: course.instructorName,
  };
  
  // Correction du type variant : "list" au lieu de "student"
  return <CourseCard course={course} instructor={instructor} variant="list" />;
}
