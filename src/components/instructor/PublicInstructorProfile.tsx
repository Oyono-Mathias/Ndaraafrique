'use client';

/**
 * @fileOverview Vitrine publique de l'Expert Ndara Afrique - Design "Authority" Qwen.
 * Ce composant transforme un formateur en "Autorité" pédagogique avec une esthétique de luxe.
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
  Quote,
  UserPlus
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

  // 1. Charger le profil de l'instructeur
  const instructorRef = useMemo(() => instructorId ? doc(db, 'users', instructorId) : null, [db, instructorId]);
  const { data: instructor, isLoading: instructorLoading } = useDoc<NdaraUser>(instructorRef);

  // 2. Charger les cours et calculer les stats réelles
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
        console.error("Error fetching instructor data:", e);
      } finally {
        setIsLoadingData(false);
      }
    };

    fetchData();
  }, [instructorId, db]);

  const handleShare = () => {
    if (typeof window === 'undefined') return;
    navigator.clipboard.writeText(window.location.href);
    toast({ title: "Lien copié !", description: "Partagez l'excellence Ndara." });
  };

  const isLoading = instructorLoading || isLoadingData;

  if (isLoading) return <InstructorProfileSkeleton />;
  if (!instructor) return <div className="p-20 text-center text-slate-500">Expert non trouvé.</div>;

  return (
    <div className="min-h-screen bg-ndara-bg pb-32 font-sans relative">
      <div className="grain-overlay" />
      
      {/* --- HEADER NAVIGATION --- */}
      <header className="fixed top-0 w-full z-50 bg-ndara-bg/80 backdrop-blur-md safe-area-pt">
          <div className="px-6 py-4 flex items-center justify-between">
              <button 
                onClick={() => router.back()}
                className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-white/10 transition active:scale-95"
              >
                  <ArrowLeft className="h-5 w-5" />
              </button>
              <button 
                onClick={handleShare}
                className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-white/10 transition active:scale-95"
              >
                  <Share2 className="h-5 w-5" />
              </button>
          </div>
      </header>

      <main className="flex-1 pt-24 px-6 space-y-10 animate-in fade-in duration-1000">
        
        {/* --- HERO SECTION --- */}
        <div className="flex flex-col items-center text-center">
            <div className="relative mb-6">
                <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-primary shadow-[0_0_30px_rgba(16,185,129,0.4)]">
                    <Avatar className="h-full w-full">
                        <AvatarImage src={instructor.profilePictureURL} className="object-cover" />
                        <AvatarFallback className="bg-slate-800 text-4xl font-black text-slate-500 uppercase">
                            {instructor.fullName?.charAt(0)}
                        </AvatarFallback>
                    </Avatar>
                </div>
                <div className="absolute bottom-0 right-0 bg-[#fbbf24] text-slate-950 w-10 h-10 rounded-full flex items-center justify-center border-4 border-ndara-bg shadow-xl">
                    <ShieldCheck className="h-6 w-6" />
                </div>
            </div>

            <h1 className="text-3xl font-black text-white mb-1 tracking-tight uppercase">{instructor.fullName}</h1>
            <p className="text-primary text-sm font-bold uppercase tracking-widest mb-4">
                {instructor.careerGoals?.currentRole || 'Expert Certifié Ndara'}
            </p>

            <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 mb-8">
                <Award className="h-3.5 w-3.5 text-[#fbbf24]" />
                <span className="text-slate-300 text-[10px] font-black uppercase tracking-widest">Expert Certifié Ndara</span>
            </div>

            {/* Impact Bar */}
            <div className="grid grid-cols-3 gap-4 w-full mb-10">
                <ImpactBox icon={Users} label="Ndara" value={`${stats.totalStudents}`} color="text-primary" />
                <ImpactBox icon={Star} label="Note" value={stats.avgRating.toFixed(1)} color="text-[#fbbf24]" />
                <ImpactBox icon={BookOpen} label="Cours" value={`${courses.length}`} color="text-[#fbbf24]" />
            </div>

            <Button className="w-full h-16 rounded-[2.5rem] bg-primary hover:bg-primary/90 text-slate-950 font-black uppercase text-xs tracking-widest shadow-xl shadow-primary/20 active:scale-95 transition-all">
                <UserPlus className="mr-2 h-5 w-5" /> Suivre cet Expert
            </Button>
        </div>

        {/* --- BIO SECTION --- */}
        <section className="space-y-4">
            <h2 className="text-[11px] font-black uppercase tracking-[0.4em] text-white flex items-center gap-2 ml-1">
                <div className="w-1 h-4 bg-primary rounded-full" />
                Mon Histoire
            </h2>
            <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 relative overflow-hidden">
                <Quote className="absolute -left-4 -top-4 size-16 text-white/5" />
                <p className="text-slate-300 text-sm md:text-base leading-relaxed italic mb-6 relative z-10 font-medium">
                    "{instructor.bio || "Le savoir est une quête infinie que je souhaite partager avec vous pour bâtir l'avenir du continent."}"
                </p>
                <p className="text-slate-500 text-xs leading-relaxed relative z-10 font-bold uppercase tracking-widest">
                    Expertise reconnue par Ndara Afrique.
                </p>
            </div>
        </section>

        {/* --- COURSE CATALOG --- */}
        <section className="space-y-6">
            <div className="flex items-center justify-between px-1">
                <h2 className="text-[11px] font-black uppercase tracking-[0.4em] text-white flex items-center gap-2">
                    <div className="w-1 h-4 bg-[#fbbf24] rounded-full" />
                    Son Académie
                </h2>
                <button className="text-primary text-[10px] font-black uppercase tracking-widest">VOIR TOUT</button>
            </div>

            <div className="grid gap-4">
                {courses.map(course => (
                    <Link key={course.id} href={`/${locale}/course/${course.id}`} className="group block active:scale-[0.98] transition-all">
                        <div className="bg-ndara-surface border border-white/5 rounded-[2.5rem] p-3 flex gap-4 shadow-xl group-hover:border-white/10">
                            <div className="w-28 h-20 rounded-[1.5rem] overflow-hidden shrink-0 relative bg-slate-800">
                                <Image src={course.imageUrl || ''} alt={course.title} fill className="object-cover group-hover:scale-110 transition-transform duration-700" />
                            </div>
                            <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
                                <h3 className="font-bold text-white text-sm leading-tight line-clamp-2 uppercase tracking-tight">{course.title}</h3>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1">
                                        <Star size={10} className="text-[#fbbf24] fill-[#fbbf24]" />
                                        <span className="text-white text-[10px] font-black">{course.rating?.toFixed(1) || '---'}</span>
                                    </div>
                                    <span className="text-primary text-xs font-black uppercase">
                                        {course.price === 0 ? 'Offert' : `${course.price.toLocaleString('fr-FR')} F`}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </Link>
                ))}
            </div>
        </section>

        {/* --- SOCIAL CHIPS --- */}
        <section className="space-y-6 pt-10 border-t border-white/5">
            <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-600 text-center">Connectez-vous</h2>
            <div className="flex justify-center gap-4">
                {instructor.socialLinks?.linkedin && <SocialBtn icon={Linkedin} href={instructor.socialLinks.linkedin} color="hover:bg-[#0A66C2]" />}
                {instructor.socialLinks?.youtube && <SocialBtn icon={Youtube} href={instructor.socialLinks.youtube} color="hover:bg-[#FF0000]" />}
                {instructor.socialLinks?.twitter && <SocialBtn icon={Twitter} href={instructor.socialLinks.twitter} color="hover:bg-[#1DA1F2]" />}
            </div>
        </section>

        <p className="text-center text-[9px] font-black text-slate-800 uppercase tracking-[0.5em] pb-12">Ndara Afrique • Excellence Network</p>
      </main>
    </div>
  );
}

