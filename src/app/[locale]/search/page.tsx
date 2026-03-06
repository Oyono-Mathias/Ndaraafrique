
'use client';

/**
 * @fileOverview Page de recherche Ndara Afrique - Style Udemy Exact.
 * ✅ ÉTAT INITIAL : Hub de découverte avec recherches populaires et catégories.
 * ✅ RÉSULTATS : Grille 2 colonnes ultra-fluide.
 */

import { useState, useEffect, useMemo } from 'react';
import { getFirestore, collection, query, where, onSnapshot, getDocs } from 'firebase/firestore';
import { Input } from '@/components/ui/input';
import { Search as SearchIcon, Frown, Sparkles, ChevronRight, TrendingUp, LayoutGrid } from 'lucide-react';
import { CourseCard } from '@/components/cards/CourseCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import type { Course, NdaraUser } from '@/lib/types';
import { cn } from '@/lib/utils';

const POPULAR_SEARCHES = [
    "AgriTech", "FinTech", "Python", "Excel", "Marketing", "Élevage", "Commerce", "IA", "Design"
];

const CATEGORIES = [
    { name: "Développement", color: "text-blue-400" },
    { name: "Informatique et logiciels", color: "text-purple-400" },
    { name: "Finance et comptabilité", color: "text-emerald-400" },
    { name: "Productivité bureautique", color: "text-amber-400" },
    { name: "Développement personnel", color: "text-rose-400" },
    { name: "Design", color: "text-indigo-400" },
    { name: "Mode de vie", color: "text-orange-400" }
];

export default function SearchPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [courses, setCourses] = useState<Course[]>([]);
  const [instructorsMap, setInstructorsMap] = useState<Map<string, Partial<NdaraUser>>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const db = getFirestore();

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

  const filteredResults = useMemo(() => {
    if (!searchTerm) return [];
    return courses.filter(c => 
      c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.category.toLowerCase().includes(searchTerm.toLowerCase())
    ).sort((a, b) => ((b.createdAt as any)?.seconds || 0) - ((a.createdAt as any)?.seconds || 0));
  }, [courses, searchTerm]);

  return (
    <div className="min-h-screen bg-background text-foreground pb-24 animate-in fade-in duration-700">
      {/* --- HEADER FIXE --- */}
      <header className="px-4 pt-6 pb-4 sticky top-0 bg-background/95 backdrop-blur-xl z-40 border-b border-border/50">
        <div className="relative">
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Rechercher"
            className="h-14 pl-12 rounded-xl bg-card border-border/50 shadow-sm text-lg focus-visible:ring-primary/20"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </header>

      <main className="px-4 pt-8">
        {searchTerm === '' ? (
          /* --- ÉTAT INITIAL : STYLE UDEMY --- */
          <div className="space-y-10 animate-in slide-in-from-bottom-4 duration-700">
            {/* Recherches populaires */}
            <section className="space-y-4">
              <h2 className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Recherches populaires
              </h2>
              <div className="flex flex-wrap gap-2">
                {POPULAR_SEARCHES.map(search => (
                  <button
                    key={search}
                    onClick={() => setSearchTerm(search)}
                    className="px-5 py-2.5 rounded-full border border-border bg-card hover:bg-primary hover:text-white hover:border-primary transition-all font-bold text-sm active:scale-95 shadow-sm"
                  >
                    {search}
                  </button>
                ))}
              </div>
            </section>

            {/* Catégories */}
            <section className="space-y-4">
              <h2 className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
                <LayoutGrid className="h-5 w-5 text-primary" />
                Parcourir les catégories
              </h2>
              <div className="grid gap-1">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat.name}
                    onClick={() => setSearchTerm(cat.name)}
                    className="flex items-center justify-between py-4 border-b border-border hover:bg-accent/50 px-2 rounded-lg transition-colors group"
                  >
                    <span className="font-bold text-base group-hover:text-primary transition-colors">{cat.name}</span>
                    <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-transform group-hover:translate-x-1" />
                  </button>
                ))}
              </div>
            </section>
          </div>
        ) : (
          /* --- RÉSULTATS DE RECHERCHE --- */
          <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-sm font-black text-muted-foreground uppercase tracking-widest">
                    {filteredResults.length} résultats pour "{searchTerm}"
                </h2>
                {isLoading && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
            </div>

            {isLoading ? (
              <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {[...Array(4)].map((_, i) => <Skeleton key={i} className="aspect-[3/4] w-full rounded-2xl bg-card" />)}
              </div>
            ) : filteredResults.length > 0 ? (
              <div className="grid gap-x-4 gap-y-8 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {filteredResults.map(course => (
                  <CourseCard 
                    key={course.id} 
                    course={course} 
                    instructor={instructorsMap.get(course.instructorId) || null}
                    variant="grid" 
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center opacity-40">
                <Frown className="h-16 w-16 mb-4" />
                <h3 className="text-xl font-black uppercase tracking-tight">Aucun résultat</h3>
                <Button variant="link" onClick={() => setSearchTerm('')} className="text-primary mt-2">Réinitialiser la recherche</Button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function Loader2(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}
