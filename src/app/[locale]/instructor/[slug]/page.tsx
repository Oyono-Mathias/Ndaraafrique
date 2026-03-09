import { Metadata } from 'next';
import { getAdminDb } from '@/firebase/admin';
import type { NdaraUser } from '@/lib/types';
import PublicInstructorProfile from '@/components/instructor/PublicInstructorProfile';
import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { unstable_setRequestLocale } from 'next-intl/server';

/**
 * @fileOverview Page serveur unifiée pour le profil public d'un instructeur.
 * Résout le conflit de routage en utilisant uniquement le paramètre [slug].
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
    // On cherche l'instructeur par son UID ou son username (le slug)
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
        <div className="relative h-12 w-12">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <div className="absolute inset-0 flex items-center justify-center">
                <div className="h-2 w-2 bg-primary rounded-full animate-pulse" />
            </div>
        </div>
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Chargement du profil expert...</p>
      </div>
    }>
      <PublicInstructorProfile instructorId={slug} locale={locale} />
    </Suspense>
  );
}
