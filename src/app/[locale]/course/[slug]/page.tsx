import { Metadata } from 'next';
import { getAdminDb } from '@/firebase/admin';
import type { Course } from '@/lib/types';
import PublicCourseDetail from '@/components/courses/PublicCourseDetail';
import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { unstable_setRequestLocale } from 'next-intl/server';

/**
 * @fileOverview Page serveur pour la vitrine publique d'une formation.
 * Gère l'OpenGraph pour les réseaux sociaux et l'optimisation SEO.
 */

interface Props {
  params: { slug: string; locale: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, locale } = params;
  unstable_setRequestLocale(locale);
  
  try {
    const db = getAdminDb();
    // Le slug correspond à l'ID unique de la formation en base
    const courseDoc = await db.collection('courses').doc(slug).get();
    
    if (!courseDoc.exists) {
      return { title: 'Formation non trouvée | Ndara Afrique' };
    }

    const course = courseDoc.data() as Course;
    const shareUrl = `https://ndara-afrique.web.app/${locale}/course/${slug}`;

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
    console.error("Metadata generation error:", error);
    return { title: 'Ndara Afrique - Excellence Panafricaine' };
  }
}

export default function PublicCoursePage({ params }: Props) {
  const { slug, locale } = params;
  unstable_setRequestLocale(locale);

  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Chargement de la formation...</p>
      </div>
    }>
      <PublicCourseDetail courseId={slug} locale={locale} />
    </Suspense>
  );
}
