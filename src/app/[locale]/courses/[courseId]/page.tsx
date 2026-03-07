
import { Metadata } from 'next';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { getAdminDb } from '@/firebase/admin';
import type { Course } from '@/lib/types';
import CourseDetailClient from '@/components/courses/CourseDetailClient';

/**
 * @fileOverview Page serveur pour les détails des cours.
 * Gère la génération dynamique des métadonnées Open Graph pour les réseaux sociaux.
 */

interface Props {
  params: { courseId: string; locale: string };
}

// 🌐 Génération des métadonnées pour Facebook, WhatsApp, X, LinkedIn
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { courseId } = params;
  
  try {
    const db = getAdminDb();
    const courseDoc = await db.collection('courses').doc(courseId).get();
    
    if (!courseDoc.exists) {
      return { title: 'Formation non trouvée | Ndara Afrique' };
    }

    const course = courseDoc.data() as Course;
    const shareUrl = `https://ndara-afrique.web.app/${params.locale}/courses/${courseId}`;

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
        locale: params.locale,
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
    console.error("Metadata generation error:", error);
    return { title: 'Ndara Afrique - Excellence Panafricaine' };
  }
}

export default function CoursePage({ params }: Props) {
  return <CourseDetailClient courseId={params.courseId} />;
}
