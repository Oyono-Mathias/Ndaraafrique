'use client';

import { useState, useEffect, useMemo } from 'react';
import { getFirestore, collection, query, where, onSnapshot, orderBy, startAt, endAt, getDocs } from 'firebase/firestore';
import Link from 'next/link';
import Image from 'next/image';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Star, Search, Frown } from 'lucide-react';
import type { Course } from '@/lib/types';
import type { FormaAfriqueUser } from '@/context/RoleContext';
import { cn } from '@/lib/utils';
import { useDebounce } from '@/hooks/use-debounce';

const FILTERS = ['Tous', 'Gratuit', 'Design', 'Code', 'Marketing'];

const StarRating = ({ rating, reviewCount }: { rating: number, reviewCount: number }) => (
    <div className="flex items-center gap-1 text-xs text-slate-500">
        <span className="font-bold text-amber-500">{rating.toFixed(1)}</span>
        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
        <span>({reviewCount})</span>
    </div>
);

const ResultRow = ({ course, instructor }: { course: Course, instructor: FormaAfriqueUser | null }) => (
    <Link href={`/course/${course.id}`} className="block group">
        <div className="flex gap-4 p-2 rounded-lg hover:bg-slate-50">
            <Image
                src={course.imageUrl || `https://picsum.photos/seed/${course.id}/240/135`}
                alt={course.title}
                width={240}
                height={135}
                className="aspect-video object-cover w-32 rounded-md shrink-0"
            />
            <div className="flex-1 overflow-hidden">
                <h3 className="font-bold text-sm text-slate-800 line-clamp-2 group-hover:text-primary transition-colors">{course.title}</h3>
                <p className="text-xs text-slate-500 truncate mt-1">Par {instructor?.fullName || 'un instructeur'}</p>
                <div className="flex items-center gap-2 mt-1">
                    <StarRating rating={4.7} reviewCount={123} />
                </div>
                <p className="font-bold text-sm text-slate-900 pt-1">
                    {course.price > 0 ? `${course.price.toLocaleString('fr-FR')} FCFA` : 'Gratuit'}
                </p>
            </div>
        </div>
    </Link>
);


export default function SearchPage() {
    const db = getFirestore();
    const [searchTerm, setSearchTerm] = useState('');
    const [activeFilter, setActiveFilter] = useState('Tous');
    const [results, setResults] = useState<Course[]>([]);
    const [instructors, setInstructors] = useState<Map<string, FormaAfriqueUser>>(new Map());
    const [isLoading, setIsLoading] = useState(false);
    
    const debouncedSearchTerm = useDebounce(searchTerm, 300);

    useEffect(() => {
        setIsLoading(true);

        const coursesRef = collection(db, 'courses');
        let q = query(coursesRef, where('status', '==', 'Published'));
        
        // Apply text search filter if there is a search term
        if (debouncedSearchTerm) {
            const lowercasedTerm = debouncedSearchTerm.toLowerCase();
            q = query(q, 
                orderBy('title_lowercase'), // Assuming a 'title_lowercase' field exists
                startAt(lowercasedTerm),
                endAt(lowercasedTerm + '\uf8ff')
            );
        }

        // Apply category/price filter
        if (activeFilter !== 'Tous') {
            if (activeFilter === 'Gratuit') {
                q = query(q, where('price', '==', 0));
            } else {
                q = query(q, where('category', '==', activeFilter));
            }
        }

        const unsubscribe = onSnapshot(q, async (querySnapshot) => {
            const coursesData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course));
            setResults(coursesData);
            
            // Fetch instructors for the new results
            if (coursesData.length > 0) {
                const instructorIds = [...new Set(coursesData.map(c => c.instructorId))];
                const newInstructors = new Map(instructors);
                const idsToFetch = instructorIds.filter(id => !newInstructors.has(id));

                if (idsToFetch.length > 0) {
                    const usersQuery = query(collection(db, 'users'), where('uid', 'in', idsToFetch));
                    const usersSnap = await getDocs(usersQuery);
                    usersSnap.forEach(doc => {
                        newInstructors.set(doc.id, doc.data() as FormaAfriqueUser);
                    });
                    setInstructors(newInstructors);
                }
            }
            setIsLoading(false);
        }, (error) => {
            console.error("Search query failed:", error);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [debouncedSearchTerm, activeFilter, db]);

    return (
        <div className="container mx-auto p-4 space-y-6">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <Input
                    placeholder="Rechercher un cours..."
                    className="pl-10 h-12 bg-slate-100 border-slate-200 rounded-lg text-base"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            
            <div className="flex flex-wrap gap-2">
                {FILTERS.map(filter => (
                    <Button
                        key={filter}
                        variant={activeFilter === filter ? 'default' : 'outline'}
                        size="sm"
                        className="rounded-full"
                        onClick={() => setActiveFilter(filter)}
                    >
                        {filter}
                    </Button>
                ))}
            </div>

            <div className="space-y-4">
                {isLoading ? (
                    [...Array(4)].map((_, i) => (
                        <div key={i} className="flex gap-4 p-2">
                            <Skeleton className="w-32 h-[72px] rounded-md" />
                            <div className="flex-1 space-y-2">
                                <Skeleton className="h-4 w-3/4" />
                                <Skeleton className="h-3 w-1/4" />
                                <Skeleton className="h-3 w-1/2" />
                            </div>
                        </div>
                    ))
                ) : results.length > 0 ? (
                    results.map(course => (
                        <ResultRow key={course.id} course={course} instructor={instructors.get(course.instructorId) || null} />
                    ))
                ) : (
                    <div className="text-center py-16 px-4">
                        <Frown className="mx-auto h-12 w-12 text-slate-400" />
                        <h3 className="mt-4 text-lg font-semibold text-slate-700">
                            Désolé, nous n'avons pas trouvé de cours pour "{debouncedSearchTerm || activeFilter}"
                        </h3>
                        <p className="mt-1 text-sm text-slate-500">Essayez un autre mot-clé ou un autre filtre.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
