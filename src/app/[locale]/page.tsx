
'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRole } from '@/context/RoleContext';
import { useRouter } from 'next/navigation';
import { Award, ShieldCheck, Wallet, ArrowRight, Lock, Users, Briefcase, Search, Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Footer } from '@/components/layout/footer';
import { Navbar } from '@/components/layout/navbar';
import { HowItWorks } from '@/components/landing/HowItWorks';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Stats } from '@/components/landing/Stats';
import { logTrackingEvent } from '@/actions/trackingActions';
import { DynamicCarousel } from '@/components/ui/DynamicCarousel';
import { Course, NdaraUser, Settings } from '@/lib/types';
import { getFirestore, collection, query, where, orderBy, getDocs, doc, getDoc, limit } from 'firebase/firestore';
import { CourseCarousel } from '@/components/landing/CourseCarousel';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { useDoc, useMemoFirebase } from '@/firebase';

// --- Re-integrated Components from LandingPageClient.tsx ---

const FeatureCard = ({ icon: Icon, title, description }: { icon: React.ElementType, title: string, description: string }) => (
  <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700/80 transition-all duration-300 hover:border-primary/50 hover:scale-[1.02]">
    <div className="inline-block p-3 bg-primary/10 rounded-lg mb-4">
      <Icon className="w-6 h-6 text-primary" />
    </div>
    <h3 className="text-lg font-bold text-white">{title}</h3>
    <p className="text-sm text-slate-400 mt-2">{description}</p>
  </div>
);

const TrustAndSecuritySection = ({ imageUrl }: { imageUrl: string }) => {
    return (
        <section className="py-24">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                <div className="relative h-80 lg:h-[450px] w-full">
                    {imageUrl && (
                        <Image
                            src={imageUrl}
                            alt="Image représentant la sécurité des paiements"
                            fill
                            className="object-cover rounded-2xl shadow-2xl"
                            data-ai-hint="digital security"
                        />
                    )}
                </div>
                <div className="space-y-6">
                    <div className="inline-block px-3 py-1 bg-primary/10 text-primary text-sm font-semibold rounded-full">
                        Sécurité des transactions
                    </div>
                    <h2 className="text-3xl md:text-4xl font-extrabold text-white">
                        Une plateforme de confiance pour votre investissement
                    </h2>
                    <p className="text-slate-400">
                        Chaque transaction est protégée par un chiffrement de pointe. En partenariat avec les leaders du paiement, nous garantissons la sécurité et la traçabilité de chaque franc investi dans votre avenir.
                    </p>
                    <ul className="space-y-4">
                        <li className="flex items-start gap-3">
                            <ShieldCheck className="w-5 h-5 text-primary flex-shrink-0 mt-1" />
                            <div>
                                <h4 className="font-semibold text-white">Chiffrement de bout-en-bout</h4>
                                <p className="text-sm text-slate-400">Vos informations de paiement sont sécurisées à chaque étape.</p>
                            </div>
                        </li>
                        <li className="flex items-start gap-3">
                            <Lock className="w-5 h-5 text-primary flex-shrink-0 mt-1" />
                            <div>
                                <h4 className="font-semibold text-white">Partenaires de paiement certifiés</h4>
                                <p className="text-sm text-slate-400">Nous ne travaillons qu'avec des passerelles de paiement reconnues pour leur fiabilité.</p>
                            </div>
                        </li>
                    </ul>
                </div>
            </div>
        </section>
    );
};

const MobileMoneySection = ({ onTrackClick }: { onTrackClick: (provider: string) => void }) => (
    <section className="py-24 text-center">
        <h2 className="text-3xl md:text-4xl font-extrabold text-white">
            Payez simplement. Sans carte bancaire.
        </h2>
        <p className="mt-4 text-slate-400 max-w-2xl mx-auto">
            Ndara Afrique est intégré avec les solutions de paiement que vous utilisez tous les jours. L'accès à vos formations est instantané.
        </p>
        <div className="mt-12 flex justify-center items-center gap-4 md:gap-8 flex-wrap">
            <div onClick={() => onTrackClick('MTN')}>
                <div className="flex items-center justify-center h-20 w-44 rounded-xl bg-mtn-yellow shadow-lg cursor-pointer">
                    <span className="font-black text-2xl text-black">MTN</span>
                </div>
            </div>
            <div onClick={() => onTrackClick('Orange')}>
                 <div className="flex items-center justify-center h-20 w-44 rounded-xl bg-orange-money shadow-lg cursor-pointer">
                    <span className="font-black text-2xl text-white">orange</span>
                </div>
            </div>
            <div onClick={() => onTrackClick('Wave')}>
                 <div className="flex items-center justify-center h-20 w-44 rounded-xl bg-wave-blue shadow-lg cursor-pointer">
                    <span className="font-black text-3xl text-white">wave</span>
                </div>
            </div>
        </div>
    </section>
);

