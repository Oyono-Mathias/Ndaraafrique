import { Metadata } from 'next';
import { getAdminDb } from '@/firebase/admin';
import type { NdaraUser } from '@/lib/types';
import PublicInstructorProfile from '@/components/instructor/PublicInstructorProfile';
import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { unstable_setRequestLocale } from 'next-intl/server';

/**
 * @fileOverview Page serveur pour le profil public d'un instructeur.
 * Gère le SEO et l'agrégation des données de l'expert.
 */

interface Props {
  params: { slug: string; locale: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, locale } = params;
  unstable_setRequestLocale(locale);
  
  try {
    const db = getAdminDb();
    const userDoc = await db.collection('users').doc(slug).get();
    
    if (!userDoc.exists) {
      return { title: 'Expert non trouvé | Ndara Afrique' };
    }

    const instructor = userDoc.data() as NdaraUser;
    const shareUrl = `https://ndara-afrique.web.app/${locale}/instructor/${slug}`;

    return {
      title: `${instructor.fullName} | Expert sur Ndara Afrique`,
      description: instructor.bio?.substring(0, 160) || `Découvrez les formations de ${instructor.fullName} sur Ndara Afrique.`,
      openGraph: {
        title: instructor.fullName,
        description: instructor.bio?.substring(0, 160),
        url: shareUrl,
        siteName: 'Ndara Afrique',
        images: [
          {
            url: instructor.profilePictureURL || 'https://ndara-assets.b-cdn.net/logo.png',
            width: 800,
            height: 800,
            alt: instructor.fullName,
          },
        ],
        locale: locale,
        type: 'profile',
      },
    };
  } catch (error) {
    return { title: 'Ndara Afrique - Excellence Panafricaine' };
  }
}

export default function InstructorPublicPage({ params }: Props) {
  const { slug, locale } = params;
  unstable_setRequestLocale(locale);

  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Chargement du profil...</p>
      </div>
    }>
      <PublicInstructorProfile instructorId={slug} locale={locale} />
    </Suspense>
  );
}
