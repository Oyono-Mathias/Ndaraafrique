import { Metadata } from 'next';
import { getAdminDb } from '@/firebase/admin';
import type { Course } from '@/lib/types';
import CourseDetailClient from '@/components/courses/CourseDetailClient';
import { unstable_setRequestLocale } from 'next-intl/server';

/**
 * @fileOverview Private course player page (Unified Entry Point).
 * Standardized to use [slug] to avoid routing conflicts.
 */

interface Props {
  params: { slug: string; locale: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, locale } = params;
  unstable_setRequestLocale(locale);
  
  try {
    const db = getAdminDb();
    const courseDoc = await db.collection('courses').doc(slug).get();
    
    if (!courseDoc.exists) {
      return { title: 'Formation Ndara Afrique' };
    }

    const course = courseDoc.data() as Course;

    return {
      title: `${course.title} | Ndara Afrique`,
      robots: { index: false, follow: false },
    };
  } catch (error) {
    return { title: 'Cours | Ndara Afrique' };
  }
}

export default function PrivateCoursePage({ params }: Props) {
  const { slug, locale } = params;
  unstable_setRequestLocale(locale);

  return <CourseDetailClient courseId={slug} />;
}
