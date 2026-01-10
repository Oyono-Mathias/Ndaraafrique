
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Menu, Star, BookOpen, Users, Award, Briefcase, ChevronRight, Frown, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useRole } from '@/context/RoleContext';
import { useEffect, useState, useMemo } from 'react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useTranslation } from 'react-i18next';
import { LanguageSelector } from '@/components/layout/language-selector';
import { Footer } from '@/components/layout/footer';
import { getFirestore, collection, query, where, getDocs, limit, orderBy } from 'firebase/firestore';
import type { Course } from '@/lib/types';
import type { FormaAfriqueUser } from '@/context/RoleContext';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';

const CourseCard = ({ course, instructor }: { course: Course, instructor: Partial<FormaAfriqueUser> | null }) => {
    const { user } = useRole();
    const router = useRouter();
    const { toast } = useToast();

    const handleClick = (e: React.MouseEvent) => {
        if (!user) {
            e.preventDefault();
            toast({
                title: "Accès réservé",
                description: "Veuillez vous connecter ou créer un compte pour voir les détails du cours.",
                variant: 'destructive',
            });
            router.push('/login');
        }
    };
    
    return (
      <div className="bg-background-alt rounded-xl overflow-hidden border border-border shadow-sm hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
        <Link href={`/course/${course.id}`} onClick={handleClick} className="block">
          <Image src={course.imageUrl || `https://picsum.photos/seed/${course.id}/300/170`} alt={course.title} width={300} height={170} className="w-full aspect-video object-cover" />
          <div className="p-4">
            <h3 className="font-bold text-base text-foreground line-clamp-2 h-12">{course.title}</h3>
            <p className="text-xs text-muted-foreground mt-1">{instructor?.fullName || 'Instructeur FormaAfrique'}</p>
            <div className="flex items-center gap-1 mt-2">
              <span className="font-bold text-sm text-amber-500">4.8</span>
              <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
              <span className="text-xs text-slate-500">({(Math.random() * 2000 + 50).toFixed(0)})</span>
            </div>
            <p className="font-extrabold text-lg text-foreground mt-2">
              {course.price > 0 ? `${course.price.toLocaleString('fr-FR')} FCFA` : 'Gratuit'}
            </p>
          </div>
        </Link>
      </div>
    );
};


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
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="w-full bg-background text-foreground flex flex-col">
       <header className="sticky top-0 z-50 p-4 bg-background/80 backdrop-blur-sm border-b border-border">
        <div className="container mx-auto flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/icon.svg" alt="FormaAfrique Logo" width={32} height={32} />
            <span className="font-bold text-xl text-foreground">FormaAfrique</span>
          </Link>
          <div className="hidden md:flex items-center gap-2">
            <Button variant="ghost" asChild>
              <Link href="/login">Se connecter</Link>
            </Button>
            <Button asChild className="rounded-full">
              <Link href="/login?tab=register">S'inscrire</Link>
            </Button>
          </div>
           <div className="md:hidden">
                <Sheet>
                    <SheetTrigger asChild>
                        <Button variant="ghost" size="icon">
                            <Menu className="h-6 w-6"/>
                            <span className="sr-only">Ouvrir le menu</span>
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="right" className="w-full max-w-sm bg-background">
                        <nav className="flex flex-col h-full p-4">
                            <div className="flex flex-col gap-4 text-lg font-medium mt-8">
                                <Link href="/search" onClick={(e) => { e.preventDefault(); router.push('/login'); toast({title: "Veuillez vous connecter."})}}>Tous les cours</Link>
                                <Link href="/devenir-instructeur" onClick={handleBecomeInstructorClick}>Devenir Formateur</Link>
                            </div>
                            <div className="mt-auto space-y-4">
                                <Button asChild size="lg" className="w-full rounded-full">
                                    <Link href="/login?tab=register">S'inscrire gratuitement</Link>
                                </Button>
                                <Button asChild size="lg" variant="outline" className="w-full rounded-full">
                                    <Link href="/login">Se connecter</Link>
                                </Button>
                            </div>
                        </nav>
                    </SheetContent>
                </Sheet>
           </div>
        </div>
      </header>
      <main className="flex-grow">
        <section className="relative pt-20 pb-28 md:pt-32 md:pb-40 w-full">
            <div className="absolute top-0 left-0 right-0 h-96 bg-gradient-to-b from-slate-100 to-transparent"></div>
            <div className="container mx-auto px-4 z-10 relative text-center">
              <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-foreground !leading-tight max-w-4xl mx-auto">
                Apprenez les compétences qui font bouger l'Afrique.
              </h1>
              <p className="max-w-3xl mx-auto mt-6 text-lg md:text-xl text-muted-foreground">
                Des milliers de cours en ligne créés par des experts locaux. Payez par Mobile Money, apprenez à votre rythme.
              </p>
               <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
                  <Button size="lg" asChild className="h-12 text-base w-full sm:w-auto rounded-full">
                    <Link href="/login?tab=register">Créer un compte gratuitement</Link>
                  </Button>
                   <Button size="lg" asChild variant="secondary" className="h-12 text-base w-full sm:w-auto rounded-full">
                    <Link href="/login">Parcourir le catalogue</Link>
                  </Button>
              </div>
            </div>
        </section>
        
        <section className="py-16 md:py-24">
            <div className="container mx-auto px-4">
                <h2 className="text-3xl font-bold text-center mb-10 text-foreground">Une sélection de cours pour démarrer</h2>
                {coursesLoading ? (
                     <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-80 w-full rounded-xl" />)}
                    </div>
                ) : courses.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {courses.map(course => (
                            <CourseCard key={course.id} course={course} instructor={instructors.get(course.instructorId) || null} />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-10 px-4 border-2 border-dashed border-border rounded-xl">
                        <Frown className="mx-auto h-10 w-10 text-slate-400" />
                        <h3 className="mt-2 text-md font-semibold text-foreground">Aucun cours disponible pour le moment.</h3>
                        <p className="text-sm text-muted-foreground">Revenez bientôt !</p>
                    </div>
                )}
            </div>
        </section>

        <section className="py-16 md:py-24 bg-background-alt">
            <div className="container mx-auto px-4">
                <div className="grid md:grid-cols-3 gap-10 text-center">
                    <div className="flex flex-col items-center">
                        <div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 mb-4"><BookOpen className="h-8 w-8 text-primary" /></div>
                        <h3 className="font-bold text-lg text-foreground">Apprenez à votre rythme</h3>
                        <p className="text-muted-foreground mt-2">Suivez les cours depuis n'importe quel appareil, sans contrainte de temps.</p>
                    </div>
                    <div className="flex flex-col items-center">
                         <div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 mb-4"><Users className="h-8 w-8 text-primary" /></div>
                        <h3 className="font-bold text-lg text-foreground">Experts locaux</h3>
                        <p className="text-muted-foreground mt-2">Nos formations sont créées par des professionnels africains pour le marché africain.</p>
                    </div>
                    <div className="flex flex-col items-center">
                         <div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 mb-4"><Award className="h-8 w-8 text-primary" /></div>
                        <h3 className="font-bold text-lg text-foreground">Certificats reconnus</h3>
                        <p className="text-muted-foreground mt-2">Validez vos compétences avec une certification à la fin de chaque formation.</p>
                    </div>
                </div>
            </div>
        </section>
        <section className="py-16 md:py-24">
             <div className="container mx-auto px-4 text-center">
                <div className="bg-background-alt p-10 rounded-2xl flex flex-col items-center">
                    <Briefcase className="h-10 w-10 text-primary mb-4" />
                    <h2 className="text-3xl font-bold text-foreground">Devenez Formateur</h2>
                    <p className="max-w-2xl mx-auto mt-4 text-muted-foreground">
                        Partagez votre expertise, créez un impact et générez des revenus en formant les talents de demain.
                    </p>
                    <Button size="lg" asChild className="mt-8 h-12 text-base rounded-full">
                        <Link href="/devenir-instructeur" onClick={handleBecomeInstructorClick}>Enseigner sur FormaAfrique <ChevronRight className="ml-2 h-4 w-4" /></Link>
                    </Button>
                </div>
            </div>
        </section>
      </main>
      <Footer onBecomeInstructorClick={handleBecomeInstructorClick}/>
    </div>
  );
}
