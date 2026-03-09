'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { doc, getFirestore, collection, query, getDocs, orderBy, getCountFromServer, limit, where } from 'firebase/firestore';
import { useDoc } from '@/firebase/firestore/use-doc';
import { useRole } from '@/context/RoleContext';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  PlayCircle, 
  ShieldCheck, 
  Star, 
  Users, 
  ArrowLeft, 
  Loader2, 
  ChevronRight,
  Share2,
  BookOpen,
  MessageSquare,
  Award,
  Clock,
  Lock,
  RotateCcw,
  Facebook,
  Linkedin,
  Link as LinkIcon
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { YoutubePlayer } from '@/components/ui/youtube-player';
import { BunnyPlayer } from '@/components/ui/bunny-player';
import { useToast } from '@/hooks/use-toast';
import type { Course, Section, Lecture, NdaraUser, Enrollment, Review } from '@/lib/types';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface EnrichedReview extends Review {
    userName?: string;
    userAvatar?: string;
}

/**
 * @fileOverview Vitrine publique d'un cours Ndara Afrique.
 * Optimisée pour la conversion visiteur -> étudiant.
 */
export default function PublicCourseDetail({ courseId, locale }: { courseId: string; locale: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isUserLoading, currentUser } = useRole();
  const { toast } = useToast();
  const db = getFirestore();

  const [isEnrolling, setIsEnrolling] = useState(false);
  const [sections, setSections] = useState<Section[]>([]);
  const [lecturesMap, setLecturesMap] = useState<Map<string, Lecture[]>>(new Map());
  const [reviews, setReviews] = useState<EnrichedReview[]>([]);
  const [stats, setStats] = useState({ rating: 4.8, reviewCount: 0, studentCount: 0 });
  const [isDataLoading, setIsDataLoading] = useState(true);

  // 1. Chargement des données de base
  const courseRef = useMemo(() => courseId ? doc(db, 'courses', courseId) : null, [db, courseId]);
  const { data: course, isLoading: courseLoading } = useDoc<Course>(courseRef);

  const instructorRef = useMemo(() => course?.instructorId ? doc(db, 'users', course.instructorId) : null, [course, db]);
  const { data: instructor } = useDoc<NdaraUser>(instructorRef);

  const enrollmentRef = useMemo(() => (user && courseId) ? doc(db, 'enrollments', `${user.uid}_${courseId}`) : null, [user, courseId, db]);
  const { data: enrollment } = useDoc<Enrollment>(enrollmentRef);

  // 2. Chargement du contenu enrichi (Curriculum, Avis, Stats)
  useEffect(() => {
    if (!courseId) return;

    const fetchData = async () => {
        setIsDataLoading(true);
        try {
            // A. Programme (Curriculum)
            const sectionsSnap = await getDocs(query(collection(db, 'courses', courseId, 'sections'), orderBy('order')));
            const sectionsData = sectionsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Section));
            setSections(sectionsData);

            const lMap = new Map();
            for (const section of sectionsData) {
                const lecturesSnap = await getDocs(query(collection(db, 'courses', courseId, 'sections', section.id, 'lectures'), orderBy('order')));
                lMap.set(section.id, lecturesSnap.docs.map(d => ({ id: d.id, ...d.data() } as Lecture)));
            }
            setLecturesMap(lMap);

            // B. Avis & Stats
            const reviewsQuery = query(collection(db, 'reviews'), where('courseId', '==', courseId), orderBy('createdAt', 'desc'), limit(5));
            const reviewsSnap = await getDocs(reviewsQuery);
            const rawReviews = reviewsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Review));

            if (rawReviews.length > 0) {
                const userIds = [...new Set(rawReviews.map(r => r.userId))];
                const usersSnap = await getDocs(query(collection(db, 'users'), where('uid', 'in', userIds.slice(0, 30))));
                const uMap = new Map();
                usersSnap.forEach(d => uMap.set(d.id, d.data()));

                setReviews(rawReviews.map(r => ({
                    ...r,
                    userName: uMap.get(r.userId)?.fullName || 'Étudiant Ndara',
                    userAvatar: uMap.get(r.userId)?.profilePictureURL
                })));
            }

            // C. Comptage réel
            const qEnrolled = query(collection(db, 'enrollments'), where('courseId', '==', courseId));
            const snapEnrolled = await getCountFromServer(qEnrolled);
            
            setStats({
                rating: course?.rating || 4.8,
                reviewCount: rawReviews.length,
                studentCount: snapEnrolled.data().count
            });

        } catch (e) {
            console.warn("Could not fetch curriculum or reviews", e);
        } finally {
            setIsDataLoading(false);
        }
    };

    if (course) fetchData();
  }, [courseId, db, course]);

  const handleStartLearning = () => {
    if (!user) {
      const currentPath = window.location.pathname;
      router.push(`/${locale}/login?tab=register&redirect=${encodeURIComponent(currentPath)}`);
      return;
    }

    if (enrollment) {
      router.push(`/${locale}/student/courses/${courseId}`);
    } else {
      router.push(`/${locale}/student/checkout/${courseId}`);
    }
  };

  const handleSocialShare = (platform: 'wa' | 'fb' | 'in' | 'copy') => {
    const url = window.location.href;
    const text = `Découvrez cette formation sur Ndara Afrique : ${course?.title} 🚀`;
    
    switch (platform) {
      case 'wa':
        window.open(`https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`, '_blank');
        break;
      case 'fb':
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
        break;
      case 'in':
        window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`, '_blank');
        break;
      case 'copy':
        navigator.clipboard.writeText(url);
        toast({ title: "Lien copié !", description: "Vous pouvez maintenant le coller partout." });
        break;
    }
  };

  if (courseLoading || isUserLoading) return <PublicCourseSkeleton />;

  return (
    <div className="min-h-screen bg-slate-950 pb-32">
      {/* 1. Header & Preview Vidéo */}
      <div className="relative aspect-video w-full bg-slate-900 overflow-hidden shadow-2xl">
        <Button 
          variant="ghost" 
          size="icon" 
          className="absolute top-4 left-4 z-30 bg-black/40 backdrop-blur-md rounded-full text-white"
          onClick={() => router.back()}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        
        {course?.previewVideoUrl ? (
          <div className="h-full w-full">
            {course.previewVideoUrl.includes('youtube') || course.previewVideoUrl.includes('youtu.be')
              ? <YoutubePlayer url={course.previewVideoUrl} className="h-full" />
              : <BunnyPlayer videoId={course.previewVideoUrl} />}
          </div>
        ) : (
          <>
            <Image 
              src={course?.imageUrl || 'https://picsum.photos/seed/ndara/800/450'} 
              alt={course?.title || 'Course'} 
              fill 
              className="object-cover opacity-60"
              priority
            />
            <div className="absolute inset-0 flex items-center justify-center">
                <PlayCircle className="h-16 w-16 text-white opacity-40 animate-pulse" />
            </div>
          </>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent pointer-events-none" />
      </div>

      <div className="px-4 -mt-6 relative z-10 space-y-12 max-w-2xl mx-auto">
        {/* 2. Titre & Preuve Sociale */}
        <div className="space-y-4">
          <Badge className="bg-primary text-primary-foreground border-none font-black uppercase text-[10px] tracking-[0.1em] px-3 py-1 rounded-md shadow-lg">
              {course?.category}
          </Badge>
          <h1 className="text-3xl md:text-4xl font-black text-white leading-tight tracking-tight uppercase">
            {course?.title}
          </h1>
          
          <div className="flex flex-wrap items-center gap-6 text-xs font-bold text-slate-400">
            <div className="flex items-center gap-1.5">
              <Star className={cn("h-4 w-4", stats.rating > 0 ? "text-yellow-500 fill-yellow-500" : "text-slate-700")} />
              <span className="text-white text-sm">{stats.rating.toFixed(1)}</span>
              <span className="opacity-50">({stats.reviewCount} avis)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Users className="h-4 w-4 text-primary" />
              <span className="text-white">{stats.studentCount || 100}+ Ndara inscrits</span>
            </div>
          </div>
        </div>

        {/* 3. Badges de Confiance */}
        <section className="grid grid-cols-3 gap-2">
          <div className="flex flex-col items-center text-center p-4 bg-slate-900/50 border border-slate-800 rounded-2xl space-y-2 shadow-xl">
            <div className="p-2 bg-emerald-500/10 rounded-full">
              <ShieldCheck className="h-5 w-5 text-emerald-500" />
            </div>
            <p className="text-[8px] font-black uppercase leading-tight text-slate-300">Paiement sécurisé</p>
          </div>
          <div className="flex flex-col items-center text-center p-4 bg-slate-900/50 border border-slate-800 rounded-2xl space-y-2 shadow-xl">
            <div className="p-2 bg-blue-500/10 rounded-full">
              <RotateCcw className="h-5 w-5 text-blue-400" />
            </div>
            <p className="text-[8px] font-black uppercase leading-tight text-slate-300">Garantie 7 jours</p>
          </div>
          <div className="flex flex-col items-center text-center p-4 bg-slate-900/50 border border-slate-800 rounded-2xl space-y-2 shadow-xl">
            <div className="p-2 bg-amber-500/10 rounded-full">
              <Award className="h-5 w-5 text-amber-500" />
            </div>
            <p className="text-[8px] font-black uppercase leading-tight text-slate-300">Diplôme vérifié</p>
          </div>
        </section>

        {/* 4. Description */}
        <section className="space-y-4">
          <h2 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-3">
            <div className="h-6 w-1.5 bg-primary rounded-full" />
            À propos du cours
          </h2>
          <p className="text-slate-400 leading-relaxed text-sm">
            {course?.description}
          </p>
        </section>

        {/* 5. Instructeur */}
        {instructor && (
          <section className="space-y-4">
            <h2 className="text-sm font-black uppercase tracking-[0.2em] text-slate-500 ml-1">Expert certifié</h2>
            <Link href={`/${locale}/instructor/${instructor.uid}`} className="block p-6 bg-slate-900 border border-slate-800 rounded-[2.5rem] shadow-2xl active:scale-95 transition-all group">
                <div className="flex items-center gap-5">
                    <Avatar className="h-20 w-20 border-2 border-primary/20 shadow-lg">
                        <AvatarImage src={instructor.profilePictureURL} className="object-cover" />
                        <AvatarFallback className="bg-slate-800 text-slate-500 font-bold text-xl">
                            {instructor.fullName?.charAt(0)}
                        </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                        <p className="text-xl font-black text-white leading-tight group-hover:text-primary transition-colors">{instructor.fullName}</p>
                        <p className="text-[11px] font-bold text-primary uppercase tracking-[0.1em] mt-1">{instructor.careerGoals?.currentRole || 'Spécialiste certifié Ndara'}</p>
                        <div className="flex items-center gap-4 mt-3">
                            <div className="text-center">
                                <p className="text-sm font-black text-white leading-none">1.2k</p>
                                <p className="text-[8px] font-black text-slate-500 uppercase tracking-tighter mt-1">Élèves</p>
                            </div>
                            <div className="h-6 w-px bg-slate-800" />
                            <div className="text-center">
                                <p className="text-sm font-black text-white leading-none">4.9</p>
                                <p className="text-[8px] font-black text-slate-500 uppercase tracking-tighter mt-1">Note moy.</p>
                            </div>
                        </div>
                    </div>
                    <ChevronRight className="h-6 w-6 text-slate-700 group-hover:text-primary" />
                </div>
            </Link>
          </section>
        )}

        {/* 6. Programme (Curriculum) */}
        <section className="space-y-6">
            <h2 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-3">
                <div className="h-6 w-1.5 bg-primary rounded-full" />
                Programme détaillé
            </h2>
            <div className="space-y-3">
                {isDataLoading ? (
                    [...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-2xl bg-slate-900" />)
                ) : sections.length > 0 ? (
                    sections.map((section, idx) => (
                        <div key={section.id} className="bg-slate-900/40 border border-slate-800/50 rounded-2xl overflow-hidden">
                            <div className="p-4 bg-slate-800/30 border-b border-white/5 flex items-center justify-between">
                                <h3 className="font-bold text-sm text-slate-200">
                                    <span className="text-primary opacity-60 mr-2 font-mono">{String(idx + 1).padStart(2, '0')}</span> 
                                    {section.title}
                                </h3>
                                <span className="text-[10px] font-black text-slate-500 uppercase">{(lecturesMap.get(section.id) || []).length} leçons</span>
                            </div>
                            <ul className="divide-y divide-white/5">
                                {(lecturesMap.get(section.id) || []).map(lecture => (
                                    <li key={lecture.id} className="p-4 flex items-center justify-between group">
                                        <div className="flex items-center gap-3 min-w-0">
                                            {lecture.isFreePreview ? (
                                                <PlayCircle className="h-4 w-4 text-emerald-500 shrink-0" />
                                            ) : (
                                                <Lock className="h-4 w-4 text-slate-700 shrink-0" />
                                            )}
                                            <div className="flex flex-col min-w-0">
                                                <span className="text-xs font-medium text-slate-400 truncate leading-snug">{lecture.title}</span>
                                                {lecture.isFreePreview && (
                                                    <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mt-0.5">Aperçu Gratuit</span>
                                                )}
                                            </div>
                                        </div>
                                        {lecture.duration && (
                                            <span className="text-[10px] font-bold text-slate-600 shrink-0 ml-4">{lecture.duration}m</span>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))
                ) : (
                    <p className="text-sm text-slate-500 italic text-center py-8">Contenu en cours de finalisation.</p>
                )}
            </div>
        </section>

        {/* 7. Certification */}
        <section className="bg-gradient-to-br from-slate-900 to-primary/5 border-2 border-primary/20 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden group">
            <div className="absolute -right-6 -bottom-6 opacity-[0.05] group-hover:scale-110 transition-transform">
                <Award size={180} className="text-primary" />
            </div>
            <div className="relative z-10 space-y-6 text-center sm:text-left">
                <div className="flex flex-col sm:flex-row items-center gap-4">
                    <div className="p-4 bg-primary/10 rounded-2xl">
                        <Award className="h-10 w-10 text-primary" />
                    </div>
                    <div>
                        <h3 className="text-2xl font-black text-white uppercase tracking-tight">Certificat Ndara Vérifié</h3>
                        <p className="text-xs text-primary font-bold uppercase tracking-[0.2em] mt-1">Reconnaissance Panafricaine</p>
                    </div>
                </div>
                <p className="text-slate-400 text-sm leading-relaxed max-w-lg">
                    Chaque réussite débloque un diplôme numérique sécurisé. Grâce à son ID unique, votre employeur peut vérifier l'authenticité de vos compétences sur notre portail public.
                </p>
                <div className="flex items-center gap-2 text-emerald-500 bg-emerald-500/10 px-4 py-2 rounded-xl border border-emerald-500/20 w-fit mx-auto sm:mx-0">
                    <ShieldCheck className="h-4 w-4" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Inclus sans frais cachés</span>
                </div>
            </div>
        </section>

        {/* 8. Avis */}
        {reviews.length > 0 && (
            <section className="space-y-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-3">
                        <div className="h-6 w-1.5 bg-primary rounded-full" />
                        Ce que disent les Ndara
                    </h2>
                </div>
                <div className="grid gap-4">
                    {reviews.map((review) => (
                        <div key={review.id} className="p-6 bg-slate-900/50 border border-slate-800 rounded-[2rem] space-y-4 shadow-xl">
                            <div className="flex items-center gap-3">
                                <Avatar className="h-10 w-10 border border-white/5">
                                    <AvatarImage src={review.userAvatar} />
                                    <AvatarFallback className="bg-slate-800 text-[10px] font-bold text-slate-500">
                                        {review.userName?.charAt(0)}
                                    </AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="text-sm font-bold text-white leading-tight">{review.userName}</p>
                                    <div className="flex items-center gap-0.5 mt-1">
                                        {[...Array(5)].map((_, i) => (
                                            <Star key={i} size={10} className={cn(i < review.rating ? "text-yellow-500 fill-yellow-500" : "text-slate-700")} />
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <p className="text-sm text-slate-400 italic leading-relaxed">"{review.comment}"</p>
                        </div>
                    ))}
                </div>
            </section>
        )}

        {/* 9. Partage Social */}
        <section className="space-y-4 pb-8">
          <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">Partager cette pépite</h2>
          <div className="grid grid-cols-4 gap-3">
            <Button 
              variant="outline" 
              className="h-14 rounded-2xl bg-emerald-500/10 border-emerald-500/20 text-emerald-500 hover:bg-emerald-500 hover:text-white transition-all p-0"
              onClick={() => handleSocialShare('wa')}
            >
              <MessageSquare className="h-6 w-6" />
            </Button>
            <Button 
              variant="outline" 
              className="h-14 rounded-2xl bg-blue-600/10 border-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white transition-all p-0"
              onClick={() => handleSocialShare('fb')}
            >
              <Facebook className="h-6 w-6" />
            </Button>
            <Button 
              variant="outline" 
              className="h-14 rounded-2xl bg-blue-700/10 border-blue-700/20 text-blue-500 hover:bg-blue-700 hover:text-white transition-all p-0"
              onClick={() => handleSocialShare('in')}
            >
              <Linkedin className="h-6 w-6" />
            </Button>
            <Button 
              variant="outline" 
              className="h-14 rounded-2xl bg-slate-800 border-slate-700 text-slate-400 hover:text-white transition-all p-0"
              onClick={() => handleSocialShare('copy')}
            >
              <LinkIcon className="h-6 w-6" />
            </Button>
          </div>
        </section>
      </div>

      {/* Barre de Conversion Mobile */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-slate-950/95 backdrop-blur-2xl border-t border-slate-800 z-50 safe-area-pb shadow-[0_-10px_40px_rgba(0,0,0,0.6)]">
        <div className="max-w-md mx-auto flex items-center justify-between gap-4">
          <div className="flex flex-col">
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-0.5">Accès Permanent</p>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-white">
                {course?.price === 0 ? "OFFERT" : (course?.price || 0).toLocaleString('fr-FR')}
              </span>
              {course?.price !== 0 && <span className="text-[10px] font-black text-primary uppercase">XOF</span>}
            </div>
          </div>
          <Button 
            onClick={handleStartLearning}
            disabled={isEnrolling}
            className={cn(
              "flex-1 h-14 rounded-xl text-sm font-black uppercase tracking-wider transition-all active:scale-[0.96] shadow-xl shadow-primary/20",
              enrollment 
                ? "bg-white text-slate-950 hover:bg-slate-100" 
                : "bg-primary text-primary-foreground hover:bg-primary/90"
            )}
          >
            {isEnrolling ? <Loader2 className="h-5 w-5 animate-spin" /> : enrollment ? "Reprendre le cours" : "S'inscrire maintenant"}
            <ChevronRight className="ml-2 h-4 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function PublicCourseSkeleton() {
  return (
    <div className="min-h-screen bg-slate-950 space-y-8 pb-32">
      <Skeleton className="w-full aspect-video bg-slate-900 rounded-none" />
      <div className="px-4 space-y-6 max-w-2xl mx-auto">
        <Skeleton className="h-12 w-3/4 bg-slate-900 rounded-xl" />
        <Skeleton className="h-24 w-full bg-slate-900 rounded-2xl" />
        <Skeleton className="h-64 w-full bg-slate-900 rounded-2xl" />
      </div>
    </div>
  );
}
