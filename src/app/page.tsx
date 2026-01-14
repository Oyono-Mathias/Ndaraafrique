
'use client';

import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, getFirestore, where, orderBy, limit, getDocs, getCountFromServer } from 'firebase/firestore';
import Link from 'next/link';
import type { Course } from '@/lib/types';
import type { FormaAfriqueUser } from '@/context/RoleContext';
import { Footer } from '@/components/layout/footer';
import Image from 'next/image';
import { Frown, Sparkles, UserPlus, BookCopy, Award, ShieldCheck, Lock, HelpingHand, Wallet, ChevronsRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Carousel, CarouselContent, CarouselItem } from '@/components/ui/carousel';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { CourseCard } from '@/components/cards/CourseCard';

const CourseCarousel = ({ title, courses, instructorsMap, isLoading }: { title: string, courses: Course[], instructorsMap: Map<string, Partial<FormaAfriqueUser>>, isLoading: boolean }) => {
    if (isLoading && courses.length === 0) {
        return (
            <div className="w-full">
                <Skeleton className="h-8 w-1/3 mb-8 bg-slate-800" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <Skeleton className="h-80 rounded-xl bg-slate-800"></Skeleton>
                    <Skeleton className="h-80 rounded-xl bg-slate-800"></Skeleton>
                    <Skeleton className="h-80 rounded-xl bg-slate-800"></Skeleton>
                </div>
            </div>
        );
    }
    if (!courses || courses.length === 0) {
        return null;
    }
    return (
        <section className="py-12">
            <h2 className="text-3xl font-bold mb-8 text-foreground">{title}</h2>
             <Carousel opts={{ align: "start", loop: false }} className="w-full">
                <CarouselContent className="-ml-6">
                    {courses.map(course => (
                        <CarouselItem key={course.id} className="pl-6 basis-[85%] sm:basis-1/2 md:basis-1/3 lg:basis-1/4">
                            <CourseCard course={course} instructor={instructorsMap.get(course.instructorId) || null} variant="catalogue" />
                        </CarouselItem>
                    ))}
                </CarouselContent>
            </Carousel>
        </section>
    );
};

