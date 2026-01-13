
'use client';

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useCollection, useMemoFirebase } from '@/firebase';
import { getFirestore, collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import type { Course, FormaAfriqueUser } from '@/lib/types';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Frown, ArrowRight } from 'lucide-react';
import { LanguageSelector } from '@/components/layout/language-selector';
import Image from 'next/image';
import { Skeleton } from '@/components/ui/skeleton';

const CourseCard = ({ course }: { course: Course }) => {
    return (
        <Link href={`/course/${course.id}`} className="block group">
            <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:border-blue-500/50 transition-all">
                <div className="relative h-48 bg-gradient-to-br from-blue-900/40 to-black flex items-center justify-center overflow-hidden">
                    <Image
                        src={course.imageUrl || `https://picsum.photos/seed/${course.id}/400/225`}
                        alt={course.title}
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                </div>
                <div className="p-6">
                    <span className="bg-blue-600/20 text-blue-400 text-xs font-bold px-3 py-1 rounded-full uppercase">
                        {course.price > 0 ? 'Payant' : 'Gratuit'}
                    </span>
                    <h3 className="text-xl font-semibold mt-3 mb-2 group-hover:text-blue-400 transition">{course.title}</h3>
                    <p className="text-gray-400 text-sm mb-4 line-clamp-2">{course.description}</p>
                    <Button variant="outline" className="w-full bg-white/10 hover:bg-blue-600 border-white/20 hover:border-blue-600 rounded-xl font-medium transition-colors">
                        Consulter le cours <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                </div>
            </div>
        </Link>
    );
};

const LandingPage = () => {
    const { t } = useTranslation();
    const [activeStep, setActiveStep] = useState(1);
    const db = getFirestore();
    
    const coursesQuery = useMemoFirebase(() =>
        query(collection(db, 'courses'), where('status', '==', 'Published'), orderBy('createdAt', 'desc'), where('isPopular', '==', true))
    , [db]);
    const { data: courses, isLoading } = useCollection<Course>(coursesQuery);

    const steps = [
        { id: 1, title: "Étape 1", desc: "Créez votre compte en quelques secondes." },
        { id: 2, title: "Étape 2", desc: "Choisissez votre parcours de formation." },
        { id: 3, title: "Étape 3", desc: "Commencez à apprendre et obtenez votre certificat." }
    ];

    return (
        <div className="bg-[#020617] text-white min-h-screen font-sans">
            <nav className="flex justify-between items-center p-6 backdrop-blur-md border-b border-white/10 sticky top-0 z-50">
                <Link href="/" className="text-2xl font-bold tracking-tighter">Ndara Afrique</Link>
                <div className="flex items-center gap-4">
                    <LanguageSelector />
                    <Button variant="outline" size="sm" asChild className="border-white/20 hover:bg-white/10">
                        <Link href="/login">Se connecter</Link>
                    </Button>
                </div>
            </nav>

            <main className="max-w-6xl mx-auto px-6 pt-20 pb-10 text-center hero-text">
                <h1 className="text-5xl md:text-7xl font-extrabold mb-6 leading-tight">
                    L'excellence numérique <br />
                    <span className="text-blue-500">pour l'Afrique</span>
                </h1>
                <p className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto mb-10">
                    La première plateforme d'apprentissage panafricaine pour les métiers de demain.
                </p>
                <Button size="lg" asChild className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-bold shadow-lg shadow-blue-500/20 transition-all transform hover:scale-105 h-14 text-base">
                    <Link href="/register">Commencer l'inscription</Link>
                </Button>
            </main>

            <section className="py-16 px-6 max-w-4xl mx-auto">
                <div className="flex justify-center gap-4 mb-8">
                    {steps.map((step) => (
                        <button
                            key={step.id}
                            onClick={() => setActiveStep(step.id)}
                            className={`px-6 py-3 rounded-xl border-2 transition-all duration-300 ${activeStep === step.id ? "border-blue-500 bg-blue-500/20 shadow-[0_0_20px_rgba(59,130,246,0.5)]" : "border-white/10 bg-white/5 hover:border-white/30"}`}
                        >
                            {step.title}
                        </button>
                    ))}
                </div>
                <div className="bg-white/5 border border-white/10 p-8 rounded-3xl backdrop-blur-xl text-center">
                    <h3 className="text-2xl font-bold text-blue-400 mb-4">{steps[activeStep - 1].title}</h3>
                    <p className="text-gray-300 text-lg">{steps[activeStep - 1].desc}</p>
                </div>
            </section>

            <section className="py-20 max-w-6xl mx-auto px-6">
                <div className="flex justify-between items-end mb-10">
                    <div>
                        <h2 className="text-3xl font-bold mb-2">Nos cours populaires</h2>
                        <p className="text-gray-400">Découvrez nos formations les plus prisées.</p>
                    </div>
                     <Link href="/search" className="text-blue-400 hover:text-blue-300 font-medium transition whitespace-nowrap">
                        Voir tout →
                    </Link>
                </div>

                {isLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {[1, 2, 3].map(i => <Skeleton key={i} className="h-96 rounded-2xl bg-white/5" />)}
                    </div>
                ) : courses && courses.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {courses.map((course) => <CourseCard key={course.id} course={course} />)}
                    </div>
                ) : (
                    <div className="text-center py-16 border-2 border-dashed border-white/10 rounded-2xl">
                        <Frown className="mx-auto h-12 w-12 text-gray-500" />
                        <h3 className="mt-4 text-lg font-semibold">Nos formations arrivent bientôt.</h3>
                        <p className="text-gray-400">Revenez un peu plus tard pour découvrir notre catalogue.</p>
                    </div>
                )}
            </section>
        </div>
    );
};

export default LandingPage;
