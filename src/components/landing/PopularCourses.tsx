'use client';

/**
 * @fileOverview Section des formations populaires.
 * ✅ VITRINES : Contient les cours en dur demandés par Mathias.
 */

import { Star, ArrowRight } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const STATIC_COURSES = [
    {
        id: "static-drone-1",
        title: "Maîtriser les Drones pour l'Agriculture de Précision",
        category: "Agritech",
        rating: 4.8,
        students: "1,204",
        desc: "Apprenez à utiliser la technologie drone pour optimiser les rendements agricoles en Afrique.",
        instructor: "Amina D.",
        price: "25,000",
        img: "https://image.qwenlm.ai/public_source/9aa2c1ec-a270-4c0a-bf02-2f39a4c5daed/1c4383d95-2f7c-4bc0-be35-102e519ee21b.png"
    },
    {
        id: "static-trading-1",
        title: "Trading Avancé : Analyse Technique & Gestion de Risque",
        category: "Fintech",
        rating: 5.0,
        students: "850",
        desc: "Devenez un trader professionnel avec des stratégies adaptées aux marchés émergents.",
        instructor: "Kwame O.",
        price: "30,000",
        img: "https://image.qwenlm.ai/public_source/9aa2c1ec-a270-4c0a-bf02-2f39a4c5daed/187a46d8a-0e25-427f-80f3-55b03e305b12.png"
    },
    {
        id: "static-robot-1",
        title: "Introduction à la Robotique et l'Impression 3D",
        category: "Mecatech",
        rating: 4.2,
        students: "530",
        desc: "Concevez et imprimez vos propres pièces mécaniques. Idéal pour les ingénieurs débutants.",
        instructor: "David M.",
        price: "20,000",
        img: "https://image.qwenlm.ai/public_source/9aa2c1ec-a270-4c0a-bf02-2f39a4c5daed/11783ba2f-9d33-488c-8050-5321f88ba9ce.png"
    }
];

export function PopularCourses() {
    const locale = useLocale();

    return (
        <section id="courses" className="py-20 bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-end mb-12">
                    <div>
                        <h2 className="text-3xl font-heading font-bold text-ndara-dark mb-2">Formations Populaires</h2>
                        <p className="text-gray-600">Les cours les mieux notés par notre communauté.</p>
                    </div>
                    <Link href={`/${locale}/search`} className="hidden md:inline-flex items-center text-ndara-orange font-semibold hover:text-orange-700 transition">
                        Voir tout <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {STATIC_COURSES.map((course) => (
                        <div key={course.id} className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1.5 border border-gray-100 flex flex-col h-full group">
                            <div className="relative h-48 overflow-hidden">
                                <Image src={course.img} alt={course.title} fill className="object-cover group-hover:scale-110 transition-transform duration-500" />
                                <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-[10px] font-black text-ndara-dark uppercase tracking-widest">
                                    {course.category}
                                </div>
                            </div>
                            <div className="p-6 flex-1 flex flex-col">
                                <div className="flex items-center mb-2">
                                    <div className="flex text-yellow-400 text-xs">
                                        {[...Array(5)].map((_, i) => (
                                            <Star key={i} size={12} className={cn("fill-current", i >= Math.floor(course.rating) && "text-gray-200 fill-transparent")} />
                                        ))}
                                    </div>
                                    <span className="text-gray-500 text-xs ml-2 font-bold">({course.rating.toFixed(1)}) • {course.students} étudiants</span>
                                </div>
                                <h3 className="text-lg font-bold text-ndara-dark mb-2 line-clamp-2 uppercase tracking-tight leading-snug">{course.title}</h3>
                                <p className="text-gray-500 text-sm mb-4 line-clamp-2 leading-relaxed">{course.desc}</p>
                                
                                <div className="mt-auto flex items-center justify-between border-t pt-4 border-gray-100">
                                    <div className="flex items-center gap-2">
                                        <Avatar className="h-8 w-8 border border-gray-100">
                                            <AvatarFallback className="bg-orange-50 text-ndara-orange text-[10px] font-bold">{course.instructor.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <span className="text-sm font-medium text-gray-700">{course.instructor}</span>
                                    </div>
                                    <span className="text-lg font-black text-ndara-dark">{course.price} <span className="text-[10px]">FCFA</span></span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                
                <div className="mt-8 text-center md:hidden">
                    <Link href={`/${locale}/search`} className="inline-flex items-center text-ndara-orange font-semibold hover:text-orange-700 transition uppercase text-xs tracking-widest">
                        Voir tout le catalogue <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                </div>
            </div>
        </section>
    );
}

import { cn } from "@/lib/utils";