const TestimonialsSection = () => {
    const testimonials = [
        {
            quote: "Grâce à Ndara Afrique, j'ai pu acquérir des compétences en développement web qui m'ont ouvert les portes d'une nouvelle carrière. Les cours sont pratiques et les instructeurs sont des experts dans leur domaine.",
            name: "Fatima Diallo",
            role: "Développeuse Full-Stack",
            avatar: "/placeholder-avatars/fatima.jpg"
        },
        {
            quote: "Les formations sur l'agriculture durable ont complètement transformé ma façon de travailler. J'ai optimisé mes rendements et je gère mon exploitation de manière plus rentable et écologique.",
            name: "Moussa Diop",
            role: "Technicien Agricole",
            avatar: "/placeholder-avatars/moussa.jpg"
        },
        {
            quote: "J'ai suivi un cours sur la gestion d'un petit élevage et la commercialisation des produits. Cela m'a donné les outils pour lancer ma propre activité et devenir indépendante. Une vraie révolution pour moi !",
            name: "Adja Sarr",
            role: "Éleveuse & Entrepreneure",
            avatar: "/placeholder-avatars/adja.jpg"
        }
    ];

    return (
        <section className="py-24">
            <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-extrabold text-white">
                    Ils nous font confiance
                </h2>
                <p className="mt-4 text-slate-400 max-w-2xl mx-auto">
                    Découvrez comment Ndara Afrique transforme les carrières et les ambitions à travers le continent.
                </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {testimonials.map((testimonial, index) => (
                    <Card key={index} className="bg-slate-800/50 border-slate-700/80 p-6 flex flex-col justify-between">
                        <CardContent className="p-0">
                            <blockquote className="text-slate-300 italic">"{testimonial.quote}"</blockquote>
                        </CardContent>
                        <footer className="mt-6 flex items-center gap-4">
                            <Avatar className="h-12 w-12 border-2 border-primary/50">
                                <AvatarImage src={testimonial.avatar} alt={testimonial.name} />
                                <AvatarFallback>{testimonial.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div>
                                <p className="font-bold text-white">{testimonial.name}</p>
                                <p className="text-sm text-primary">{testimonial.role}</p>
                            </div>
                        </footer>
                    </Card>
                ))}
            </div>
        </section>
    );
};

const InstructorCTASection = ({ onTrackClick }: { onTrackClick: () => void }) => {
    return (
        <section className="py-24 bg-slate-800/30 rounded-2xl my-24">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                 <div className="relative h-64 md:h-80 w-full px-8">
                    <Image
                        src="https://images.unsplash.com/photo-1543269865-cbf427effbad?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
                        alt="Un instructeur donnant un cours"
                        fill
                        className="object-cover rounded-xl shadow-lg"
                        data-ai-hint="instructor teaching"
                    />
                </div>
                <div className="px-8">
                    <h2 className="text-3xl font-extrabold text-white">Partagez votre savoir. Transformez des vies.</h2>
                    <p className="mt-4 text-slate-400">
                        Vous êtes un expert dans votre domaine ? Rejoignez notre communauté de formateurs et contribuez à l'éducation de la prochaine génération de leaders en Afrique.
                    </p>
                    <Button asChild size="lg" className="mt-6 h-12 text-base" onClick={onTrackClick}>
                        <Link href="/devenir-instructeur">Devenir Formateur</Link>
                    </Button>
                </div>
            </div>
        </section>
    );
};


const MobileCTA = ({ onClick }: { onClick: () => void }) => (
  <div className="fixed bottom-0 left-0 right-0 md:hidden bg-slate-900/80 backdrop-blur-sm p-3 border-t border-slate-700 z-40">
    <Button size="lg" asChild className="w-full h-14 text-base shadow-cta" onClick={onClick}>
      <Link href="/login?tab=register">
        Commencer maintenant
        <ArrowRight className="w-5 h-5 ml-2" />
      </Link>
    </Button>
  </div>
);

let sessionId = '';

function LandingPageContent() {
  const db = getFirestore();
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [instructorsMap, setInstructorsMap] = useState<Map<string, Partial<NdaraUser>>>(new Map());
  const [isLoading, setIsLoading] = useState(true);

  const settingsRef = useMemoFirebase(() => doc(db, 'settings', 'global'), [db]);
  const { data: settings } = useDoc<Settings>(settingsRef);
  const landingPageContent = settings?.content?.landingPage;

  useEffect(() => {
    sessionId = sessionStorage.getItem('ndara-session-id') || '';
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      sessionStorage.setItem('ndara-session-id', sessionId);
    }
    logTrackingEvent({ eventType: 'page_view', sessionId, pageUrl: '/' });
  }, []);
  
  useEffect(() => {
    const fetchCoursesAndInstructors = async () => {
        setIsLoading(true);
        try {
            const coursesQuery = query(collection(db, 'courses'), where('status', '==', 'Published'), orderBy('createdAt', 'desc'), limit(50));
            const querySnapshot = await getDocs(coursesQuery);
            const coursesData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course));
            setAllCourses(coursesData);

            const instructorIds = [...new Set(coursesData.map(c => c.instructorId))].filter(Boolean);
            if (instructorIds.length > 0) {
                 const instructorPromises = instructorIds.map(id => getDoc(doc(db, 'users', id)));
                 const instructorDocs = await Promise.all(instructorPromises);

                 const newInstructors = new Map<string, NdaraUser>();
                 instructorDocs.forEach(docSnap => {
                     if (docSnap.exists()) {
                         const instructorData = docSnap.data() as NdaraUser;
                         newInstructors.set(instructorData.uid, instructorData);
                     }
                 });
                 setInstructorsMap(newInstructors);
            }
        } catch (error) {
            console.error("Error fetching landing page data:", error);
        } finally {
            setIsLoading(false);
        }
    };
    fetchCoursesAndInstructors();
  }, [db]);

  const popularCourses = useMemo(() => allCourses.filter(c => c.isPopular).slice(0, 12), [allCourses]);
  const freeCourses = useMemo(() => allCourses.filter(c => c.price === 0).slice(0, 12), [allCourses]);

  const handleTrackedClick = (eventName: 'cta_click' | 'payment_method_click', metadata?: Record<string, any>) => {
    logTrackingEvent({
      eventType: eventName,
      sessionId,
      pageUrl: '/',
      metadata,
    });
  };

  const securityImageUrl = landingPageContent?.securitySection_imageUrl || PlaceHolderImages.find(img => img.id === 'payment-security')?.imageUrl || '';
  const finalCtaImageUrl = landingPageContent?.finalCta_imageUrl || PlaceHolderImages.find(img => img.id === 'final-cta-bg')?.imageUrl || '';

  return (
    <div className="bg-background text-foreground min-h-screen">
      <Navbar />

      <main className="container mx-auto px-4 pt-10 pb-24 md:pb-16 space-y-24">
        
        <section className="text-center pt-24 md:pt-32">
          <div className="container mx-auto px-4 max-w-4xl">
            <div className="opacity-0 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
              <h1 className="text-4xl md:text-6xl font-extrabold tracking-tighter text-white">
                L'excellence numérique pour l'Afrique
              </h1>
            </div>
            <div className="opacity-0 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
              <p className="text-base md:text-lg text-slate-400 mt-6 max-w-2xl mx-auto">
                Accédez à des compétences de pointe avec les moyens de paiement que vous utilisez déjà. Simple, instantané et sécurisé.
              </p>
            </div>
            <div className="opacity-0 animate-fade-in-up mt-10 flex flex-col sm:flex-row items-center justify-center gap-4" style={{ animationDelay: '0.6s' }}>
              <Button
                size="lg"
                asChild
                className="w-full sm:w-auto h-12 text-base shadow-cta group"
                onClick={() => handleTrackedClick('cta_click', { button: 'hero_start' })}
              >
                <Link href="/login?tab=register">
                  Commencer l’inscription
                  <ArrowRight className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
            </div>
            
            <div className="opacity-0 animate-fade-in-up mt-12" style={{ animationDelay: '0.8s' }}>
              <p className="text-xs text-slate-500 mb-4">Payez en toute confiance avec nos partenaires</p>
              <div className="flex justify-center items-center gap-6">
                <div className="flex items-center justify-center h-10 w-24 rounded-md bg-mtn-yellow shadow-md">
                  <span className="font-black text-lg text-black">MTN</span>
                </div>
                <div className="flex items-center justify-center h-10 w-24 rounded-md bg-orange-money shadow-md">
                  <span className="font-black text-lg text-white">orange</span>
                </div>
                <div className="flex items-center justify-center h-10 w-24 rounded-md bg-wave-blue shadow-md">
                  <span className="font-black text-xl text-white">wave</span>
                </div>
              </div>
            </div>
          </div>
        </section>
        
        <DynamicCarousel />
        
        <Stats />

        <section>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <FeatureCard
              icon={Wallet}
              title="Paiement Simplifié"
              description="Payez vos formations en toute sécurité avec les solutions Mobile Money que vous utilisez déjà."
            />
            <FeatureCard
              icon={ShieldCheck}
              title="Confiance & Sécurité"
              description="Vos transactions et vos données sont protégées par les meilleures technologies de chiffrement."
            />
            <FeatureCard
              icon={Award}
              title="Certification Reconnue"
              description="Obtenez des certificats à la fin de chaque formation pour valider vos nouvelles compétences auprès des employeurs."
            />
          </div>
        </section>
        
        <HowItWorks />

        <MobileMoneySection onTrackClick={(provider) => handleTrackedClick('payment_method_click', { provider })} />
        
        <TestimonialsSection />

        <TrustAndSecuritySection imageUrl={securityImageUrl} />

        <CourseCarousel 
            title="Formations populaires"
            courses={popularCourses}
            instructorsMap={instructorsMap}
            isLoading={isLoading}
        />

         <CourseCarousel 
            title="Commencez gratuitement"
            courses={freeCourses}
            instructorsMap={instructorsMap}
            isLoading={isLoading}
        />

        <InstructorCTASection onTrackClick={() => handleTrackedClick('cta_click', { button: 'instructor_cta' })} />

        <section className="relative py-24 my-24 text-center rounded-2xl overflow-hidden">
            <Image
                src={finalCtaImageUrl}
                alt="Étudiants africains apprenant ensemble"
                fill
                className="object-cover"
                data-ai-hint="students learning"
            />
            <div className="absolute inset-0 bg-slate-900/70"></div>
            <div className="relative z-10">
                <h2 className="text-3xl md:text-4xl font-extrabold text-white">
                    Prêt à transformer votre avenir ?
                </h2>
                <p className="mt-4 text-slate-300 max-w-xl mx-auto">
                    Rejoignez des milliers d'apprenants et de formateurs qui construisent l'Afrique de demain. L'inscription est gratuite.
                </p>
                <div className="mt-8 hidden md:flex justify-center">
                    <Button
                      size="lg"
                      asChild
                      className="h-14 text-lg shadow-cta"
                      onClick={() => handleTrackedClick('cta_click', { button: 'final_cta' })}
                    >
                        <Link href="/login?tab=register">
                            Créer mon compte gratuit
                            <ArrowRight className="w-5 h-5 ml-2" />
                        </Link>
                    </Button>
                </div>
            </div>
        </section>

      </main>
      
      <MobileCTA onClick={() => handleTrackedClick('cta_click', { button: 'mobile_sticky_cta' })} />

      <Footer />
    </div>
  );
}

// --- Main Page Component ---

export default function LandingPage() {
  const { user, isUserLoading, role } = useRole();
  const router = useRouter();

  useEffect(() => {
    if (!isUserLoading && user) {
      if (role === 'admin') {
        router.push('/admin');
      } else if (role === 'instructor') {
        router.push('/instructor/courses');
      } else {
        router.push('/student/dashboard');
      }
    }
  }, [isUserLoading, user, role, router]);

  if (isUserLoading || user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return <LandingPageContent />;
}
