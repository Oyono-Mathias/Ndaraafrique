'use client';

/**
 * @fileOverview Catalogue public des formations Ndara Afrique.
 * ✅ RECHERCHE : Par mot-clé.
 * ✅ FILTRES : Catégorie, Prix, Note.
 * ✅ TRI : Popularité, Nouveauté, Note.
 */

import { useState, useEffect, useMemo } from 'react';
import { getFirestore, collection, query, where, onSnapshot, getDocs } from 'firebase/firestore';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
    Search, 
    SlidersHorizontal, 
    Star, 
    BookOpen, 
    TrendingUp, 
    Clock, 
    Filter,
    X,
    LayoutGrid,
    List
} from 'lucide-react';
import { CourseCard } from '@/components/cards/CourseCard';
import type { Course, NdaraUser } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';

const CATEGORIES = [
    "AgriTech", 
    "FinTech", 
    "Énergies Renouvelables", 
    "Développement Web", 
    "Entrepreneuriat", 
    "Marketing Digital",
    "Soft Skills"
];

export default function CoursesCatalogPage() {
    const db = getFirestore();
    const [courses, setCourses] = useState<Course[]>([]);
    const [instructorsMap, setInstructorsMap] = useState<Map<string, Partial<NdaraUser>>>(new Map());
    const [isLoading, setIsLoading] = useState(true);

    // États des filtres
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [priceFilter, setPriceFilter] = useState<'all' | 'free' | 'paid'>('all');
    const [minRating, setMinRating] = useState<number>(0);
    const [sortBy, setSortBy] = useState<'newest' | 'popular' | 'rating'>('popular');
    const [showFilters, setShowFilters] = useState(false);

    useEffect(() => {
        setIsLoading(true);
        const q = query(collection(db, "courses"), where("status", "==", "Published"));

        const unsubscribe = onSnapshot(q, async (snapshot) => {
            const coursesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course));
            setCourses(coursesData);
            
            if (coursesData.length > 0) {
                const instructorIds = [...new Set(coursesData.map(c => c.instructorId))];
                const instructorsRef = collection(db, 'users');
                const newMap = new Map();
                // Fetch par lots de 30 pour Firestore
                for (let i = 0; i < instructorIds.length; i += 30) {
                    const chunk = instructorIds.slice(i, i + 30);
                    const qInst = query(instructorsRef, where('uid', 'in', chunk));
                    const snap = await getDocs(qInst);
                    snap.forEach(d => newMap.set(d.id, d.data()));
                }
                setInstructorsMap(newMap);
            }
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, [db]);

    const filteredAndSortedCourses = useMemo(() => {
        let results = [...courses];

        // 1. Filtrage par recherche
        if (searchTerm.trim()) {
            const s = searchTerm.toLowerCase();
            results = results.filter(c => 
                c.title.toLowerCase().includes(s) || 
                c.description.toLowerCase().includes(s)
            );
        }

        // 2. Filtrage par catégorie
        if (selectedCategory !== 'all') {
            results = results.filter(c => c.category === selectedCategory);
        }

        // 3. Filtrage par prix
        if (priceFilter === 'free') {
            results = results.filter(c => c.price === 0);
        } else if (priceFilter === 'paid') {
            results = results.filter(c => c.price > 0);
        }

        // 4. Filtrage par note
        if (minRating > 0) {
            results = results.filter(c => (c.rating || 0) >= minRating);
        }

        // 5. Tri
        results.sort((a, b) => {
            if (sortBy === 'newest') {
                const dateA = (a.createdAt as any)?.toDate?.() || new Date(0);
                const dateB = (b.createdAt as any)?.toDate?.() || new Date(0);
                return dateB.getTime() - dateA.getTime();
            }
            if (sortBy === 'popular') {
                return (b.participantsCount || 0) - (a.participantsCount || 0);
            }
            if (sortBy === 'rating') {
                return (b.rating || 0) - (a.rating || 0);
            }
            return 0;
        });

        return results;
    }, [courses, searchTerm, selectedCategory, priceFilter, minRating, sortBy]);

    const resetFilters = () => {
        setSearchTerm('');
        setSelectedCategory('all');
        setPriceFilter('all');
        setMinRating(0);
        setSortBy('popular');
    };

    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col">
            <Navbar />
            
            <main className="flex-grow pt-24 pb-20 container mx-auto px-4">
                <header className="mb-12 space-y-6">
                    <div className="max-w-2xl">
                        <h1 className="text-4xl font-black text-white uppercase tracking-tight">
                            Explorez le <span className="text-primary">Savoir</span>
                        </h1>
                        <p className="text-slate-400 mt-2 font-medium italic">
                            Découvrez des formations conçues par des experts pour propulser votre carrière.
                        </p>
                    </div>

                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
                            <Input 
                                placeholder="Que voulez-vous apprendre aujourd'hui ?" 
                                className="h-14 pl-12 bg-slate-900 border-slate-800 rounded-2xl text-white shadow-xl focus-visible:ring-primary/30"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <Button 
                            variant="outline" 
                            onClick={() => setShowFilters(!showFilters)}
                            className={cn(
                                "h-14 rounded-2xl border-slate-800 bg-slate-900 gap-2 px-6 font-bold uppercase text-[10px] tracking-widest transition-all",
                                showFilters ? "border-primary text-primary" : "text-slate-400"
                            )}
                        >
                            <SlidersHorizontal className="h-4 w-4" />
                            {showFilters ? "Cacher Filtres" : "Filtres"}
                        </Button>
                        <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                            <SelectTrigger className="h-14 w-full md:w-56 bg-slate-900 border-slate-800 rounded-2xl font-bold text-xs uppercase tracking-widest text-slate-300">
                                <div className="flex items-center gap-2">
                                    <TrendingUp className="h-4 w-4 text-primary" />
                                    <SelectValue placeholder="Trier par" />
                                </div>
                            </SelectTrigger>
                            <SelectContent className="bg-slate-900 border-slate-800 text-white">
                                <SelectItem value="popular" className="font-bold py-3 uppercase text-[10px]">Plus populaires</SelectItem>
                                <SelectItem value="newest" className="font-bold py-3 uppercase text-[10px]">Nouveautés</SelectItem>
                                <SelectItem value="rating" className="font-bold py-3 uppercase text-[10px]">Mieux notés</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Panneau de Filtres */}
                    {showFilters && (
                        <div className="p-8 bg-slate-900/50 border border-slate-800 rounded-[2.5rem] grid grid-cols-1 md:grid-cols-3 gap-8 animate-in slide-in-from-top-4 duration-500">
                            <div className="space-y-4">
                                <Label text="Catégorie" />
                                <div className="flex flex-wrap gap-2">
                                    <Badge 
                                        onClick={() => setSelectedCategory('all')}
                                        className={cn(
                                            "cursor-pointer px-4 py-2 rounded-xl font-bold uppercase text-[9px] transition-all",
                                            selectedCategory === 'all' ? "bg-primary text-white" : "bg-slate-800 text-slate-500"
                                        )}
                                    >Tous</Badge>
                                    {CATEGORIES.map(cat => (
                                        <Badge 
                                            key={cat}
                                            onClick={() => setSelectedCategory(cat)}
                                            className={cn(
                                                "cursor-pointer px-4 py-2 rounded-xl font-bold uppercase text-[9px] transition-all",
                                                selectedCategory === cat ? "bg-primary text-white" : "bg-slate-800 text-slate-500 hover:text-white"
                                            )}
                                        >{cat}</Badge>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <Label text="Prix & Accessibilité" />
                                <div className="grid grid-cols-3 gap-2">
                                    {(['all', 'free', 'paid'] as const).map(p => (
                                        <Button 
                                            key={p}
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setPriceFilter(p)}
                                            className={cn(
                                                "rounded-xl border-slate-800 text-[9px] font-black uppercase tracking-widest",
                                                priceFilter === p ? "bg-primary text-white border-primary" : "bg-slate-900 text-slate-500"
                                            )}
                                        >
                                            {p === 'all' ? 'Tous' : p === 'free' ? 'Offerts' : 'Payants'}
                                        </Button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <Label text="Note minimale" />
                                <div className="flex items-center gap-2">
                                    {[0, 3, 4, 4.5].map(rating => (
                                        <Button 
                                            key={rating}
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setMinRating(rating)}
                                            className={cn(
                                                "rounded-xl border-slate-800 text-[9px] font-black uppercase tracking-widest gap-1",
                                                minRating === rating ? "bg-amber-500 text-black border-amber-500" : "bg-slate-900 text-slate-500"
                                            )}
                                        >
                                            {rating > 0 ? <><Star className="h-3 w-3 fill-current" /> {rating}+</> : 'Toutes'}
                                        </Button>
                                    ))}
                                </div>
                                <div className="pt-4">
                                    <Button variant="ghost" onClick={resetFilters} className="text-red-400 hover:text-red-500 hover:bg-red-500/10 font-bold uppercase text-[9px] tracking-widest p-0">
                                        <X className="h-3 w-3 mr-1" /> Réinitialiser les filtres
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </header>

                {/* Grille de résultats */}
                <div className="space-y-8">
                    <div className="flex items-center justify-between px-1">
                        <h2 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em] flex items-center gap-2">
                            <BookOpen className="h-4 w-4 text-primary" />
                            {filteredAndSortedCourses.length} Formations trouvées
                        </h2>
                    </div>

                    {isLoading ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            {[...Array(8)].map((_, i) => (
                                <div key={i} className="space-y-4">
                                    <Skeleton className="aspect-video w-full rounded-2xl bg-slate-900" />
                                    <Skeleton className="h-4 w-3/4 bg-slate-900" />
                                    <Skeleton className="h-4 w-1/2 bg-slate-900" />
                                </div>
                            ))}
                        </div>
                    ) : filteredAndSortedCourses.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-10 animate-in fade-in duration-700">
                            {filteredAndSortedCourses.map(course => (
                                <CourseCard 
                                    key={course.id} 
                                    course={course} 
                                    instructor={instructorsMap.get(course.instructorId) || null}
                                    variant="grid" 
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="py-32 text-center bg-slate-900/20 border-2 border-dashed border-slate-800 rounded-[3rem] opacity-30 flex flex-col items-center">
                            <Search className="h-16 w-16 mb-4 text-slate-600" />
                            <h3 className="text-xl font-black uppercase tracking-tight">Aucun résultat</h3>
                            <p className="text-sm mt-2 font-medium">Ajustez vos filtres ou essayez d'autres mots-clés.</p>
                            <Button onClick={resetFilters} variant="link" className="text-primary mt-4 uppercase font-black text-[10px] tracking-widest">
                                Voir tout le catalogue
                            </Button>
                        </div>
                    )}
                </div>
            </main>

            <Footer />
        </div>
    );
}

function Label({ text }: { text: string }) {
    return <p className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] ml-1">{text}</p>;
}
