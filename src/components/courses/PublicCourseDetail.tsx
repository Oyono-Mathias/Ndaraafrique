'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useDoc } from '@/firebase';
import { doc, getFirestore } from 'firebase/firestore';
import { useRole } from '@/context/RoleContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  PlayCircle, 
  ShieldCheck, 
  Star, 
  Users, 
  ArrowLeft, 
  Loader2, 
  ChevronRight,
  Share2,
  BookOpen
} from 'lucide-react';
import Image from 'next/image';
import { YoutubePlayer } from '@/components/ui/youtube-player';
import { BunnyPlayer } from '@/components/ui/bunny-player';
import type { Course, NdaraUser, Enrollment } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

/**
 * @fileOverview Composant de détail public d'une formation.
 * Accessible sans connexion. Gère le marketing et le tunnel vers l'inscription.
 */
export default function PublicCourseDetail({ courseId, locale }: { courseId: string; locale: string }) {
  const router = useRouter();
  const { user, isUserLoading } = useRole();
  const { toast } = useToast();
  const db = getFirestore();

  const courseRef = useMemo(() => doc(db, 'courses', courseId), [db, courseId]);
  const { data: course, isLoading: courseLoading } = useDoc<Course>(courseRef);

  const instructorRef = useMemo(() => course?.instructorId ? doc(db, 'users', course.instructorId) : null, [course, db]);
  const { data: instructor } = useDoc<NdaraUser>(instructorRef);

  const enrollmentRef = useMemo(() => (user && courseId) ? doc(db, 'enrollments', `${user.uid}_${courseId}`) : null, [user, courseId, db]);
  const { data: enrollment } = useDoc<Enrollment>(enrollmentRef);

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

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: course?.title,
        text: course?.description?.substring(0, 100),
        url: window.location.href,
      }).catch(console.error);
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast({ title: "Lien copié dans le presse-papier" });
    }
  };

  if (courseLoading || isUserLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Ouverture de la vitrine...</p>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-center">
        <h1 className="text-2xl font-black text-white uppercase tracking-tight">Formation introuvable</h1>
        <p className="text-slate-500 mt-2">Le lien est peut-être expiré ou erroné.</p>
        <Button variant="link" onClick={() => router.push('/')} className="text-primary mt-6 uppercase font-black text-xs">
          Retour à l'accueil
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 pb-32">
      {/* Header Visuel / Vidéo */}
      <div className="relative aspect-video w-full bg-slate-900 overflow-hidden shadow-2xl">
        <Button 
          variant="ghost" 
          size="icon" 
          className="absolute top-4 left-4 z-30 bg-black/40 backdrop-blur-md rounded-full text-white"
          onClick={() => router.back()}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        
        <Button 
          variant="ghost" 
          size="icon" 
          className="absolute top-4 right-4 z-30 bg-black/40 backdrop-blur-md rounded-full text-white"
          onClick={handleShare}
        >
          <Share2 className="h-5 w-5" />
        </Button>

        {course.previewVideoUrl ? (
          course.previewVideoUrl.includes('youtube') || course.previewVideoUrl.includes('youtu.be')
            ? <YoutubePlayer url={course.previewVideoUrl} className="h-full" />
            : <BunnyPlayer videoId={course.previewVideoUrl} />
        ) : (
          <>
            <Image 
              src={course.imageUrl || 'https://picsum.photos/seed/ndara/800/450'} 
              alt={course.title} 
              fill 
              className="object-cover opacity-60"
              priority
            />
            <div className="absolute inset-0 flex items-center justify-center">
                <PlayCircle className="h-16 w-16 text-white opacity-40" />
            </div>
          </>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent pointer-events-none" />
      </div>

      <div className="px-4 -mt-6 relative z-10 space-y-10 max-w-2xl mx-auto">
        {/* Identité du cours */}
        <div className="space-y-4">
          <Badge className="bg-primary text-primary-foreground border-none font-black uppercase text-[10px] tracking-[0.1em] px-3 py-1 rounded-md shadow-lg">
            {course.category}
          </Badge>
          <h1 className="text-3xl font-black text-white leading-tight tracking-tight uppercase">
            {course.title}
          </h1>
          
          <div className="flex items-center gap-6 text-xs font-bold text-slate-400">
            <div className="flex items-center gap-1.5">
              <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
              <span className="text-white text-sm">{course.rating || '4.8'}</span>
              <span className="opacity-50">({course.participantsCount || 42} Ndara)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <BookOpen className="h-4 w-4 text-primary" />
              <span>Contenu Premium</span>
            </div>
          </div>
        </div>

        {/* Instructeur */}
        {instructor && (
          <div className="flex items-center gap-4 p-5 bg-slate-900 border border-slate-800 rounded-[2rem] shadow-xl">
            <Avatar className="h-14 w-14 border-2 border-slate-800 shadow-lg">
              <AvatarImage src={instructor.profilePictureURL} className="object-cover" />
              <AvatarFallback className="bg-slate-800 text-slate-500 font-bold">
                {instructor.fullName?.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="text-[9px] font-black text-primary uppercase tracking-[0.2em] mb-0.5">Formateur Expert</p>
              <p className="font-black text-white leading-none">{instructor.fullName}</p>
              <p className="text-[10px] text-slate-500 font-medium mt-1 italic">{instructor.careerGoals?.currentRole || 'Spécialiste certifié Ndara'}</p>
            </div>
          </div>
        )}

        {/* Description */}
        <section className="space-y-4">
          <h2 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-3">
            <div className="h-6 w-1 bg-primary rounded-full shadow-[0_0_8px_hsl(var(--primary))]" />
            Description
          </h2>
          <p className="text-slate-400 leading-relaxed text-sm font-medium">
            {course.description}
          </p>
        </section>

        {/* Réassurance */}
        <section className="bg-gradient-to-br from-slate-900 to-primary/5 border border-slate-800 rounded-[2.5rem] p-8 space-y-5 shadow-2xl">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-7 w-7 text-emerald-500" />
            <h3 className="font-black text-white uppercase tracking-widest text-sm">Garantie Excellence</h3>
          </div>
          <ul className="grid gap-3">
            {[
                "Accès permanent illimité",
                "Certification de réussite officielle",
                "Mentorat MATHIAS IA 24h/24",
                "Mises à jour incluses"
            ].map((item, i) => (
                <li key={i} className="flex items-center gap-3 text-[11px] font-bold text-slate-400 uppercase tracking-tight">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                    {item}
                </li>
            ))}
          </ul>
        </section>
      </div>

      {/* Barre de Conversion Fixe */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-slate-950/95 backdrop-blur-2xl border-t border-slate-800 z-50 safe-area-pb shadow-[0_-10px_40px_rgba(0,0,0,0.6)]">
        <div className="max-w-md mx-auto flex items-center justify-between gap-4">
          <div className="flex flex-col">
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-0.5">Accès Immédiat</p>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-white">
                {course.price > 0 ? (course.price || 0).toLocaleString('fr-FR') : "OFFERT"}
              </span>
              {course.price > 0 && <span className="text-[10px] font-black text-primary uppercase">XOF</span>}
            </div>
          </div>
          <Button 
            onClick={handleStartLearning}
            className="flex-1 h-14 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-black uppercase text-xs tracking-widest shadow-2xl shadow-primary/20 transition-all active:scale-[0.96]"
          >
            {enrollment ? "Reprendre" : "S'inscrire maintenant"}
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
