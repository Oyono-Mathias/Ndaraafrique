
'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useRole } from '@/context/RoleContext';
import { useRouter } from 'next-intl/navigation';
import { ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Footer } from '@/components/layout/footer';
import { Navbar } from '@/components/layout/navbar';
import { HowItWorks } from '@/components/landing/HowItWorks';
import { Course, NdaraUser, Settings } from '@/lib/types';
import { collection, getDocs, getFirestore, query, where, doc } from 'firebase/firestore';
import { CourseCarousel } from '@/components/landing/CourseCarousel';
import { TrustAndSecuritySection } from '@/components/landing/TrustAndSecuritySection';
import { MobileMoneySection } from '@/components/landing/MobileMoneySection';
import { TestimonialsSection } from '@/components/landing/TestimonialsSection';
import { InstructorCTASection } from '@/components/landing/InstructorCTASection';
import { Stats } from '@/components/landing/Stats';
import { logTrackingEvent } from '@/actions/trackingActions';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { useDoc, useMemoFirebase } from '@/firebase';

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
            const coursesQuery = query(collection(db, 'courses'), where('status', '==', 'Published'));
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

  const handleTrackedClick = (eventName: 'cta_click' | 'payment_method_click', metadata?: Record<string, any>) => {
    logTrackingEvent({
      eventType: eventName,
      sessionId,
      pageUrl: '/',
      metadata,
    });
  };

  const popularCourses = useMemo(() => allCourses.filter(c => c.isPopular).slice(0, 12), [allCourses]);
  const freeCourses = useMemo(() => allCourses.filter(c => c.price === 0).slice(0, 12), [allCourses]);

  const finalCtaImageUrl = landingPageContent?.finalCta_imageUrl || PlaceHolderImages.find(img => img.id === 'final-cta-bg')?.imageUrl || '';

  return (
    <div className="bg-slate-950 text-white min-h-screen">
      <Navbar />
      <main className="container mx-auto px-4 pt-10 pb-24 md:pb-16 space-y-24">
        
        {/* 1. Hero Section */}
        <section className="text-center pt-24 md:pt-32">
          <div className="container mx-auto px-4 max-w-4xl">
            <div className="opacity-0 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
              <h1 className="text-4xl md:text-6xl font-extrabold tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-white via-slate-200 to-slate-400">
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

        {/* 2. Stats (Social Proof) */}
        <Stats />
        
        {/* 3. How It Works (Reduces Friction) */}
        <HowItWorks />

        {/* 4. Trust & Security (Builds Confidence) */}
        <TrustAndSecuritySection />

        {/* 5. Mobile Money (Addresses Payment Concerns) */}
        <MobileMoneySection onTrackClick={(provider) => handleTrackedClick('payment_method_click', { provider })} />
        
        {/* 6. Popular Courses (Shows Value) */}
        <CourseCarousel 
            title="Formations populaires"
            courses={popularCourses}
            instructorsMap={instructorsMap}
            isLoading={isLoading}
        />

        {/* 7. Free Courses (Lowers Barrier to Entry) */}
         <CourseCarousel 
            title="Commencez gratuitement"
            courses={freeCourses}
            instructorsMap={instructorsMap}
            isLoading={isLoading}
        />

        {/* 8. Testimonials (Human-centric Social Proof) */}
        <TestimonialsSection />

        {/* 9. Instructor CTA (Secondary Conversion Goal) */}
        <InstructorCTASection onTrackClick={() => handleTrackedClick('cta_click', { button: 'instructor_cta' })} />
        
        {/* 10. Final CTA */}
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
                <div className="mt-8">
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

      <Footer />
    </div>
  );
}

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
