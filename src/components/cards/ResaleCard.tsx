'use client';

/**
 * @fileOverview Carte d'actif financier pour la Bourse du Savoir.
 * Met en avant le prix de la licence et le potentiel de revenus.
 */

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Course } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Star, Users, ArrowUpRight, Landmark, ShieldCheck, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLocale } from 'next-intl';

export function ResaleCard({ course }: { course: Course }) {
    const locale = useLocale();
    const formattedPrice = (course.resaleRightsPrice || 0).toLocaleString('fr-FR');
    
    return (
        <div className="bg-slate-900 border border-white/10 rounded-[3rem] overflow-hidden shadow-2xl group active:scale-[0.98] transition-all duration-500 hover:border-primary/30 flex flex-col h-full relative">
            {/* Ambient Background Glow */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-all" />

            <div className="relative h-48 overflow-hidden shrink-0">
                <Image 
                    src={course.imageUrl || `https://picsum.photos/seed/${course.id}/600/400`} 
                    alt={course.title} 
                    fill 
                    className="object-cover group-hover:scale-110 transition-transform duration-700" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/20 to-transparent" />
                
                <div className="absolute top-4 left-4">
                    <Badge className="bg-black/60 backdrop-blur-md border border-white/10 text-white text-[8px] font-black uppercase px-2 py-1 rounded-lg">
                        {course.category}
                    </Badge>
                </div>

                <div className="absolute bottom-4 left-4 right-4 flex justify-between items-center">
                    <div className="flex items-center gap-1.5 text-yellow-500">
                        <Star className="h-3.5 w-3.5 fill-current" />
                        <span className="text-white text-xs font-black">{course.rating?.toFixed(1) || '4.8'}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-300 bg-black/40 backdrop-blur-md px-2 py-1 rounded-lg border border-white/5">
                        <Users className="h-3.5 w-3.5" />
                        <span className="text-[10px] font-black">{(course.participantsCount || 0).toLocaleString()} Ndara</span>
                    </div>
                </div>
            </div>

            <CardContent className="p-6 flex-1 flex flex-col space-y-6 relative z-10">
                <div className="space-y-2">
                    <h3 className="text-lg font-black text-white uppercase tracking-tight line-clamp-2 leading-tight min-h-[2.5rem]">
                        {course.title}
                    </h3>
                    <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5">
                        <Landmark size={12} className="text-primary" />
                        Propriété : {course.instructorId === 'NDARA_OFFICIAL' ? 'Ndara Officiel' : 'Expert Privé'}
                    </p>
                </div>

                {/* Investment Potential */}
                <div className="bg-slate-950/50 rounded-2xl p-4 border border-white/5 space-y-3 shadow-inner">
                    <div className="flex justify-between items-center">
                        <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Valeur Actuelle</span>
                        <div className="flex items-center gap-1 text-[#10b981]">
                            <TrendingUp size={10} />
                            <span className="text-[9px] font-black">+12.4%</span>
                        </div>
                    </div>
                    <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-black text-white">{formattedPrice}</span>
                        <span className="text-[10px] font-black text-slate-600 uppercase">XOF</span>
                    </div>
                </div>

                <div className="space-y-3 pt-2">
                    <div className="flex items-center gap-2 text-primary">
                        <ShieldCheck size={14} />
                        <span className="text-[9px] font-black uppercase tracking-widest">Transfert de Propriété Inclus</span>
                    </div>
                    <Button asChild className="w-full h-14 rounded-2xl bg-primary hover:bg-primary/90 text-slate-950 font-black uppercase text-[10px] tracking-widest shadow-xl shadow-primary/20 transition-all active:scale-95 group">
                        <Link href={`/${locale}/bourse/checkout/${course.id}`} className="flex items-center justify-center gap-2">
                            Acquérir la Licence
                            <ArrowUpRight className="h-4 w-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                        </Link>
                    </Button>
                </div>
            </CardContent>
        </div>
    );
}
