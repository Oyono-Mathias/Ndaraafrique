'use client';

import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, getFirestore, where, orderBy, limit, getDocs, getCountFromServer, doc } from 'firebase/firestore';
import Link from 'next/link';
import type { Course, NdaraUser, Settings } from '@/lib/types';
import { Footer } from '@/components/layout/footer';
import Image from 'next/image';
import { Frown, Sparkles, UserPlus, BookCopy, Award, ShieldCheck, Lock, HelpingHand, Wallet, ChevronsRight, Search, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Carousel, CarouselContent, CarouselItem } from '@/components/ui/carousel';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { CourseCard } from '@/components/cards/CourseCard';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { DynamicCarousel } from '@/components/ui/DynamicCarousel';
import { useRouter } from 'next/navigation';

const LandingNav = ({ siteSettings }: { siteSettings: Partial<Settings['platform']> }) => {
    const [scrolled, setScrolled] = useState(false);

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

    return (
        <nav className={cn(
            "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
            scrolled ? "py-3 bg-slate-900/80 backdrop-blur-sm border-b border-white/10" : "py-6"
        )}>
            <div className="container mx-auto px-4 flex justify-between items-center">
                <Link href="/" className="flex items-center gap-3 group transition-transform hover:scale-105">
                    <Image src="/icon.svg" alt="Ndara Afrique Logo" width={32} height={32} />
                    <span className="text-xl font-bold tracking-tighter text-white">Ndara Afrique</span>
                </Link>
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" className="text-white sm:hidden">
                        <Search className="h-5 w-5" />
                    </Button>
                     {siteSettings.allowInstructorSignup ? (
                        <Link href="/login">
                            <Button variant="outline" className="hidden sm:flex nd-cta-secondary bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white h-9">
                                Se connecter
                            </Button>
                        </Link>
                    ) : (
                         <Button variant="outline" className="hidden sm:flex nd-cta-secondary bg-white/10 border-white/20 text-white h-9" disabled>
                            Se connecter
                        </Button>
                    )}
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
            <div className="w-full">
                <Skeleton className="h-8 w-1/3 mb-6 bg-slate-800" />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    <Skeleton className="h-80 rounded-xl bg-slate-800"></Skeleton>
                    <Skeleton className="h-80 rounded-xl bg-slate-800 hidden sm:block"></Skeleton>
                    <Skeleton className="h-80 rounded-xl bg-slate-800 hidden lg:block"></Skeleton>
                </div>
            </div>
        );
    }
    if (!courses || courses.length === 0) {
        return null;
    }
    return (
        <section>
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
            image: "https://images.unsplash.com/photo-1579208570338-4a4a1b183944?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHw3fHxzaWduJTIwdXB8ZW58MHx8fHwxNzA4MDIzODg4fDA&ixlib=rb-4.0.3&q=80&w=1080"
        },
        {
            icon: BookCopy,
            title: "Choix du Parcours",
            description: "Explorez un catalogue riche de formations conçues par des experts africains et commencez à apprendre à votre rythme.",
            image: "https://images.unsplash.com/photo-1521714161819-15534968fc5f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHw0fHxsaWJyYXJ5fGVufDB8fHx8MTcwODAyMzkzN3ww&ixlib=rb-4.0.3&q=80&w=1080"
        },
        {
            icon: Award,
            title: "Certification & Carrière",
            description: "Obtenez des certificats reconnus pour valider vos compétences et accédez à de nouvelles opportunités professionnelles.",
            image: "https://images.unsplash.com/photo-1571260899-6d6f5a3a4a7e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHwxfHxzdWNjZXNzfGVufDB8fHx8MTcwODAyMzk4NHww&ixlib=rb-4.0.3&q=80&w=1080"
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
                                "w-full text-left p-4 md:p-6 rounded-2xl border-2 transition-all duration-300",
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
            <Card className="dark:bg-slate-800/30 dark:border-slate-700/80">
                <CardContent className="p-6 md:p-10">
                    <div className="grid lg:grid-cols-2 gap-10 items-center">
                        <div className="text-center lg:text-left">
                            <div className="inline-block p-3 bg-primary/10 rounded-full mb-4">
                                <Wallet className="w-6 h-6 text-primary" />
                            </div>
                            <h2 className="text-2xl md:text-3xl font-bold text-white">Payez simplement, comme vous en avez l'habitude.</h2>
                            <p className="text-lg md:text-xl text-primary font-semibold mt-2">Aucune carte bancaire requise.</p>
                            <p className="text-slate-400 mt-4 max-w-md mx-auto lg:mx-0 text-sm">
                                Nous intégrons les solutions de paiement que vous utilisez tous les jours. L'inscription à un cours est rapide, facile et 100% sécurisée.
                            </p>
                        </div>
                        <div className="flex justify-center items-center gap-4 flex-wrap">
                            {paymentMethods.map(method => (
                                <div key={method.name} className="p-3 bg-slate-800/50 border border-slate-700/80 rounded-2xl grayscale hover:grayscale-0 transition-all duration-300 hover:scale-105 hover:shadow-lg">
                                    <Image 
                                        src={method.logoUrl}
                                        alt={method.name}
                                        width={100}
                                        height={50}
                                        className="object-contain h-10 w-auto"
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
            description: "Nous utilisons des partenaires de paiement conformes aux normes PCI-DSS pour garantir que vos informations sont toujours en sécurité."
        },
        {
            icon: Lock,
            title: "Données Protégées",
            description: "Toutes les communications sur notre plateforme sont chiffrées de bout en bout. Votre vie privée est notre priorité."
        },
        {
            icon: HelpingHand,
            title: "Support Réactif",
            description: "Besoin d'aide ? Notre équipe est disponible pour répondre à toutes vos questions concernant les paiements et votre compte."
        }
    ];

    return (
        <section className="py-16">
             <h2 className="text-2xl md:text-3xl font-bold text-center mb-4 text-foreground">Votre sérénité, notre priorité</h2>
             <p className="text-muted-foreground text-center max-w-2xl mx-auto mb-12">
                Nous intégrons les meilleures technologies pour garantir la sécurité et la traçabilité de chaque transaction sur la plateforme.
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
                            <p className="text-sm text-slate-400">{feature.description}</p>
                        </CardContent>
                    </Card>
                ))}
             </div>
        </section>
    );
};

