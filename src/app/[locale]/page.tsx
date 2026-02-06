'use client';

/**
 * @fileOverview Landing Page Ndara Afrique.
 * Affiche le contenu dynamique, les catégories de cours et le bouton Tableau de Bord.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, onSnapshot, getFirestore, where, orderBy, limit, getDocs, getCountFromServer, doc } from 'firebase/firestore';
import Link from 'next/link';
import type { Course, NdaraUser, Settings } from '@/lib/types';
import { Footer } from '@/components/layout/footer';
import Image from 'next/image';
import { Sparkles, Search, LayoutDashboard, ChevronsRight, BookCopy, UserPlus, Award, Wallet, ShieldCheck, Lock, HelpingHand } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Carousel, CarouselContent, CarouselItem } from '@/components/ui/carousel';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { CourseCard } from '@/components/cards/CourseCard';
import { DynamicCarousel } from '@/components/ui/DynamicCarousel';
import { useRole } from '@/context/RoleContext';
import { useDoc } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const LandingNav = ({ logoUrl, siteName }: { logoUrl: string, siteName: string }) => {
    const [scrolled, setScrolled] = useState(false);
    const { user, role } = useRole();

    useEffect(() => {
        const handleScroll = () => {
            const isScrolled = window.scrollY > 10;
            if (isScrolled !== scrolled) {
                setScrolled(isScrolled);
            }
        };

        document.addEventListener('scroll', handleScroll);
        return () => {
            document.removeEventListener('scroll', handleScroll);
        };
    }, [scrolled]);

    const dashboardUrl = role === 'admin' ? '/admin' : role === 'instructor' ? '/instructor/dashboard' : '/student/dashboard';

    return (
        <nav className={cn(
            "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
            scrolled ? "py-3 bg-slate-900/80 backdrop-blur-sm border-b border-white/10" : "py-6"
        )}>
            <div className="container mx-auto px-4 flex justify-between items-center">
                <Link href="/" className="flex items-center gap-3 group transition-transform hover:scale-105">
                    <div className="relative w-10 h-10 overflow-hidden rounded-lg shadow-lg bg-primary/20 flex items-center justify-center border border-white/10">
                        <Image 
                            src={logoUrl} 
                            alt={`${siteName} Logo`} 
                            width={40} 
                            height={40} 
                            className="object-contain"
                        />
                    </div>
                    <span className="text-xl font-bold tracking-tighter text-white">{siteName}</span>
                </Link>
                <div className="flex items-center gap-2">
                    <Button asChild variant="ghost" size="icon" className="text-white hover:bg-white/10">
                        <Link href="/search">
                            <Search className="h-5 w-5" />
                        </Link>
                    </Button>
                    <Link href={user ? dashboardUrl : "/login"}>
                        <Button variant="outline" className="nd-cta-secondary bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white h-9 px-6 rounded-full text-xs font-bold uppercase tracking-widest">
                            {user ? "Mon Espace" : "Se connecter"}
                        </Button>
                    </Link>
                </div>
            </div>
        </nav>
    );
};

const EnrollmentCounter = () => {
    const [count, setCount] = useState<number | null>(null);
    const db = getFirestore();

    useEffect(() => {
        const fetchCount = async () => {
            try {
                const coll = collection(db, 'enrollments');
                const snapshot = await getCountFromServer(coll);
                setCount(snapshot.data().count);
            } catch (error) {
                console.error("Error fetching enrollment count:", error);
                setCount(0);
            }
        };
        fetchCount();
    }, [db]);

    if (count === null || count < 10) return null;

    return (
        <p className="text-sm text-slate-400 mt-4">
            Rejoignez nos <span className="font-bold text-primary">{count.toLocaleString('fr-FR')}</span> participants et commencez votre parcours.
        </p>
    );
};

const CourseCarousel = ({ title, courses, instructorsMap, isLoading }: { title: string, courses: Course[], instructorsMap: Map<string, Partial<NdaraUser>>, isLoading: boolean }) => {
    if (isLoading && courses.length === 0) {
        return (
            <section className="py-8">
                <Skeleton className="h-8 w-1/3 mb-6 bg-slate-800" />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    <Skeleton className="h-80 rounded-xl bg-slate-800"></Skeleton>
                    <Skeleton className="h-80 rounded-xl bg-slate-800 hidden sm:block"></Skeleton>
                    <Skeleton className="h-80 rounded-xl bg-slate-800 hidden lg:block"></Skeleton>
                </div>
            </section>
        );
    }
    if (!courses || courses.length === 0) {
        return null;
    }

    return (
        <section className="py-8">
            <h2 className="text-2xl md:text-3xl font-bold mb-6 text-foreground">{title}</h2>
             <Carousel opts={{ align: "start", loop: false }} className="w-full">
                <CarouselContent className="-ml-4">
                    {courses.map(course => (
                        <CarouselItem key={course.id} className="pl-4 basis-[80%] sm:basis-1/2 md:basis-1/3 lg:basis-1/4">
                            <CourseCard course={course} instructor={instructorsMap.get(course.instructorId) || null} variant="catalogue" />
                        </CarouselItem>
                    ))}
                </CarouselContent>
            </Carousel>
        </section>
    );
};

const InteractiveSteps = () => {
    const [activeStep, setActiveStep] = useState(0);
    const steps = [
        {
            icon: UserPlus,
            title: "Inscription Facile",
            description: "Créez votre compte en quelques secondes et choisissez votre domaine d'intérêt pour une expérience personnalisée.",
            image: "https://images.unsplash.com/photo-1579208570338-4a4a1b183944?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080"
        },
        {
            icon: BookCopy,
            title: "Choix du Parcours",
            description: "Explorez un catalogue riche de formations conçues par des experts africains et commencez à apprendre à votre rythme.",
            image: "https://images.unsplash.com/photo-1521714161819-15534968fc5f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080"
        },
        {
            icon: Award,
            title: "Certification & Carrière",
            description: "Obtenez des certificats reconnus pour valider vos compétences et accédez à de nouvelles opportunités professionnelles.",
            image: "https://images.unsplash.com/photo-1571260899-6d6f5a3a4a7e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080"
        }
    ];

    return (
        <section className="py-16">
             <h2 className="text-2xl md:text-3xl font-bold text-center mb-4 text-foreground">Comment ça marche ?</h2>
             <p className="text-muted-foreground text-center max-w-xl mx-auto mb-10">Un parcours simple en 3 étapes pour transformer votre carrière.</p>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
                 <div className="space-y-4">
                    {steps.map((step, index) => {
                        const isActive = activeStep === index;
                        return (
                            <button key={index} onClick={() => setActiveStep(index)} className={cn(
                                "w-full text-left p-4 md:p-6 rounded-2xl border-2 transition-all duration-300 outline-none",
                                isActive 
                                    ? "bg-primary/10 border-primary shadow-2xl shadow-primary/10" 
                                    : "bg-slate-800/40 border-slate-700/80 hover:bg-slate-700/50"
                            )}>
                                <div className="flex items-center gap-4">
                                    <div className={cn("p-3 rounded-full", isActive ? "bg-primary" : "bg-slate-700")}>
                                        <step.icon className={cn("w-5 h-5", isActive ? "text-primary-foreground" : "text-primary")} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-base md:text-lg text-white">{step.title}</h3>
                                        {isActive && <p className="text-sm text-slate-300 mt-1 animate-fade-in-up">{step.description}</p>}
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>
                <div className="relative aspect-square rounded-3xl overflow-hidden shadow-2xl shadow-slate-900/50 hidden lg:block">
                    {steps.map((step, index) => (
                        <Image
                            key={index}
                            src={step.image}
                            alt={step.title}
                            fill
                            loading="lazy"
                            className={cn(
                                "object-cover transition-opacity duration-500",
                                activeStep === index ? 'opacity-100' : 'opacity-0'
                            )}
                        />
                    ))}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent"></div>
                </div>
            </div>
        </section>
    );
};

const PaymentMethodsSection = () => {
    const paymentMethods = [
        { name: 'MTN Mobile Money', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/9/93/MTN_Mobile_Money_logo.svg' },
        { name: 'Orange Money', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f8/Orange_Money_logo.svg/2560px-Orange_Money_logo.svg.png' },
        { name: 'Wave', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/89/Wave_logo.svg/2560px-Wave_logo.svg.png' },
    ];

    return (
        <section className="py-16">
            <Card className="dark:bg-slate-800/30 dark:border-slate-700/80 overflow-hidden">
                <CardContent className="p-6 md:p-10">
                    <div className="grid lg:grid-cols-2 gap-10 items-center">
                        <div className="text-center lg:text-left">
                            <div className="inline-block p-3 bg-primary/10 rounded-full mb-4">
                                <Wallet className="w-6 h-6 text-primary" />
                            </div>
                            <h2 className="text-2xl md:text-3xl font-bold text-white">Payez simplement, comme vous en avez l'habitude.</h2>
                            <p className="text-lg md:text-xl text-primary font-semibold mt-2">Aucune carte bancaire requise.</p>
                            <p className="text-slate-400 mt-4 max-w-md mx-auto lg:mx-0 text-sm leading-relaxed">
                                Nous intégrons les solutions de paiement que vous utilisez tous les jours. L'inscription à un cours est rapide, facile et 100% sécurisée.
                            </p>
                        </div>
                        <div className="flex justify-center items-center gap-4 flex-wrap">
                            {paymentMethods.map(method => (
                                <div key={method.name} className="p-4 bg-slate-800/50 border border-slate-700/80 rounded-2xl grayscale hover:grayscale-0 transition-all duration-300 hover:scale-105 hover:shadow-lg">
                                    <img 
                                        src={method.logoUrl}
                                        alt={method.name}
                                        className="h-10 w-auto object-contain"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                </CardContent>
            </Card>
        </section>
    );
};

const TrustSection = () => {
    const trustFeatures = [
        {
            icon: ShieldCheck,
            title: "Paiements Sécurisés",
            description: "Nous utilisons des partenaires de paiement conformes aux normes PCI-DSS pour garantir la sécurité de vos fonds."
        },
        {
            icon: Lock,
            title: "Données Protégées",
            description: "Toutes les communications sur notre plateforme sont chiffrées. Votre vie privée est notre priorité absolue."
        },
        {
            icon: HelpingHand,
            title: "Support Réactif",
            description: "Besoin d'aide ? Notre équipe locale est disponible pour répondre à toutes vos questions via WhatsApp et Email."
        }
    ];

    return (
        <section className="py-16">
             <h2 className="text-2xl md:text-3xl font-bold text-center mb-4 text-foreground">Votre sérénité, notre priorité</h2>
             <p className="text-muted-foreground text-center max-w-2xl mx-auto mb-12">
                Nous intégrons les meilleures technologies pour garantir la sécurité et la traçabilité de chaque transaction.
             </p>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {trustFeatures.map((feature, index) => (
                    <Card key={index} className="bg-slate-900/50 border border-slate-800/80 text-center transition-all duration-300 hover:-translate-y-2 hover:border-primary/50">
                        <CardHeader className="items-center">
                            <div className="inline-block p-3 bg-primary/10 rounded-full mb-2">
                                <feature.icon className="w-7 h-7 text-primary" />
                            </div>
                            <CardTitle className="text-lg text-white">{feature.title}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-slate-400 leading-relaxed">{feature.description}</p>
                        </CardContent>
                    </Card>
                ))}
             </div>
        </section>
    );
};

export default function LandingPage() {
  const { user, role } = useRole();
  const db = getFirestore();
  const settingsRef = useMemo(() => doc(db, 'settings', 'global'), [db]);
  const { data: settings } = useDoc<Settings>(settingsRef);

  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [instructorsMap, setInstructorsMap] = useState<Map<string, Partial<NdaraUser>>>(new Map());

  const dashboardUrl = role === 'admin' ? '/admin' : role === 'instructor' ? '/instructor/dashboard' : '/student/dashboard';

  useEffect(() => {
    const q = query(
      collection(db, "courses"),
      where("status", "==", "Published"),
      orderBy("createdAt", "desc")
    );
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const coursesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course));
      setCourses(coursesData);
      
      if (coursesData.length > 0) {
        const instructorIds = [...new Set(coursesData.map(c => c.instructorId).filter(Boolean))];
        if (instructorIds.length > 0) {
            const usersQuery = query(collection(db, 'users'), where('uid', 'in', instructorIds.slice(0, 30)));
            const userSnapshots = await getDocs(usersQuery);
            const newInstructors = new Map<string, Partial<NdaraUser>>();
            userSnapshots.forEach(doc => {
                const userData = doc.data();
                newInstructors.set(userData.uid, { fullName: userData.fullName });
            });
            setInstructorsMap(newInstructors);
        }
      }
      setLoading(false);
    }, (error) => {
      console.error("Erreur Firebase:", error);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [db]);
  
  const fetchedName = settings?.general?.siteName || '';
  const siteName = (fetchedName.includes('Forma') || !fetchedName) ? 'Ndara Afrique' : fetchedName;
  const logoUrl = settings?.general?.logoUrl || '/logo.png';

  const popularCourses = useMemo(() => courses.filter(c => c.isPopular).slice(0, 8), [courses]);
  const freeCourses = useMemo(() => courses.filter(c => c.price === 0).slice(0, 8), [courses]);
  const recentCourses = useMemo(() => courses.slice(0, 8), [courses]);

  return (
    <div className="bg-background text-foreground min-h-screen font-sans">
      <LandingNav logoUrl={logoUrl} siteName={siteName} />
      
      <div className="container mx-auto px-4">
        
        {/* --- HERO SECTION --- */}
        <header className="text-center pt-32 pb-16 md:pt-40 md:pb-24">
          <Badge variant="outline" className="mb-4 border-primary/50 text-primary animate-fade-in-up">
            <Sparkles className="w-3 h-3 mr-2" />
            La plateforme N°1 pour les compétences du futur en Afrique
          </Badge>
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight !leading-tight animate-fade-in-up">
            Apprenez. Construisez. Prospérez.
          </h1>
          <p className="text-muted-foreground text-base md:text-lg max-w-2xl mx-auto mt-6 mb-8 animate-fade-in-up">
            Des formations de pointe conçues par des experts africains, pour les talents africains sur {siteName}. Transformez vos ambitions en succès.
          </p>
          <div className="animate-fade-in-up">
              <Link href={user ? dashboardUrl : "/login?tab=register"}>
                  <button className="nd-cta-primary h-12 text-base md:h-auto md:text-sm mx-auto">
                      {user ? (
                          <>
                            <LayoutDashboard className="w-5 h-5" />
                            Accéder à mon tableau de bord
                          </>
                      ) : "Démarrer mon parcours"}
                  </button>
              </Link>
              <EnrollmentCounter />
          </div>
        </header>
          
        <main className="space-y-12 sm:space-y-16 pb-24">
          <DynamicCarousel />

          <CourseCarousel
            title="Les nouveautés à ne pas rater"
            courses={recentCourses}
            instructorsMap={instructorsMap}
            isLoading={loading}
          />

          <InteractiveSteps />

          <PaymentMethodsSection />

          <CourseCarousel
            title="Les plus populaires"
            courses={popularCourses}
            instructorsMap={instructorsMap}
            isLoading={loading}
          />

          <CourseCarousel
            title="Formations Gratuites"
            courses={freeCourses}
            instructorsMap={instructorsMap}
            isLoading={loading}
          />

          <TrustSection />

          <section className="text-center py-20 bg-slate-900/30 rounded-[3rem] border border-white/5">
            <h2 className="text-2xl md:text-3xl font-bold text-white">Prêt à transformer votre avenir ?</h2>
            <p className="mt-2 text-slate-400">Rejoignez des milliers de talents qui construisent le futur de l'Afrique.</p>
            <Button size="lg" asChild className="mt-8 h-12 text-base md:h-14 md:text-lg nd-cta-primary animate-pulse">
                <Link href={user ? dashboardUrl : "/login?tab=register"}>
                    {user ? "Accéder au Tableau de bord" : "Devenir Membre"}
                    <ChevronsRight className="ml-2 h-5 w-5" />
                </Link>
            </Button>
          </section>
        </main>
      </div>
      <Footer />

      {/* --- MOBILE FIXED CTA --- */}
      <div className="sm:hidden fixed bottom-4 left-4 right-4 z-50">
          <Button size="lg" className="w-full h-14 text-sm font-black uppercase tracking-widest nd-cta-primary shadow-2xl" asChild>
              <Link href={user ? dashboardUrl : "/login?tab=register"}>
                  {user ? (
                      <>
                        <LayoutDashboard className="w-5 h-5 mr-2" />
                        Tableau de bord
                      </>
                  ) : "Démarrer"}
              </Link>
          </Button>
      </div>
    </div>
  );
}
