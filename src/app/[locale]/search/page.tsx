'use client';

/**
 * @fileOverview Page de recherche Ndara Afrique - Style Udemy Exact.
 * ✅ AFFILIATION : Capture de l'affiliateId avec expiration 30 jours (Standard industry).
 */

import { useState, useEffect, useMemo } from 'react';
import { getFirestore, collection, query, where, onSnapshot, getDocs, doc } from 'firebase/firestore';
import { Input } from '@/components/ui/input';
import { Search as SearchIcon, Frown, ChevronRight, TrendingUp, LayoutGrid, ArrowLeft, SlidersHorizontal, ShoppingCart, Loader2, BadgeEuro, Sparkles } from 'lucide-react';
import { CourseCard } from '@/components/cards/CourseCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useRouter, useSearchParams } from 'next/navigation';
import { useRole } from '@/context/RoleContext';
import type { Course, NdaraUser, Settings } from '@/lib/types';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';

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
  const [cartCount, setCartCount] = useState(0);
  const [showOnlyResale, setShowOnlyResale] = useState(false);
  
  const db = getFirestore();
  const router = useRouter();
  const { user } = useRole();
  const searchParams = useSearchParams();

  // ✅ LOGIQUE AMBASSADEUR : Capturer l'affiliateId avec persistance 30 jours
  useEffect(() => {
      const affId = searchParams.get('aff');
      if (affId) {
          const cookieData = {
              id: affId,
              timestamp: Date.now()
          };
          // Persistance locale pour que l'affilié reste crédité même si le client revient plus tard
          localStorage.setItem('ndara_affiliate_id', JSON.stringify(cookieData));
          console.log("🚀 Affiliate ID Captured & Persisted:", affId);
      }
  }, [searchParams]);

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

  useEffect(() => {
    if (!user?.uid) return;
    const cartRef = collection(db, 'users', user.uid, 'cart');
    const unsubscribe = onSnapshot(cartRef, (snap) => {
        setCartCount(snap.size);
    });
    return () => unsubscribe();
  }, [user?.uid, db]);

  const filteredResults = useMemo(() => {
    let results = [...courses];
    
    if (showOnlyResale) {
        results = results.filter(c => c.resaleRightsAvailable === true);
    }

    if (searchTerm.trim()) {
        results = results.filter(c => 
            c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.category.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }

    return results;
  }, [courses, searchTerm, showOnlyResale]);

  return (
    <div className="min-h-screen bg-background text-foreground pb-24 animate-in fade-in duration-700">
      
      <header className="px-2 pt-4 pb-2 sticky top-0 bg-background/95 backdrop-blur-xl z-40 border-b border-border/50 flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full text-foreground hover:bg-accent">
            <ArrowLeft className="h-6 w-6" />
        </Button>
        
        <div className="relative flex-1">
          <Input
            placeholder="Rechercher une formation ou une licence..."
            className="h-12 pl-4 pr-10 rounded-lg bg-card border-border shadow-sm text-base focus-visible:ring-primary/20"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <button 
            onClick={() => setShowOnlyResale(!showOnlyResale)}
            className={cn(
                "absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-md transition-all flex items-center gap-1",
                showOnlyResale ? "bg-amber-500 text-black shadow-lg" : "text-muted-foreground hover:text-primary"
            )}
            title="Afficher uniquement la Bourse du Savoir"
          >
            <BadgeEuro className="h-5 w-5" />
            {showOnlyResale && <span className="text-[10px] font-black uppercase hidden sm:inline">Bourse Active</span>}
          </button>
        </div>

        {user && (
            <Link href="/student/cart" className="relative group">
                <Button variant="ghost" size="icon" className="rounded-full text-foreground hover:bg-accent">
                    <ShoppingCart className="h-6 w-6" />
                    {cartCount > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 h-5 w-5 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-background animate-in zoom-in">
                            {cartCount}
                        </span>
                    )}
                </Button>
            </Link>
        )}
      </header>

      <main className="px-4 pt-6">
        {showOnlyResale && (
            <div className="mb-8 p-6 bg-gradient-to-r from-amber-500/10 to-primary/10 border border-amber-500/20 rounded-3xl flex items-center justify-between animate-in slide-in-from-top-2 shadow-2xl">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-amber-500/20 rounded-2xl">
                        <BadgeEuro className="h-8 w-8 text-amber-500" />
                    </div>
                    <div>
                        <p className="text-lg font-black text-white uppercase tracking-tight">Bourse du Savoir</p>
                        <p className="text-xs text-amber-500 font-bold uppercase tracking-widest">Affichage exclusif des licences de revente</p>
                    </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => setShowOnlyResale(false)} className="h-10 border-amber-500/30 text-amber-500 hover:bg-amber-500 hover:text-black font-black uppercase text-[10px]">
                    Quitter le mode Bourse
                </Button>
            </div>
        )}

        {(searchTerm === '' && !showOnlyResale) ? (
          <div className="space-y-10 animate-in slide-in-from-bottom-4 duration-700">
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
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
                <h2 className="text-[13px] font-black text-foreground uppercase tracking-[0.1em] flex items-center gap-2">
                    {showOnlyResale && <Sparkles className="h-4 w-4 text-amber-500" />}
                    {filteredResults.length} {showOnlyResale ? 'OPPORTUNITÉS' : 'RÉSULTATS'}
                </h2>
                {isLoading && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
            </div>

            {isLoading ? (
              <div className="space-y-4">
                {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-xl bg-card" />)}
              </div>
            ) : filteredResults.length > 0 ? (
              <div className="flex flex-col gap-3">
                {filteredResults.map(course => (
                  <CourseCard 
                    key={course.id} 
                    course={course} 
                    instructor={instructorsMap.get(course.instructorId) || null}
                    variant="search-result" 
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-24 text-center opacity-40">
                <Frown className="h-16 w-16 mb-4" />
                <h3 className="text-xl font-black uppercase tracking-tight">Aucun résultat</h3>
                <Button variant="link" onClick={() => { setSearchTerm(''); setShowOnlyResale(false); }} className="text-primary mt-2">Réinitialiser la recherche</Button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}