const FinalCTA = ({ siteSettings }: { siteSettings: Partial<Settings['platform']> }) => (
    <section className="text-center py-20">
        <h2 className="text-2xl md:text-3xl font-bold text-white">Prêt à transformer votre avenir ?</h2>
        <p className="mt-2 text-slate-400">Rejoignez des milliers de talents qui construisent le futur de l'Afrique.</p>
        <Button size="lg" asChild className={cn("mt-8 h-12 text-base md:h-14 md:text-lg nd-cta-primary", siteSettings.allowInstructorSignup && "animate-pulse")} disabled={!siteSettings.allowInstructorSignup}>
            <Link href="/login?tab=register">
                {siteSettings.allowInstructorSignup ? 'Devenir Membre' : 'Inscriptions fermées'}
                {siteSettings.allowInstructorSignup && <ChevronsRight className="ml-2 h-5 w-5" />}
            </Link>
        </Button>
    </section>
);

const MobileCTA = ({ siteSettings }: { siteSettings: Partial<Settings['platform']> }) => (
    <div className="sm:hidden fixed bottom-0 left-0 right-0 p-3 bg-slate-900/80 backdrop-blur-sm border-t border-slate-700 z-40">
        <Button size="lg" className="w-full h-12 text-base nd-cta-primary" asChild disabled={!siteSettings.allowInstructorSignup}>
             <Link href="/login?tab=register">{siteSettings.allowInstructorSignup ? 'Démarrer' : 'Inscriptions fermées'}</Link>
        </Button>
    </div>
);

export default function LandingPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [instructorsMap, setInstructorsMap] = useState<Map<string, Partial<NdaraUser>>>(new Map());
  const [siteSettings, setSiteSettings] = useState<Partial<Settings['platform']>>({ allowInstructorSignup: true });
  const db = getFirestore();

  useEffect(() => {
    const fetchSettings = async () => {
        try {
            const settingsRef = doc(db, 'settings', 'global');
            const settingsSnap = await getDoc(settingsRef);
            if (settingsSnap.exists()) {
                setSiteSettings(settingsSnap.data().platform || { allowInstructorSignup: true });
            }
        } catch (error) {
            console.error("Failed to fetch site settings for landing page:", error);
        }
    }
    fetchSettings();
  }, [db]);

  useEffect(() => {
    const q = query(
      collection(db, "courses"),
      where("status", "==", "Published"),
      orderBy("createdAt", "desc"),
      limit(12)
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
                const userData = doc.data() as NdaraUser;
                newInstructors.set(userData.uid, {
                    uid: userData.uid,
                    fullName: userData.fullName,
                    profilePictureURL: userData.profilePictureURL,
                });
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
  
  const popularCourses = courses.filter(c => c.isPopular).slice(0, 8);
  const freeCourses = courses.filter(c => c.price === 0).slice(0, 8);
  const recentCourses = courses.slice(0,8);


  return (
    <div className="bg-background text-foreground min-h-screen font-sans">
      <LandingNav siteSettings={siteSettings} />
      <div className="container mx-auto px-4">
        
        <header className="text-center pt-32 pb-16 md:pt-40 md:pb-24">
          <Badge variant="outline" className="mb-4 border-primary/50 text-primary animate-fade-in-up">
            <Sparkles className="w-3 h-3 mr-2" />
            La plateforme N°1 pour les compétences du futur en Afrique
          </Badge>
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight !leading-tight animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
            L'Excellence Numérique Africaine
          </h1>
          <p className="text-muted-foreground text-base md:text-lg max-w-2xl mx-auto mt-6 mb-8 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            La plateforme qui transforme le savoir en réussite.
          </p>
          <div className="animate-fade-in-up hidden sm:block" style={{ animationDelay: '0.3s' }}>
              {siteSettings.allowInstructorSignup ? (
                  <Link href="/login?tab=register">
                      <button className="nd-cta-primary h-12 text-base md:h-auto md:text-sm">
                          Démarrer mon parcours
                      </button>
                  </Link>
              ) : (
                  <Button className="h-12 text-base md:h-auto md:text-sm" disabled>
                      Inscriptions fermées
                  </Button>
              )}
              <EnrollmentCounter />
          </div>
        </header>
          
        <main className="space-y-12 sm:space-y-16 pb-24 sm:pb-0">
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
            title="Populaires ce mois-ci"
            courses={popularCourses}
            instructorsMap={instructorsMap}
            isLoading={loading}
          />
          <CourseCarousel
            title="Découvrir gratuitement"
            courses={freeCourses}
            instructorsMap={instructorsMap}
            isLoading={loading}
          />
          <TrustSection />
          <FinalCTA siteSettings={siteSettings} />
        </main>
      </div>
      <Footer />
      <MobileCTA siteSettings={siteSettings} />
    </div>
  );
};
