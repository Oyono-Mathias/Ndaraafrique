
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { 
    getFirestore, 
    collection, 
    query, 
    where, 
    orderBy, 
    getDocs,
} from 'firebase/firestore';
import Link from 'next/link';
import Image from 'next/image';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Star, Search, Frown } from 'lucide-react';
import type { Course, NdaraUser } from '@/lib/types';
import { useDebounce } from '@/hooks/use-debounce';
import { useRole } from '@/context/RoleContext';
import { toast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const StarRating = ({ rating, reviewCount }: { rating: number, reviewCount: number }) => (
    <div className="flex items-center gap-1 text-xs text-slate-400">
        <span className="font-bold text-amber-500">{rating.toFixed(1)}</span>
        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
        <span>({reviewCount})</span>
    </div>
);

const SearchResultCard = ({ course, instructor }: { course: Course, instructor: NdaraUser | null }) => (
    <Link href={`/course/${course.id}`} className="block group" aria-label={`Voir les détails du cours ${course.title}`}>
        <div className="flex gap-4 p-3 rounded-2xl hover:bg-slate-800/50 transition-colors duration-200">
            <div className="relative w-32 md:w-40 h-[72px] md:h-[90px] shrink-0">
                <Image
                    src={course.imageUrl || `https://picsum.photos/seed/${course.id}/240/135`}
                    alt={course.title}
                    fill
                    loading="lazy"
                    className="aspect-video object-cover rounded-lg bg-slate-800"
                />
            </div>
            <div className="flex-1 overflow-hidden">
                <h3 className="font-bold text-sm md:text-base text-slate-100 line-clamp-2 group-hover:text-primary transition-colors">{course.title}</h3>
                <p className="text-xs text-slate-400 truncate mt-1">Par {instructor?.fullName || 'un instructeur'}</p>
                <div className="flex items-center gap-2 mt-1">
                    <StarRating rating={4.7} reviewCount={123} />
                </div>
                <p className="font-bold text-base text-white pt-1">
                    {course.price > 0 ? `${course.price.toLocaleString('fr-FR')} XOF` : 'Gratuit'}
                </p>
            </div>
        </div>
    </Link>
);

export default function SearchPage() {
    const db = getFirestore();
    const router = useRouter();
    const { user, isUserLoading } = useRole();
    const [searchTerm, setSearchTerm] = useState('');
    const [courses, setCourses] = useState<Course[]>([]);
    const [instructors, setInstructors] = useState<Map<string, NdaraUser>>(new Map());
    const [isLoading, setIsLoading] = useState(true);
    const [categories, setCategories] = useState<string[]>([]);
    const [filters, setFilters] = useState({
        category: 'Tous',
        price: 'Tous'
    });
    
    const debouncedSearchTerm = useDebounce(searchTerm, 300);

    const fetchAllData = useCallback(async () => {
        if (isUserLoading || !user) return;
        
        setIsLoading(true);
        try {
            const coursesQuery = query(collection(db, 'courses'), where('status', '==', 'Published'), orderBy('createdAt', 'desc'));
            const querySnapshot = await getDocs(coursesQuery);
            const coursesData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course));
            
            setCourses(coursesData);
            
            const uniqueCategories = [...new Set(coursesData.map(c => c.category).filter(Boolean))];
            setCategories(uniqueCategories.sort());

            const instructorIds = [...new Set(coursesData.map(c => c.instructorId))].filter(Boolean);
            if (instructorIds.length > 0) {
                 const usersQuery = query(collection(db, 'users'), where('uid', 'in', instructorIds));
                 const usersSnap = await getDocs(usersQuery);
                 const newInstructors = new Map<string, NdaraUser>();
                 usersSnap.forEach(doc => {
                     newInstructors.set(doc.data().uid, doc.data() as NdaraUser);
                 });
                 setInstructors(newInstructors);
            }

        } catch (error) {
            console.error("Search query failed:", error);
            toast({ variant: 'destructive', title: 'Erreur de recherche', description: 'Un index Firestore est peut-être manquant.' });
        } finally {
            setIsLoading(false);
        }
    }, [db, user, isUserLoading]);

    useEffect(() => {
        if (!isUserLoading && !user) {
            toast({
                variant: "destructive",
                title: "Accès non autorisé",
                description: "Veuillez créer un compte pour accéder à ce contenu.",
            });
            router.push('/login?tab=register');
        } else {
            fetchAllData();
        }
    }, [user, isUserLoading, fetchAllData, router]);

    const filteredResults = useMemo(() => {
        return courses.filter(course => {
            const lowercasedTerm = debouncedSearchTerm.toLowerCase();
            
            if (filters.category !== 'Tous' && course.category !== filters.category) return false;
            if (filters.price === 'Gratuit' && course.price !== 0) return false;
            if (filters.price === 'Payant' && course.price === 0) return false;
            if (debouncedSearchTerm && !course.title.toLowerCase().includes(lowercasedTerm)) return false;

            return true;
        });
    }, [courses, filters, debouncedSearchTerm]);
    
    if (isUserLoading || !user) {
        return <div className="flex h-full w-full items-center justify-center"><Skeleton className="h-full w-full" /></div>;
    }

    return (
        <div className="container mx-auto py-6 px-4 space-y-6">
             <header className="sticky top-[70px] bg-background/80 backdrop-blur-sm py-4 z-20 -mx-4 px-4 border-b border-slate-800">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <Input
                        placeholder="Rechercher une compétence, un cours..."
                        className="pl-10 h-12 bg-slate-800 border-slate-700 rounded-lg text-base"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            
                <div className="flex flex-col sm:flex-row gap-2 mt-4">
                    <Select value={filters.category} onValueChange={(value) => setFilters(prev => ({...prev, category: value}))}>
                        <SelectTrigger className="w-full sm:w-[180px] dark:bg-slate-800 dark:border-slate-700">
                            <SelectValue placeholder="Catégorie" />
                        </SelectTrigger>
                        <SelectContent className="dark:bg-slate-800 dark:border-slate-700">
                            <SelectItem value="Tous">Toutes les catégories</SelectItem>
                            {categories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                        </SelectContent>
                    </Select>
                     <Select value={filters.price} onValueChange={(value) => setFilters(prev => ({...prev, price: value}))}>
                        <SelectTrigger className="w-full sm:w-[180px] dark:bg-slate-800 dark:border-slate-700">
                            <SelectValue placeholder="Prix" />
                        </SelectTrigger>
                        <SelectContent className="dark:bg-slate-800 dark:border-slate-700">
                            <SelectItem value="Tous">Tous les prix</SelectItem>
                            <SelectItem value="Gratuit">Gratuit</SelectItem>
                            <SelectItem value="Payant">Payant</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </header>

            <main className="space-y-4">
                {isLoading ? (
                    [...Array(5)].map((_, i) => (
                        <div key={i} className="flex gap-4 p-2">
                            <Skeleton className="w-32 md:w-40 h-[72px] md:h-[90px] rounded-lg bg-slate-700" />
                            <div className="flex-1 space-y-2 py-1">
                                <Skeleton className="h-4 w-3/4 bg-slate-700" />
                                <Skeleton className="h-3 w-1/4 bg-slate-700" />
                                <Skeleton className="h-4 w-1/2 bg-slate-700" />
                            </div>
                        </div>
                    ))
                ) : filteredResults.length > 0 ? (
                    <>
                        <p className="text-sm text-slate-400">{filteredResults.length} résultat(s) trouvé(s).</p>
                        {filteredResults.map(course => (
                            <SearchResultCard key={course.id} course={course} instructor={instructors.get(course.instructorId) || null} />
                        ))}
                    </>
                ) : (
                    <div className="text-center py-20 px-4 border-2 border-dashed rounded-xl border-slate-700">
                        <Frown className="mx-auto h-12 w-12 text-slate-400" />
                        <h3 className="mt-4 text-lg font-semibold text-slate-200">
                            Oups ! Aucun cours trouvé.
                        </h3>
                        <p className="mt-1 text-sm text-slate-400">Essayez d'autres mots-clés ou filtres.</p>
                         <Button variant="link" asChild>
                            <a href="mailto:support@ndara-afrique.com?subject=Suggestion de cours">Suggérez-nous un sujet !</a>
                        </Button>
                    </div>
                )}
            </main>
        </div>
    );
}
