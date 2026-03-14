'use client';

/**
 * @fileOverview La Bourse du Savoir - Marché Secondaire Ndara Afrique.
 * Permet d'acquérir des licences de revente pour devenir propriétaire de formations.
 */

import { useState, useEffect, useMemo } from 'react';
import { getFirestore, collection, query, where, onSnapshot } from 'firebase/firestore';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { StatCard } from '@/components/dashboard/StatCard';
import { TrendingUp, BadgeEuro, Landmark, Search, Filter, Info, ArrowUpRight, ShieldCheck } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ResaleCard } from '@/components/cards/ResaleCard';
import type { Course } from '@/lib/types';
import { cn } from '@/lib/utils';

export default function BourseSavoirPage() {
    const db = getFirestore();
    const [courses, setCourses] = useState<Course[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        setIsLoading(true);
        // On récupère uniquement les cours dont la licence est en vente
        const q = query(collection(db, 'courses'), where('resaleRightsAvailable', '==', true));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            setCourses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course)));
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [db]);

    const filteredCourses = useMemo(() => {
        return courses.filter(c => c.title.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [courses, searchTerm]);

    return (
        <div className="min-h-screen bg-[#0f172a] text-white selection:bg-primary/30 bg-grainy">
            <Navbar />
            
            <main className="pt-32 pb-24 container mx-auto px-6 space-y-12">
                
                {/* --- HEADER STRATÉGIQUE --- */}
                <header className="max-w-3xl space-y-6">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 animate-in fade-in slide-in-from-top-4 duration-1000">
                        <TrendingUp className="h-4 w-4 text-primary" />
                        <span className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">Marché des Actifs Numériques</span>
                    </div>
                    <h1 className="text-4xl md:text-6xl font-black text-white leading-tight uppercase tracking-tight">
                        La Bourse du <br/>
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-teal-400 font-serif italic normal-case">Savoir.</span>
                    </h1>
                    <p className="text-slate-400 text-lg md:text-xl font-medium italic max-w-xl leading-relaxed">
                        "Ne soyez plus seulement élève, devenez propriétaire. Acquérez les droits de revente et percevez les revenus à vie."
                    </p>
                </header>

                {/* --- MARKET STATS --- */}
                <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <StatCard title="Licences Disponibles" value={courses.length.toString()} icon={BadgeEuro} isLoading={isLoading} />
                    <StatCard title="Volume d'Échange" value="1.2M+" icon={Landmark} isLoading={false} />
                    <StatCard title="Rendement Moyen" value="+18%" icon={ArrowUpRight} isLoading={false} />
                </section>

                {/* --- SEARCH & FILTERS --- */}
                <div className="flex flex-col md:flex-row gap-4 sticky top-24 z-40">
                    <div className="relative flex-1 group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500 group-focus-within:text-primary transition-colors" />
                        <Input 
                            placeholder="Chercher un actif (Titre, Domaine...)" 
                            className="h-14 pl-12 bg-slate-900 border-white/5 rounded-2xl text-white shadow-2xl focus-visible:ring-primary/20"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <Button variant="outline" className="h-14 rounded-2xl border-white/5 bg-slate-900 font-black uppercase text-[10px] tracking-widest px-8 gap-2">
                        <Filter className="h-4 w-4" /> Filtres Avancés
                    </Button>
                </div>

                {/* --- MARKETPLACE GRID --- */}
                <div className="space-y-8">
                    <div className="flex items-center justify-between px-1">
                        <h2 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em]">Offres de Cession Actives</h2>
                        <span className="text-primary text-[10px] font-black uppercase">{filteredCourses.length} Actifs</span>
                    </div>

                    {isLoading ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                            {[...Array(3)].map((_, i) => (
                                <Skeleton key={i} className="h-96 w-full rounded-[3rem] bg-slate-900 border border-white/5" />
                            ))}
                        </div>
                    ) : filteredCourses.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 animate-in fade-in duration-1000">
                            {filteredCourses.map(course => (
                                <ResaleCard key={course.id} course={course} />
                            ))}
                        </div>
                    ) : (
                        <div className="py-32 text-center bg-slate-900/20 border-2 border-dashed border-white/5 rounded-[3rem] opacity-30 flex flex-col items-center">
                            <BadgeEuro className="h-16 w-16 mb-4 text-slate-600" />
                            <h3 className="text-xl font-black uppercase tracking-tight">Marché fermé</h3>
                            <p className="text-sm mt-2 font-medium">Aucune licence de revente n'est disponible pour le moment.</p>
                        </div>
                    )}
                </div>

                {/* --- FOOTER BANNER --- */}
                <section className="bg-primary/5 border border-primary/10 rounded-[3rem] p-10 flex flex-col md:flex-row items-center justify-between gap-8 shadow-2xl">
                    <div className="flex items-start gap-6">
                        <div className="p-4 bg-primary/10 rounded-2xl text-primary">
                            <ShieldCheck size={32} />
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-xl font-black uppercase tracking-tight">Garantie Ndara Secure</h3>
                            <p className="text-slate-400 text-sm max-w-md leading-relaxed">
                                Chaque transfert de propriété est audité par nos administrateurs. 
                                Les revenus sont automatiquement redirigés vers le nouveau propriétaire dès validation.
                            </p>
                        </div>
                    </div>
                    <Button variant="outline" className="h-14 rounded-xl border-slate-800 bg-slate-950 font-black uppercase text-[10px] tracking-widest px-10">
                        En savoir plus sur les droits
                    </Button>
                </section>
            </main>

            <Footer />
        </div>
    );
}