function ImpactBox({ icon: Icon, label, value, color }: any) {
    return (
        <div className="bg-white/5 border border-white/10 rounded-3xl p-4 flex flex-col items-center justify-center transition-all active:scale-95 shadow-xl">
            <Icon className={cn("h-5 w-5 mb-2", color)} />
            <span className="text-white font-black text-lg leading-none">{value}</span>
            <span className="text-slate-600 text-[8px] font-black uppercase tracking-widest mt-2">{label}</span>
        </div>
    );
}

function SocialBtn({ icon: Icon, href, color }: any) {
    return (
        <a 
            href={href} 
            target="_blank" 
            rel="noopener noreferrer" 
            className={cn(
                "w-14 h-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white transition-all active:scale-90 shadow-2xl",
                color
            )}
        >
            <Icon size={22} />
        </a>
    );
}

function InstructorProfileSkeleton() {
  return (
    <div className="min-h-screen bg-ndara-bg space-y-12 pt-24 px-6">
      <div className="flex flex-col items-center space-y-6">
        <Skeleton className="h-32 w-32 rounded-full bg-slate-900" />
        <div className="space-y-2 text-center">
            <Skeleton className="h-8 w-48 bg-slate-900 mx-auto" />
            <Skeleton className="h-4 w-32 bg-slate-900 mx-auto" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
          <Skeleton className="h-24 rounded-3xl bg-slate-900" />
          <Skeleton className="h-24 rounded-3xl bg-slate-900" />
          <Skeleton className="h-24 rounded-3xl bg-slate-900" />
      </div>
      <Skeleton className="h-64 w-full rounded-[2.5rem] bg-slate-900" />
    </div>
  );
}