
'use client';

/**
 * @fileOverview Page de recherche Ndara Afrique - Design Android-First V2.
 * ✅ i18n : Internationalisation complète des placeholders et filtres.
 */

import { useState, useEffect, useMemo, Suspense } from 'react';
import { getFirestore, collection, query, where, onSnapshot, getDocs } from 'firebase/firestore';
import { Input } from '@/components/ui/input';
import { 
    Search as SearchIcon, 
    Frown, 
    ArrowLeft, 
    SlidersHorizontal, 
    ShoppingCart, 
    Loader2, 
    Mic,
    Leaf,
    ChartLine,
    Coins,
    Cpu,
    Code
} from 'lucide-react';
import { CourseCard } from '@/components/cards/CourseCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useRouter, useSearchParams } from 'next/navigation';
import { useRole } from '@/context/RoleContext';
import type { Course, NdaraUser } from '@/lib/types';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

const CATEGORIES = [
    { name: "AgriTech", icon: Leaf },
    { name: "FinTech", icon: ChartLine },
    { name: "Trading", icon: Coins },
    { name: "Mécatronique", icon: Cpu },
    { name: "Dév Web", icon: Code }
];

function SearchPageContent() {
  const [searchTerm, setSearchTerm] = useState('');
  const [courses, setCourses] = useState<Course[]>([]);
  const [instructorsMap, setInstructorsMap] = useState<Map<string, Partial<NdaraUser>>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [cartCount, setCartCount] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  const db = getFirestore();
  const router = useRouter();
  const { user } = useRole();
  const searchParams = useSearchParams();
  const t = useTranslations('Landing.hero');
  const tCat = useTranslations('Landing.categories');
  const tCommon = useTranslations('Common');

  useEffect(() => {
      const affId = searchParams.get('aff');
      if (affId && typeof window !== 'undefined') {
          const cookieData = {
              id: affId,
              timestamp: Date.now(),
              expiresAt: Date.now() + (30 * 24 * 60 * 60 * 1000)
          };
          localStorage.setItem('ndara_affiliate_id', JSON.stringify(cookieData));
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
    
    if (selectedCategory !== 'all') {
        results = results.filter(c => c.category === selectedCategory);
    }

    if (searchTerm.trim()) {
        results = results.filter(c => 
            c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.category.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }

    return results;
  }, [courses, searchTerm, selectedCategory]);

  return (
    <div className="min-h-screen bg-ndara-bg pb-24 animate-in fade-in duration-700 relative">
      <div className="grain-overlay" />
      
      <header className="fixed top-0 w-full z-50 bg-ndara-bg/95 backdrop-blur-md safe-area-pt border-b border-white/5">
        <div className="px-4 py-4 space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <button onClick={() => router.back()} className="w-10 h-10 rounded-full bg-ndara-surface flex items-center justify-center text-gray-400 hover:text-white transition active:scale-90">
                        <ArrowLeft className="h-5 w-5" />
                    </button>
                    <h1 className="font-black text-xl text-white uppercase tracking-tight">{tCommon('catalogue')}</h1>
                </div>
                {user && (
                    <Link href="/student/cart" className="relative">
                        <Button variant="ghost" size="icon" className="rounded-full bg-ndara-surface text-gray-400">
                            <ShoppingCart className="h-5 w-5" />
                            {cartCount > 0 && (
                                <span className="absolute -top-0.5 -right-0.5 h-4 w-4 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center border-2 border-ndara-bg">
                                    {cartCount}
                                </span>
                            )}
                        </Button>
                    </Link>
                )}
            </div>

            <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <SearchIcon className="h-5 w-5 text-primary" />
                </div>
                <Input
                    placeholder={t('search_placeholder')}
                    className="h-14 pl-14 pr-12 rounded-[2rem] bg-ndara-surface border-white/5 text-white shadow-xl focus-visible:ring-primary/20"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                <button className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white active:scale-90 transition-transform">
                    <Mic className="h-4 w-4" />
                </button>
            </div>
        </div>

        <div className="px-4 pb-4 overflow-hidden">
            <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
                <button 
                    onClick={() => setSelectedCategory('all')}
                    className={cn(
                        "flex-shrink-0 px-5 py-2.5 rounded-full border text-[10px] font-black uppercase tracking-widest transition-all active:scale-95",
                        selectedCategory === 'all' 
                            ? "bg-primary text-ndara-bg border-primary shadow-lg shadow-primary/20" 
                            : "bg-ndara-surface border-white/5 text-gray-400"
                    )}
                >
                    {tCat('all')}
                </button>
                {CATEGORIES.map(cat => (
                    <button 
                        key={cat.name}
                        onClick={() => setSelectedCategory(cat.name)}
                        className={cn(
                            "flex-shrink-0 px-5 py-2.5 rounded-full border text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 flex items-center gap-2",
                            selectedCategory === cat.name 
                                ? "bg-primary text-ndara-bg border-primary shadow-lg shadow-primary/20" 
                                : "bg-ndara-surface border-white/5 text-gray-400"
                        )}
                    >
                        <cat.icon className="h-3 w-3" />
                        {cat.name}
                    </button>
                ))}
            </div>
        </div>
      </header>

      <main className="px-4 pt-56">
        <div className="flex items-center justify-between mb-6 px-1">
            <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest">
                <span className="text-white">{filteredResults.length}</span> {tCommon('found_results', { count: filteredResults.length })}
            </p>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
                <div key={i} className="flex gap-3 p-3 bg-ndara-surface/50 rounded-[2rem] border border-white/5">
                    <Skeleton className="w-32 h-20 rounded-3xl bg-slate-800 shrink-0" />
                    <div className="flex-1 space-y-2 py-1">
                        <Skeleton className="h-4 w-3/4 bg-slate-800" />
                        <Skeleton className="h-3 w-1/2 bg-slate-800" />
                    </div>
                </div>
            ))}
          </div>
        ) : filteredResults.length > 0 ? (
          <div className="flex flex-col gap-4 animate-in slide-in-from-bottom-4 duration-700">
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
          <div className="flex flex-col items-center justify-center py-32 text-center opacity-30 animate-in zoom-in duration-500">
            <Frown className="h-16 w-16 mb-4 text-slate-600" />
            <h3 className="text-xl font-black text-white uppercase tracking-tight">{tCommon('no_results')}</h3>
            <p className="text-sm text-slate-500 mt-2">{t('subtitle')}</p>
            <Button variant="link" onClick={() => { setSearchTerm(''); setSelectedCategory('all'); }} className="text-primary mt-4 font-black uppercase text-[10px] tracking-widest">
                {tCommon('reset_filters')}
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}

export default function SearchPage() {
    return (
        <Suspense fallback={<div className="h-screen bg-ndara-bg flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
            <SearchPageContent />
        </Suspense>
    )
}
