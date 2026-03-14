'use client';

/**
 * @fileOverview Section Statistiques Ndara Afrique - Design Fintech Elite.
 * Affiche l'ampleur du réseau en temps réel.
 */

import { Users, Globe, BookOpen, TrendingUp, Sparkles } from 'lucide-react';
import { cn } from "@/lib/utils";

export function Stats() {
    return (
        <section className="px-6 mb-20 max-w-6xl mx-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatBox 
                    icon={Users} 
                    value="50k+" 
                    label="Ndara Inscrits" 
                    color="text-blue-400" 
                    bgColor="bg-blue-500/10" 
                />
                <StatBox 
                    icon={BookOpen} 
                    value="1,200+" 
                    label="Formations" 
                    color="text-primary" 
                    bgColor="bg-primary/10" 
                />
                <StatBox 
                    icon={TrendingUp} 
                    value="98%" 
                    label="Taux de Réussite" 
                    color="text-emerald-400" 
                    bgColor="bg-emerald-500/10" 
                />
                <StatBox 
                    icon={Globe} 
                    value="54" 
                    label="Pays Visés" 
                    color="text-orange-400" 
                    bgColor="bg-orange-500/10" 
                />
            </div>
        </section>
    );
}

function StatBox({ icon: Icon, value, label, color, bgColor }: any) {
    return (
        <div className={cn(
            "bg-white/5 backdrop-blur-xl rounded-[2.5rem] p-6 border border-white/5 animate-in fade-in duration-700 shadow-xl group hover:border-primary/20 transition-all",
        )}>
            <div className="flex items-center gap-4 mb-4">
                <div className={cn("w-12 h-12 rounded-[1.25rem] flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform", bgColor, color)}>
                    <Icon className="h-6 w-6" />
                </div>
                <div className="flex flex-col">
                    <span className="text-3xl font-black text-white tracking-tighter leading-none">{value}</span>
                    <p className="text-slate-500 text-[9px] font-black uppercase tracking-[0.2em] mt-1.5">{label}</p>
                </div>
            </div>
            
            <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                <div className={cn("h-full rounded-full transition-all duration-1000 w-2/3 shadow-[0_0_10px_currentColor]", color.replace('text', 'bg'))} />
            </div>
        </div>
    );
}
