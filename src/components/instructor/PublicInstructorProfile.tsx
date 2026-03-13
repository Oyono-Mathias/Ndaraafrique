'use client';

/**
 * @fileOverview Vitrine publique de l'Expert Ndara Afrique.
 * Ce composant est conçu pour transformer un formateur en "Autorité" pédagogique.
 * Il affiche l'expertise, l'impact social et le catalogue complet.
 */

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { doc, getFirestore, collection, query, where, getDocs, orderBy, onSnapshot } from 'firebase/firestore';
import { useDoc } from '@/firebase/firestore/use-doc';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Star, 
  Users, 
  BookOpen, 
  ArrowLeft, 
  Share2, 
  ChevronRight, 
  Globe, 
  Twitter, 
  Linkedin, 
  Youtube,
  Award,
  ShieldCheck,
  Quote
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import type { Course, NdaraUser, Review } from '@/lib/types';

export default function PublicInstructorProfile({ instructorId, locale }: { instructorId: string; locale: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const db = getFirestore();

  const [courses, setCourses] = useState<Course[]>([]);
  const [stats, setStats] = useState({ totalStudents: 0, avgRating: 4.8, totalReviews: 0 });
  const [isLoadingData, setIsLoadingData] = useState(true);

  // 1. Charger le profil de l'instructeur (L'Autorité)
  const instructorRef = useMemo(() => instructorId ? doc(db, 'users', instructorId) : null, [db, instructorId]);
  const { data: instructor, isLoading: instructorLoading } = useDoc<NdaraUser>(instructorRef);

  // 2. Charger les cours et calculer les stats d'impact réelles
  useEffect(() => {
    if (!instructorId) return;

    const fetchData = async () => {
      setIsLoadingData(true);
      try {
        const q = query(
          collection(db, 'courses'), 
          where('instructorId', '==', instructorId),
          where('status', '==', 'Published'),
          orderBy('createdAt', 'desc')
        );
        const snap = await getDocs(q);
        const coursesData = snap.docs.map(d => ({ id: d.id, ...d.data() } as Course));
        setCourses(coursesData);

        if (coursesData.length > 0) {
            const courseIds = coursesData.map(c => c.id);
            const enrollSnap = await getDocs(query(collection(db, 'enrollments'), where('courseId', 'in', courseIds.slice(0, 30))));
            const studentsCount = enrollSnap.size;

            const reviewsSnap = await getDocs(query(collection(db, 'course_reviews'), where('courseId', 'in', courseIds.slice(0, 30))));
            const totalReviews = reviewsSnap.size;
            
            let sum = 0;
            reviewsSnap.forEach(d => { sum += (d.data() as Review).rating; });
            const avg = totalReviews > 0 ? sum / totalReviews : 4.8;

            setStats({
                totalStudents: studentsCount,
                avgRating: avg,
                totalReviews: totalReviews
            });
        }
      } catch (e) {
        console.error("Error fetching instructor authority data:", e);
      } finally {
        setIsLoadingData(false);
      }
    };

    fetchData();
  }, [instructorId, db]);

  const handleShare = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    toast({ title: "Lien copié !", description: "Partagez l'excellence Ndara partout." });
  };

  const isLoading = instructorLoading || isLoadingData;

  if (isLoading) return <InstructorProfileSkeleton />;
  if (!instructor) return <div className="p-20 text-center text-slate-500">Expert non trouvé.</div>;

  return (
    <div className="min-h-screen bg-[#0f172a] pb-32 font-sans selection:bg-primary/30 relative">
      <div className="grain-overlay opacity-[0.03]" />
      
      {/* --- HERO SECTION : PRESTIGE & AUTORITÉ --- */}
      <div className="relative pt-12 pb-12 px-6 bg-gradient-to-b from-primary/10 to-transparent">
        <button 
          onClick={() => router.back()} 
          className="absolute top-12 left-6 w-10 h-10 bg-white/5 border border-white/10 rounded-full flex items-center justify-center text-slate-400 active:scale-90 transition"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        <div className="flex flex-col items-center text-center space-y-6 animate-in fade-in slide-in-from-top-4 duration-1000">
          <div className="relative">
            <div className="absolute -inset-2 bg-gradient-to-tr from-primary via-blue-500 to-amber-500 rounded-full blur-lg opacity-20 animate-pulse" />
            <Avatar className="h-36 w-32 border-4 border-slate-900 shadow-2xl relative rounded-[2.5rem] overflow-hidden">
              <AvatarImage src={instructor.profilePictureURL} className="object-cover" />
              <AvatarFallback className="bg-slate-800 text-4xl font-black text-slate-500 uppercase">
                {instructor.fullName?.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="absolute -bottom-2 -right-2 bg-[#fbbf24] p-2 rounded-2xl border-4 border-[#0f172a] shadow-xl">
                <ShieldCheck className="h-5 w-5 text-slate-950" />
            </div>
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl md:text-4xl font-black text-white uppercase tracking-tight leading-none">
                {instructor.fullName}
            </h1>
            <p className="text-primary font-black uppercase tracking-[0.3em] text-[10px] bg-primary/5 px-4 py-1.5 rounded-full inline-block border border-primary/10">
                {instructor.careerGoals?.currentRole || 'Expert Certifié Ndara'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button 
                variant="outline" 
                size="sm" 
                className="h-11 px-6 rounded-2xl border-white/5 bg-white/5 text-[10px] font-black uppercase tracking-widest gap-2 hover:bg-white/10"
                onClick={handleShare}
            >
                <Share2 className="h-4 w-4" /> Partager le profil
            </Button>
          </div>
        </div>
      </div>

      {/* --- IMPACT BAR : LA PREUVE PAR LES CHIFFRES --- */}
      <div className="px-6 max-w-2xl mx-auto">
        <div className="grid grid-cols-3 gap-3 p-6 bg-slate-900/50 border border-white/5 rounded-[2.5rem] shadow-2xl backdrop-blur-xl">
            <div className="text-center space-y-1">
                <p className="text-2xl font-black text-white leading-none">{stats.totalStudents}</p>
                <p className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em] mt-2">Apprenants</p>
            </div>
            <div className="text-center space-y-1 border-x border-white/5">
                <p className="text-2xl font-black text-primary leading-none">{stats.avgRating.toFixed(1)}</p>
                <div className="flex items-center justify-center gap-1 mt-2">
                    <Star size={10} className="text-[#fbbf24] fill-[#fbbf24]" />
                    <p className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em]">Évaluation</p>
                </div>
            </div>
            <div className="text-center space-y-1">
                <p className="text-2xl font-black text-white leading-none">{courses.length}</p>
                <p className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em] mt-2">Formations</p>
            </div>
        </div>
      </div>

      <div className="px-6 mt-12 space-y-16 max-w-2xl mx-auto">
        {/* --- BIOGRAPHIE : L'HISTOIRE DE L'EXPERT --- */}
        <section className="space-y-6">
          <h2 className="text-[11px] font-black uppercase tracking-[0.4em] text-primary flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            Mon Expertise
          </h2>
          <div className="relative">
            <Quote className="absolute -left-4 -top-4 size-12 text-primary opacity-[0.05]" />
            <p className="text-slate-300 text-sm md:text-base leading-relaxed font-medium italic pl-4 border-l border-white/5">
                {instructor.bio || "Cet expert construit actuellement son académie Ndara. Ses formations parlent de sa maîtrise technique et pédagogique."}
            </p>
          </div>
        </section>

        {/* --- ACADÉMIE : LES FORMATIONS --- */}
        <section className="space-y-8">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-[11px] font-black uppercase tracking-[0.4em] text-primary flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                Mon Académie
            </h2>
            <span className="text-slate-600 text-[9px] font-black uppercase tracking-widest">{courses.length} formations</span>
          </div>
          
          <div className="grid gap-4">
            {courses.map(course => (
              <Link key={course.id} href={`/${locale}/course/${course.id}`} className="group block active:scale-[0.98] transition-all">
                <Card className="bg-slate-900 border border-white/5 overflow-hidden rounded-[2rem] shadow-xl hover:border-primary/30 transition-all duration-500">
                    <div className="flex items-center p-4 gap-5">
                        <div className="relative h-20 w-28 shrink-0 rounded-2xl overflow-hidden bg-slate-800 shadow-inner">
                            <Image src={course.imageUrl || ''} alt={course.title} fill className="object-cover group-hover:scale-110 transition-transform duration-700" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-black text-white line-clamp-1 uppercase tracking-tight group-hover:text-primary transition-colors">{course.title}</h3>
                            <div className="flex items-center gap-3 mt-2">
                                <div className="flex items-center gap-1">
                                    <Star size={10} className="text-[#fbbf24] fill-[#fbbf24]" />
                                    <span className="text-[10px] font-black text-slate-300">{course.rating?.toFixed(1) || '4.8'}</span>
                                </div>
                                <span className="text-slate-700 font-bold">•</span>
                                <p className="text-[#10b981] text-[10px] font-black uppercase">{course.price === 0 ? "Offert" : `${course.price.toLocaleString('fr-FR')} XOF`}</p>
                            </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-slate-800 group-hover:text-primary transition-all mr-2" />
                    </div>
                </Card>
              </Link>
            ))}
          </div>
        </section>

        {/* --- SOCIAL CHIPS --- */}
        {(instructor.socialLinks?.twitter || instructor.socialLinks?.linkedin || instructor.socialLinks?.youtube) && (
            <section className="space-y-6 pt-12 border-t border-white/5">
                <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-600 text-center">Réseaux de l'Expert</h2>
                <div className="flex justify-center gap-4">
                    {instructor.socialLinks.linkedin && (
                        <a href={instructor.socialLinks.linkedin} target="_blank" className="w-12 h-12 bg-white/5 rounded-full border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:border-primary/30 transition-all active:scale-90"><Linkedin size={20}/></a>
                    )}
                    {instructor.socialLinks.youtube && (
                        <a href={instructor.socialLinks.youtube} target="_blank" className="w-12 h-12 bg-white/5 rounded-full border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:border-primary/30 transition-all active:scale-90"><Youtube size={20}/></a>
                    )}
                    {instructor.socialLinks.twitter && (
                        <a href={instructor.socialLinks.twitter} target="_blank" className="w-12 h-12 bg-white/5 rounded-full border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:border-primary/30 transition-all active:scale-90"><Twitter size={20}/></a>
                    )}
                </div>
            </section>
        )}

        <div className="bg-primary/5 border border-primary/10 rounded-[2.5rem] p-10 text-center space-y-6 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-full blur-3xl -mr-12 -mt-12" />
            <div className="p-4 bg-primary/10 rounded-2xl inline-block mx-auto relative z-10">
                <Award className="h-10 w-10 text-primary" />
            </div>
            <div className="space-y-2 relative z-10">
                <h3 className="text-xl font-black text-white uppercase tracking-tight">Savoir d'Excellence</h3>
                <p className="text-[10px] text-slate-500 leading-relaxed font-bold uppercase tracking-widest max-w-[280px] mx-auto">
                    Le contenu de cet expert a été audité par Ndara Afrique pour garantir un standard de qualité panafricain.
                </p>
            </div>
        </div>

        <p className="text-center text-[9px] font-black text-slate-800 uppercase tracking-[0.5em] pb-12">Ndara Afrique Elite Network</p>
      </div>
    </div>
  );
}

function InstructorProfileSkeleton() {
  return (
    <div className="min-h-screen bg-[#0f172a] space-y-12 pt-24 px-6">
      <div className="flex flex-col items-center space-y-6">
        <Skeleton className="h-32 w-32 rounded-[2.5rem] bg-slate-900" />
        <div className="space-y-2 text-center">
            <Skeleton className="h-8 w-48 bg-slate-900 mx-auto" />
            <Skeleton className="h-4 w-32 bg-slate-900 mx-auto" />
        </div>
      </div>
      <div className="max-w-2xl mx-auto space-y-10">
        <Skeleton className="h-24 w-full bg-slate-900 rounded-[2.5rem]" />
        <Skeleton className="h-48 w-full bg-slate-900 rounded-[2.5rem]" />
      </div>
    </div>
  );
}
