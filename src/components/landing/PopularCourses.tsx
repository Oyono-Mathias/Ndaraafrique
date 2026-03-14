'use client';

/**
 * @fileOverview Catalogue de Prestige - Formations d'Élite statiques.
 * ✅ VITRINE : Les cours "Ndara Official" pour l'image de marque.
 */

import { Star, Users, ArrowRight } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { Button } from '@/components/ui/button';

const STATIC_COURSES = [
    {
        id: "static-trading-1",
        title: "Trading Forex & Crypto : De Débutant à Pro",
        category: "Trading",
        rating: 4.8,
        students: "8.4k",
        price: "30,000",
        img: "https://image.qwenlm.ai/public_source/9aa2c1ec-a270-4c0a-bf02-2f39a4c5daed/187a46d8a-0e25-427f-80f3-55b03e305b12.png"
    },
    {
        id: "static-drone-1",
        title: "Drones & Agriculture de Précision en Afrique",
        category: "AgriTech",
        rating: 4.9,
        students: "3.2k",
        price: "25,000",
        img: "https://image.qwenlm.ai/public_source/9aa2c1ec-a270-4c0a-bf02-2f39a4c5daed/1c4383d95-2f7c-4bc0-be35-102e519ee21b.png"
    }
];

export function PopularCourses() {
    const locale = useLocale();

    return (
        <section className="px-6 mb-20 max-w-4xl mx-auto space-y-8">
            <div className="flex items-center justify-between px-1">
                <h2 className="font-black text-2xl text-white uppercase tracking-tight">Le Savoir d'Élite</h2>
                <button className="text-primary text-[10px] font-black uppercase tracking-[0.2em] hover:text-white transition">
                    VOIR TOUT
                </button>
            </div>

            <div className="grid grid-cols-1 gap-8">
                {STATIC_COURSES.map((course) => (
                    <div key={course.id} className="bg-white/5 border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl group active:scale-[0.98] transition-all duration-500">
                        <div className="relative h-48 overflow-hidden">
                            <Image src={course.img} alt={course.title} fill className="object-cover group-hover:scale-110 transition-transform duration-700" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                            <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full text-[9px] font-black text-white border border-white/10 uppercase tracking-widest">
                                {course.category}
                            </div>
                        </div>
                        
                        <div className="p-6 space-y-6">
                            <h3 className="font-black text-lg text-white leading-tight uppercase tracking-tight line-clamp-2">
                                {course.title}
                            </h3>
                            
                            <div className="flex items-center gap-6">
                                <div className="flex items-center gap-1.5 text-yellow-500">
                                    <Star className="h-3.5 w-3.5 fill-current" />
                                    <span className="text-white text-xs font-black">{course.rating}</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-slate-500">
                                    <Users className="h-3.5 w-3.5" />
                                    <span className="text-xs font-bold uppercase">{course.students} Ndara</span>
                                </div>
                            </div>

                            <div className="pt-6 border-t border-white/5 flex items-center justify-between">
                                <div className="flex flex-col">
                                    <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Accès Permanent</span>
                                    <span className="text-primary font-black text-xl tracking-tighter">{course.price} <span className="text-[10px]">XOF</span></span>
                                </div>
                                <Link href={`/${locale}/search`}>
                                    <div className="w-12 h-12 rounded-full bg-white text-slate-950 flex items-center justify-center hover:bg-primary transition-colors shadow-xl group-hover:rotate-[-45deg] duration-500">
                                        <ArrowRight className="h-5 w-5" />
                                    </div>
                                </Link>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}
