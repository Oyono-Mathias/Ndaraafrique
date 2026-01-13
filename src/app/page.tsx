
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Search, Star, BookOpen, Users, Award, ChevronRight, Frown, Loader2, UserPlus, CheckCircle, GraduationCap, Video } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useRole } from '@/context/RoleContext';
import { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { LanguageSelector } from '@/components/layout/language-selector';
import { Footer } from '@/components/layout/footer';
import { getFirestore, collection, query, where, getDocs, limit, orderBy } from 'firebase/firestore';
import type { Course } from '@/lib/types';
import type { FormaAfriqueUser } from '@/context/RoleContext';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { DynamicCarousel } from '@/components/ui/DynamicCarousel';
import { Header } from '@/components/layout/header';
import { CourseCard } from '@/components/cards/CourseCard';

export default function LandingPage() {
  const router = useRouter();
  const { user, isUserLoading } = useRole();
  const { t } = useTranslation();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [courses, setCourses] = useState<Course[]>([]);
  const [instructors, setInstructors] = useState<Map<string, Partial<FormaAfriqueUser>>>(new Map());
  const [coursesLoading, setCoursesLoading] = useState(true);
  
  useEffect(() => {
    if (!isUserLoading && user) {
      router.push('/dashboard');
    }
  }, [user, isUserLoading, router]);
  
  useEffect(() => {
    const fetchCourses = async () => {
        setCoursesLoading(true);
        try {
            const db = getFirestore();
            const coursesRef = collection(db, 'courses');
            const q = query(coursesRef, where('status', '==', 'Published'), limit(8));
            const querySnapshot = await getDocs(q);
            const coursesData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course));
            setCourses(coursesData);

            if (coursesData.length > 0) {
                const instructorIds = [...new Set(coursesData.map(c => c.instructorId))].filter(Boolean);
                if (instructorIds.length === 0) return;

                const usersRef = collection(db, 'users');
                const usersQuery = query(usersRef, where('uid', 'in', instructorIds));
                const userSnapshots = await getDocs(usersQuery);
                const instMap = new Map<string, Partial<FormaAfriqueUser>>();
                userSnapshots.forEach(doc => instMap.set(doc.data().uid, doc.data()));
                setInstructors(instMap);
            }
        } catch (error) {
            console.error("Error fetching courses for landing page:", error);
        } finally {
             setCoursesLoading(false);
        }
    };
    if (!user) { // Only fetch if user is not logged in
        fetchCourses();
    }
  }, [user]);

  const handleBecomeInstructorClick = (e: React.MouseEvent) => {
    if (!user) {
        e.preventDefault();
        toast({
            title: "Accès réservé",
            description: "Veuillez créer un compte ou vous connecter pour devenir formateur.",
            variant: "destructive",
        });
        router.push('/login');
    }
  };

  if (isUserLoading || user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#0f172a]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="w-full bg-[#0f172a] text-slate-200 flex flex-col">
       <header className="sticky top-0 z-50 p-4 bg-[#0f172a]/80 backdrop-blur-sm border-b border-slate-700/50">
        <div className="container mx-auto flex justify-between items-center">
          <Link href="/" className="flex items-center gap-3">
            <Image src="/icon.svg" alt="Ndara Afrique Logo" width={32} height={32} />
            <span className="font-bold text-xl text-white">Ndara Afrique</span>
          </Link>
          <div className="flex items-center gap-2">
            <div className="hidden md:block"><LanguageSelector /></div>
            <Button variant="ghost" asChild className="hidden md:inline-flex text-white hover:bg-slate-800">
              <Link href="/login">{t('loginButton')}</Link>
            </Button>
            <Button asChild className="rounded-full bg-primary hover:bg-primary/90 text-white">
              <Link href="/login?tab=register">{t('registerButton')}</Link>
            </Button>
             <div className="md:hidden"><Header /></div>
          </div>
        </div>
      </header>
      <main className="flex-grow">
        <section className="relative pt-20 pb-28 md:pt-28 md:pb-36 w-full">
            <div className="absolute inset-0 bg-gradient-to-b from-slate-900/10 via-[#0f172a] to-[#0f172a] -z-0"></div>
            <div className="container mx-auto px-4 z-10 relative text-center">
              <div className="hero-text">
                <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white !leading-tight max-w-4xl mx-auto">
                  <span className="block">{t('welcome')}</span>
                  <span className="block text-primary">Tonga na ndara.</span>
                </h1>
                <p className="max-w-3xl mx-auto mt-6 text-lg md:text-xl text-slate-300">
                  Des milliers de cours en ligne créés par des experts locaux. Payez par Mobile Money, apprenez à votre rythme.
                </p>
                <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
                    <Button size="lg" asChild className="h-14 text-base w-full sm:w-auto rounded-full bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20">
                      <Link href="/login?tab=register">{t('registerButton')}</Link>
                    </Button>
                </div>
              </div>
            </div>
        </section>

        <section className="container mx-auto px-4 -mt-16 z-20 relative">
            <DynamicCarousel />
        </section>
        
        <section className="py-16 md:py-24">
            <div className="container mx-auto px-4">
                <h2 className="text-3xl font-bold text-center mb-10 text-white">Une sélection de cours pour démarrer</h2>
                {coursesLoading ? (
                     <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-80 w-full rounded-2xl bg-slate-800" />)}
                    </div>
                ) : courses.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {courses.map(course => (
                            <CourseCard key={course.id} course={course} instructor={instructors.get(course.instructorId) || null} />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-10 px-4 border-2 border-dashed border-slate-700 rounded-xl">
                        <Frown className="mx-auto h-10 w-10 text-slate-500" />
                        <h3 className="mt-2 text-md font-semibold text-slate-300">Aucun cours disponible pour le moment.</h3>
                        <p className="text-sm text-slate-400">Revenez bientôt !</p>
                    </div>
                )}
            </div>
        </section>

        <section className="py-16 md:py-24">
            <div className="container mx-auto px-4">
                <h2 className="text-3xl font-bold text-center mb-12 text-white">Comment ça marche ?</h2>
                <div className="grid md:grid-cols-3 gap-8">
                    <div className="benefit-card text-center flex flex-col items-center">
                        <div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 mb-4"><UserPlus className="h-8 w-8 text-primary" /></div>
                        <h3 className="font-bold text-lg text-white">1. S'inscrire</h3>
                        <p className="text-slate-400 mt-2">Créez votre compte en quelques secondes et accédez à notre catalogue.</p>
                    </div>
                    <div className="benefit-card text-center flex flex-col items-center">
                         <div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 mb-4"><Video className="h-8 w-8 text-primary" /></div>
                        <h3 className="font-bold text-lg text-white">2. Apprendre</h3>
                        <p className="text-slate-400 mt-2">Suivez les cours vidéo à votre rythme, sur mobile ou ordinateur.</p>
                    </div>
                    <div className="benefit-card text-center flex flex-col items-center">
                         <div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 mb-4"><GraduationCap className="h-8 w-8 text-primary" /></div>
                        <h3 className="font-bold text-lg text-white">3. Être Certifié</h3>
                        <p className="text-slate-400 mt-2">Validez vos compétences avec une certification à la fin de chaque formation.</p>
                    </div>
                </div>
            </div>
        </section>
      </main>
      <Footer onBecomeInstructorClick={handleBecomeInstructorClick}/>
    </div>
  );
}
