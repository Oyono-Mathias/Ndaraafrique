
'use client';

/**
 * @fileOverview Liste des cours de l'étudiant optimisée Android-first.
 * ✅ DESIGN QWEN : Onglets minimalistes, recherche locale et cartes élégantes.
 * ✅ FONCTIONNEL : Filtrage par statut et recherche par mot-clé.
 */

import { useState, useMemo, useEffect } from 'react';
import { useRole } from '@/context/RoleContext';
import { getFirestore, collection, query, where, getDocs, documentId, onSnapshot } from 'firebase/firestore';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { CourseCard } from '@/components/cards/CourseCard';
import { Skeleton } from '@/components/ui/skeleton';
import { BookOpen, Search, Compass } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import type { Course, Enrollment } from '@/lib/types';
import { cn } from '@/lib/utils';

export default function StudentCoursesAndroid() {
  const { currentUser } = useRole();
  const db = getFirestore();
  const [courses, setCourses] = useState<(Course & { progress: number })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    if (!currentUser?.uid) return;

    setIsLoading(true);
    const enrollQuery = query(collection(db, 'enrollments'), where('studentId', '==', currentUser.uid));

    const unsubscribe = onSnapshot(enrollQuery, async (snap) => {
      if (snap.empty) {
        setCourses([]);
        setIsLoading(false);
        return;
      }

      const enrollments = snap.docs.map(d => d.data() as Enrollment);
      const courseIds = enrollments.map(e => e.courseId);

      const coursesRef = collection(db, 'courses');
      const q = query(coursesRef, where(documentId(), 'in', courseIds.slice(0, 30)));
      const courseSnap = await getDocs(q);
      
      const courseData = courseSnap.docs.map(doc => {
        const enrollment = enrollments.find(e => e.courseId === doc.id);
        const data = doc.data() as Course;
        return {
          ...data,
          id: doc.id,
          progress: enrollment?.progress || 0
        };
      });

      setCourses(courseData);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser?.uid, db]);

  const filteredResults = useMemo(() => {
    let list = [...courses];
    
    // Filtre par onglet
    if (activeTab === 'inprogress') {
        list = list.filter(c => c.progress < 100);
    } else if (activeTab === 'completed') {
        list = list.filter(c => c.progress === 100);
    }

    // Filtre par recherche
    if (searchTerm.trim()) {
        const s = searchTerm.toLowerCase();
        list = list.filter(c => c.title.toLowerCase().includes(s));
    }

    return list;
  }, [courses, activeTab, searchTerm]);

  return (
    <div className="flex flex-col gap-0 pb-24 bg-ndara-bg min-h-screen">
      {/* --- HEADER FIXE --- */}
      <header className="sticky top-0 z-40 bg-ndara-bg/95 backdrop-blur-md border-b border-white/5 safe-area-pt">
        <div className="px-6 py-6">
            <h1 className="font-black text-3xl text-white mb-1 uppercase tracking-tight">Mes Formations</h1>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Gérez votre apprentissage</p>
        </div>

        {/* Onglets Style Qwen */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full bg-transparent border-b border-white/5 rounded-none h-14 p-0 px-6 justify-between gap-2">
                <TabsTrigger 
                    value="all" 
                    className="data-[state=active]:bg-transparent data-[state=active]:text-primary border-b-2 border-transparent data-[state=active]:border-primary rounded-none h-full px-2 font-black text-xs uppercase tracking-widest text-slate-500 transition-all"
                >
                    Tous
                </TabsTrigger>
                <TabsTrigger 
                    value="inprogress" 
                    className="data-[state=active]:bg-transparent data-[state=active]:text-primary border-b-2 border-transparent data-[state=active]:border-primary rounded-none h-full px-2 font-black text-xs uppercase tracking-widest text-slate-500 transition-all"
                >
                    En cours
                </TabsTrigger>
                <TabsTrigger 
                    value="completed" 
                    className="data-[state=active]:bg-transparent data-[state=active]:text-primary border-b-2 border-transparent data-[state=active]:border-primary rounded-none h-full px-2 font-black text-xs uppercase tracking-widest text-slate-500 transition-all"
                >
                    Terminés
                </TabsTrigger>
            </TabsList>
        </Tabs>

        {/* Barre de Recherche Locale */}
        <div className="px-6 py-4">
            <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600 group-focus-within:text-primary transition-colors" />
                <Input 
                    placeholder="Rechercher mes cours..." 
                    className="h-12 pl-11 bg-ndara-surface border-white/5 rounded-full text-white placeholder:text-slate-600 focus-visible:ring-primary/30"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
        </div>
      </header>

      {/* --- LISTE DES COURS --- */}
      <main className="px-6 pt-6">
        {isLoading ? (
            <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-28 w-full rounded-[2rem] bg-slate-900 border border-white/5" />
                ))}
            </div>
        ) : filteredResults.length > 0 ? (
            <div className="space-y-4 animate-in fade-in duration-700">
                {filteredResults.map(course => (
                    <CourseCard key={course.id} course={course} instructor={null} variant="list" />
                ))}
            </div>
        ) : searchTerm ? (
            <div className="py-20 text-center flex flex-col items-center opacity-30">
                <Search className="h-12 w-12 mb-4 text-slate-600" />
                <p className="text-sm font-black uppercase tracking-widest text-slate-500">Aucun résultat</p>
            </div>
        ) : (
            <div className="flex flex-col items-center justify-center py-20 px-8 text-center bg-slate-900/20 rounded-[3rem] border-2 border-dashed border-slate-800/50 animate-in zoom-in duration-500">
                <div className="p-8 bg-slate-800/50 rounded-full mb-6 animate-bounce" style={{ animationDuration: '3s' }}>
                    <BookOpen className="h-16 w-16 text-slate-700" />
                </div>
                <h3 className="text-2xl font-black text-white uppercase tracking-tight">Aucune formation</h3>
                <p className="text-slate-500 text-sm mt-3 leading-relaxed max-w-[220px] mx-auto font-medium italic">
                    "Le savoir n'attend pas." <br/>Explorez notre catalogue pour commencer.
                </p>
                <Button asChild className="mt-8 bg-primary hover:bg-primary/90 text-slate-950 rounded-full h-14 px-8 font-black uppercase text-xs tracking-widest shadow-xl shadow-primary/20 transition-all active:scale-95 group">
                    <Link href="/search" className="flex items-center gap-2">
                        <Compass className="h-4 w-4 group-hover:rotate-45 transition-transform" />
                        Parcourir le catalogue
                    </Link>
                </Button>
            </div>
        )}
      </main>
    </div>
  );
}