const LandingNav = () => {
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
            <div className="container mx-auto px-6 flex justify-between items-center">
                <Link href="/" className="flex items-center gap-3 group transition-transform hover:scale-105">
                    <Image src="/icon.svg" alt="Ndara Afrique Logo" width={32} height={32} />
                    <span className="text-2xl font-bold tracking-tighter text-white">Ndara Afrique</span>
                </Link>
                <div className="flex items-center gap-4">
                    <Link href="/search" className="text-sm font-medium text-slate-300 hover:text-white transition-colors hidden sm:block">
                        Explorer les cours
                    </Link>
                    <Link href="/login">
                        <Button variant="outline" className="nd-cta-secondary bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white">
                            Se connecter
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
                // In case of error, we can just hide the counter
                setCount(0);
            }
        };
        fetchCount();
    }, [db]);

    if (count === null || count < 10) return null; // Don't show if loading or count is low

    return (
        <p className="text-sm text-slate-400 mt-4">
            Rejoignez nos <span className="font-bold text-primary">{count.toLocaleString('fr-FR')}</span> participants et commencez votre parcours.
        </p>
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
        <section className="py-20">
             <h2 className="text-3xl font-bold text-center mb-4 text-foreground">Comment ça marche ?</h2>
             <p className="text-muted-foreground text-center max-w-2xl mx-auto mb-12">Un parcours simple en 3 étapes pour transformer votre carrière.</p>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                 <div className="space-y-4">
                    {steps.map((step, index) => {
                        const isActive = activeStep === index;
                        return (
                            <button key={index} onClick={() => setActiveStep(index)} className={cn(
                                "w-full text-left p-6 rounded-2xl border-2 transition-all duration-300",
                                isActive 
                                    ? "bg-primary/10 border-primary shadow-2xl shadow-primary/10" 
                                    : "bg-slate-800/40 border-slate-700/80 hover:bg-slate-700/50"
                            )}>
                                <div className="flex items-center gap-4">
                                    <div className={cn("p-3 rounded-full", isActive ? "bg-primary" : "bg-slate-700")}>
                                        <step.icon className={cn("w-6 h-6", isActive ? "text-primary-foreground" : "text-primary")} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg text-white">{step.title}</h3>
                                        {isActive && <p className="text-sm text-slate-300 mt-1 animate-fade-in-up">{step.description}</p>}
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>

                <div className="relative aspect-square rounded-3xl overflow-hidden shadow-2xl shadow-slate-900/50">
                    {steps.map((step, index) => (
                        <Image
                            key={index}
                            src={step.image}
                            alt={step.title}
                            fill
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
        <section className="py-20">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
                <div className="text-center lg:text-left">
                    <div className="inline-block p-4 bg-primary/10 rounded-full mb-4">
                        <Wallet className="w-8 h-8 text-primary" />
                    </div>
                    <h2 className="text-3xl font-bold text-white">Payez simplement, comme vous en avez l'habitude.</h2>
                    <p className="text-xl text-primary font-semibold mt-2">Aucune carte bancaire requise.</p>
                    <p className="text-slate-400 mt-4 max-w-md mx-auto lg:mx-0">
                        Nous intégrons les solutions de paiement que vous utilisez tous les jours. L'inscription à un cours est rapide, facile et 100% sécurisée.
                    </p>
                </div>
                <div className="flex justify-center items-center gap-6 flex-wrap">
                    {paymentMethods.map(method => (
                        <div key={method.name} className="p-4 bg-slate-800/50 border border-slate-700/80 rounded-2xl grayscale hover:grayscale-0 transition-all duration-300 hover:scale-105 hover:shadow-lg">
                             <Image 
                                src={method.logoUrl}
                                alt={method.name}
                                width={120}
                                height={60}
                                className="object-contain h-12 w-auto"
                            />
                        </div>
                    ))}
                </div>
            </div>
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
        <section className="py-20">
             <h2 className="text-3xl font-bold text-center mb-4 text-foreground">Votre sérénité, notre priorité</h2>
             <p className="text-muted-foreground text-center max-w-3xl mx-auto mb-12">
                Nous intégrons les meilleures technologies pour garantir la sécurité et la traçabilité de chaque transaction sur la plateforme.
             </p>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {trustFeatures.map((feature, index) => (
                    <div key={index} className="p-8 rounded-2xl bg-slate-900/50 border border-slate-800/80 text-center transition-all duration-300 hover:-translate-y-2 hover:border-primary/50">
                        <div className="inline-block p-4 bg-primary/10 rounded-full mb-4">
                            <feature.icon className="w-8 h-8 text-primary" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">{feature.title}</h3>
                        <p className="text-sm text-slate-400">{feature.description}</p>
                    </div>
                ))}
             </div>
        </section>
    );
}

export default function LandingPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [instructorsMap, setInstructorsMap] = useState<Map<string, Partial<FormaAfriqueUser>>>(new Map());

  const db = getFirestore();

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
            const newInstructors = new Map<string, Partial<FormaAfriqueUser>>();
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
  
  const popularCourses = courses.filter(c => c.isPopular).slice(0, 4);
  const freeCourses = courses.filter(c => c.price === 0).slice(0, 4);
  const recentCourses = courses.slice(0,4);


  return (
    <div className="bg-background text-foreground min-h-screen font-sans">
      <LandingNav />
      <div className="container mx-auto px-6">
        
        <header className="text-center pt-40 pb-24 md:pt-48 md:pb-32">
          <Badge variant="outline" className="mb-4 border-primary/50 text-primary animate-fade-in-up">
            <Sparkles className="w-3 h-3 mr-2" />
            La plateforme N°1 pour les compétences du futur en Afrique
          </Badge>
          <h1 className="nd-hero animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
            Apprenez. Construisez. Prospérez.
          </h1>
          <p className="text-muted-foreground text-lg md:text-xl max-w-2xl mx-auto mt-6 mb-10 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            Des formations de pointe conçues par des experts africains, pour les talents africains. Passez au niveau supérieur.
          </p>
          <div className="animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
              <Link href="/login?tab=register">
                  <button className="nd-cta-primary">
                      Démarrer mon parcours
                  </button>
              </Link>
              <EnrollmentCounter />
          </div>
        </header>
          
        <main className="space-y-16">
          <InteractiveSteps />

          <PaymentMethodsSection />
          
          <CourseCarousel
            title="Les nouveautés"
            courses={recentCourses}
            instructorsMap={instructorsMap}
            isLoading={loading}
          />
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

            <section className="text-center py-20">
                 <h2 className="text-3xl font-bold text-white">Prêt à transformer votre avenir ?</h2>
                 <p className="mt-2 text-slate-400">Rejoignez des milliers de talents qui construisent le futur de l'Afrique.</p>
                 <Button size="lg" asChild className="mt-8 h-14 text-lg nd-cta-primary animate-pulse">
                     <Link href="/login?tab=register">
                        Devenir Membre
                        <ChevronsRight className="ml-2 h-5 w-5" />
                     </Link>
                 </Button>
            </section>
        </main>
      </div>
      <Footer />
    </div>
  );
};
