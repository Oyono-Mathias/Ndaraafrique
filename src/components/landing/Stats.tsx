'use client';

/**
 * @fileOverview Section Statistiques Ndara Afrique - Design Fintech Elite.
 * ✅ STYLE : Glassmorphisme et cartes de crédit virtuelles épurées.
 */

import { Users, Globe, BookOpen, TrendingUp } from 'lucide-react';
import { cn } from "@/lib/utils";

export function Stats() {
    return (
        <section className="px-6 mb-16 max-w-4xl mx-auto">
            <div className="grid grid-cols-2 gap-4">
                {/* Stats Card 1 */}
                <div className="bg-white/5 backdrop-blur-xl rounded-[2rem] p-5 border border-white/5 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100 shadow-xl group hover:border-primary/20 transition-all">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-9 h-9 rounded-2xl bg-blue-500/20 flex items-center justify-center text-blue-400 shadow-inner">
                            <Users className="h-5 w-5" />
                        </div>
                        <span className="text-2xl font-black text-white tracking-tighter">50k+</span>
                    </div>
                    <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] ml-1">Ndara Inscrits</p>
                </div>

                {/* Stats Card 2 */}
                <div className="bg-white/5 backdrop-blur-xl rounded-[2rem] p-5 border border-white/5 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200 shadow-xl group hover:border-ndara-ochre/20 transition-all">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-9 h-9 rounded-2xl bg-ndara-ochre/20 flex items-center justify-center text-ndara-ochre shadow-inner">
                            <Globe className="h-5 w-5" />
                        </div>
                        <span className="text-2xl font-black text-white tracking-tighter">54</span>
                    </div>
                    <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] ml-1">Pays Couverts</p>
                </div>
            </div>

            {/* Stats Wide Card */}
            <div className="bg-white/5 backdrop-blur-xl rounded-[2.5rem] p-6 border border-white/5 mt-4 flex items-center justify-between animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300 shadow-xl group hover:border-primary/30 transition-all">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-[1.25rem] bg-primary/20 flex items-center justify-center text-primary shadow-inner">
                        <BookOpen className="h-6 w-6" />
                    </div>
                    <div>
                        <span className="block text-2xl font-black text-white tracking-tight leading-none">1,200+</span>
                        <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mt-1.5">Formations d'Excellence</p>
                    </div>
                </div>
                <div className="opacity-20 group-hover:opacity-40 transition-opacity">
                    <TrendingUp className="h-10 w-10 text-primary" strokeWidth={3} />
                </div>
            </div>
        </section>
    );
}
