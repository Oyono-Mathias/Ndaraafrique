'use client';

/**
 * @fileOverview Liste des cours du formateur (Design Elite Forest & Wealth).
 * ✅ SÉCURITÉ : Empêche la suppression si un rachat est en cours.
 * ✅ DESIGN : Android-First avec header immersif et bouton sticky.
 */

import { useState, useMemo, useEffect } from 'react';
import { useRole } from '@/context/RoleContext';
import { getFirestore, collection, query, where, onSnapshot, doc, deleteDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { PlusCircle, Search, SlidersHorizontal, BookOpen, Trash2, ShoppingCart, Loader2 } from 'lucide-react';
import type { Course } from '@/lib/types';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { CourseCard } from '@/components/cards/CourseCard';
import { useLocale } from 'next-intl';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function InstructorCoursesPage() {
  const { currentUser } = useRole();
  const db = getFirestore();
  const { toast } = useToast();
  const locale = useLocale();
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!currentUser?.uid) return;

    setIsLoading(true);
    const q = query(collection(db, 'courses'), where('instructorId', '==', currentUser.uid));

    const unsubscribe = onSnapshot(q, (snap) => {
      const courseData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course));
      const sortedCourses = courseData.sort((a, b) => {
          const dateA = (a.createdAt as any)?.toDate?.() || new Date(0);
          const dateB = (b.createdAt as any)?.toDate?.() || new Date(0);
          return dateB.getTime() - dateA.getTime();
      });
      setCourses(sortedCourses);
      setIsLoading(false);
    }, (error) => {
        console.error("Error fetching instructor courses:", error);
        setIsLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser?.uid, db]);

  const filteredCourses = useMemo(() => {
    return courses.filter(c => c.title.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [courses, searchTerm]);

  const handleDeleteCourse = async (courseId: string) => {
      try {
          await deleteDoc(doc(db, 'courses', courseId));
          toast({ title: "Formation supprimée" });
      } catch (error) {
          toast({ variant: 'destructive', title: "Erreur lors de la suppression" });
      }
  };

  return (
    <div className="flex flex-col gap-0 pb-40 bg-[#0f172a] min-h-screen relative font-sans">
      <div className="grain-overlay opacity-[0.03]" />

      {/* --- HEADER IMMERSIF --- */}
      <header className="fixed top-0 w-full z-50 bg-[#0f172a]/95 backdrop-blur-md safe-area-pt border-b border-white/5">
        <div className="px-6 py-6">
            <div className="flex items-center justify-between mb-6">
                <h1 className="font-black text-2xl text-white tracking-tight uppercase">Mon Catalogue</h1>
                <button className="w-10 h-10 rounded-full bg-[#1e293b] flex items-center justify-center text-slate-400 hover:text-white transition active:scale-90">
                    <SlidersHorizontal className="h-5 w-5" />
                </button>
            </div>

            {/* Search Bar Style Qwen */}
            <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 group-focus-within:text-primary transition-colors" />
                <Input 
                    placeholder="Rechercher un cours..." 
                    className="h-14 pl-12 bg-[#1e293b] border-white/5 rounded-[2rem] text-white placeholder:text-slate-600 focus-visible:ring-primary/30 shadow-xl"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
        </div>
      </header>

      {/* --- MAIN CONTENT --- */}
      <main className="flex-1 pt-48 px-6 space-y-6 animate-in fade-in duration-700">
        
        {isLoading ? (
            <div className="space-y-6">
                {[...Array(2)].map((_, i) => (
                    <div key={i} className="space-y-4">
                        <Skeleton className="aspect-video w-full rounded-[2.5rem] bg-slate-900 border border-white/5" />
                        <Skeleton className="h-4 w-3/4 bg-slate-900" />
                    </div>
                ))}
            </div>
        ) : filteredCourses.length > 0 ? (
            <div className="grid gap-6">
                {filteredCourses.map(course => (
                    <CourseCard 
                        key={course.id} 
                        course={course} 
                        instructor={currentUser}
                        variant="instructor"
                        actions={
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <button 
                                        disabled={course.buyoutStatus === 'requested'}
                                        className="w-12 h-12 bg-red-500/10 text-red-500 rounded-2xl flex items-center justify-center hover:bg-red-500 hover:text-white transition active:scale-90 disabled:opacity-30"
                                    >
                                        <Trash2 className="h-5 w-5" />
                                    </button>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="bg-[#1e293b] border-white/10 rounded-[2.5rem] p-8 max-w-[90%] mx-auto">
                                    <AlertDialogHeader className="items-center text-center space-y-4">
                                        <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center text-red-500">
                                            <Trash2 size={32} />
                                        </div>
                                        <AlertDialogTitle className="text-xl font-black text-white uppercase tracking-tight">Supprimer ?</AlertDialogTitle>
                                        <AlertDialogDescription className="text-slate-400 font-medium leading-relaxed italic">
                                            "Mo ye ti lungula formation so ?" <br/>Cette action est irréversible. Toutes les données seront perdues.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter className="mt-8 gap-3">
                                        <AlertDialogCancel className="bg-[#0f172a] border-white/5 text-white rounded-2xl h-14 font-black uppercase text-[10px] tracking-widest flex-1">Annuler</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleDeleteCourse(course.id)} className="bg-red-600 hover:bg-red-700 text-white rounded-2xl h-14 font-black uppercase text-[10px] tracking-widest flex-1 shadow-lg shadow-red-600/20">
                                            Supprimer
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        }
                    />
                ))}
            </div>
        ) : (
            <div className="flex flex-col items-center justify-center py-20 px-8 text-center bg-slate-900/20 rounded-[3rem] border-2 border-dashed border-white/5 animate-in zoom-in duration-500">
                <div className="p-8 bg-slate-800/50 rounded-full mb-6">
                    <BookOpen className="h-16 w-16 text-slate-700" />
                </div>
                <h3 className="text-2xl font-black text-white uppercase tracking-tight">Catalogue vide</h3>
                <p className="text-slate-500 text-sm mt-3 leading-relaxed max-w-[220px] mx-auto font-medium italic">
                    "Le savoir se partage." <br/>Créez votre première formation pour inspirer la communauté.
                </p>
                <Button asChild className="mt-8 bg-primary hover:bg-primary/90 text-slate-950 rounded-[2rem] h-16 px-8 font-black uppercase text-xs tracking-widest shadow-xl shadow-primary/20 transition-all active:scale-95 group">
                    <Link href={`/${locale}/instructor/courses/create`} className="flex items-center gap-2">
                        <PlusCircle className="h-5 w-5" />
                        Créer mon cours
                    </Link>
                </Button>
            </div>
        )}
      </main>

      {/* --- STICKY ACTION BUTTON --- */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-[#0f172a] via-[#0f172a] to-transparent z-40 safe-area-pb">
          <Button asChild className="w-full h-16 rounded-[2rem] bg-gradient-to-r from-primary to-emerald-600 text-slate-950 font-black uppercase text-sm tracking-widest shadow-[0_0_25px_rgba(16,185,129,0.4)] active:scale-95 transition-all">
              <Link href={`/${locale}/instructor/courses/create`} className="flex items-center gap-3">
                  <PlusCircle className="h-6 w-6" />
                  Nouvelle Formation
              </Link>
          </Button>
      </div>
    </div>
  );
}
