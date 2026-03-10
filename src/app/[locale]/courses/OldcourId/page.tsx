import { Metadata } from 'next';
import { getAdminDb } from '@/firebase/admin';
import type { Course } from '@/lib/types';
import CourseDetailClient from '@/components/courses/CourseDetailClient';

/**
 * @fileOverview Page serveur pour les détails des cours (Ancienne route).
 * Mise à jour pour utiliser 'slug' afin d'éviter les erreurs de build.
 */

interface Props {
  params: { slug: string; locale: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, locale } = params;
  
  try {
    const db = getAdminDb();
    const courseDoc = await db.collection('courses').doc(slug).get();
    
    if (!courseDoc.exists) {
      return { title: 'Formation non trouvée | Ndara Afrique' };
    }

    const course = courseDoc.data() as Course;
    const shareUrl = `https://ndara-afrique.web.app/${locale}/courses/${slug}`;

    return {
      title: `${course.title} | Ndara Afrique`,
      description: course.description?.substring(0, 160),
      openGraph: {
        title: course.title,
        description: course.description?.substring(0, 160),
        url: shareUrl,
        siteName: 'Ndara Afrique',
        images: [
          {
            url: course.imageUrl || 'https://ndara-assets.b-cdn.net/logo.png',
            width: 1200,
            height: 630,
            alt: course.title,
          },
        ],
        locale: locale,
        type: 'website',
      },
      twitter: {
        card: 'summary_large_image',
        title: course.title,
        description: course.description?.substring(0, 160),
        images: [course.imageUrl || 'https://ndara-assets.b-cdn.net/logo.png'],
      },
    };
  } catch (error) {
    return { title: 'Ndara Afrique - Excellence Panafricaine' };
  }
}

export default function CoursePage({ params }: Props) {
  return <CourseDetailClient courseId={params.slug} />;
}
