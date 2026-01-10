
'use client';

import Link from 'next/link';
import { useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, getFirestore, getDocs, limit, orderBy } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Star, Frown, BookText, Video, Award, Users, BookOpen, Clock, Linkedin, Twitter, Youtube, Briefcase, MapPin, ArrowRight } from 'lucide-react';
import Image from 'next/image';
import { useMemo, useState, useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import type { Course } from '@/lib/types';
import type { FormaAfriqueUser } from '@/context/RoleContext';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { useRole } from '@/context/RoleContext';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Footer } from '@/components/layout/footer';
import { Card, CardContent } from '@/components/ui/card';
import { Carousel, CarouselContent, CarouselItem } from '@/components/ui/carousel';

const StarRating = ({ rating, reviewCount }: { rating: number, reviewCount: number }) => (
    <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <span className="font-bold text-amber-500">{rating.toFixed(1)}</span>
        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
        <span>({reviewCount.toLocaleString()})</span>
    </div>
);

const CourseCard = ({ course, instructor }: { course: Course, instructor: Partial<FormaAfriqueUser> | null }) => {
    const isEbook = course.contentType === 'ebook';
    const isFree = course.price === 0;

    return (
        <div className="w-full">
            <Link href={`/course/${course.id}`} className="block group">
                <div className="bg-background rounded-lg overflow-hidden transition-all duration-300 hover:shadow-lg border">
                    <div className="relative">
                        <Image
                            src={course.imageUrl || `https://picsum.photos/seed/${course.id}/300/170`}
                            alt={course.title}
                            width={300}
                            height={170}
                            className="aspect-video object-cover w-full"
                        />
                         {course.isPopular && <Badge variant="destructive" className="absolute top-2 left-2">Bestseller</Badge>}
                    </div>
                    <div className="p-3 space-y-2 flex flex-col flex-grow">
                        <h3 className="font-bold text-sm text-foreground line-clamp-2 h-10">{course.title}</h3>
                        <p className="text-xs text-muted-foreground truncate">Par {instructor?.fullName || 'un instructeur'}</p>
                        <StarRating rating={4.7} reviewCount={123} />
                        <div className="flex-grow"></div>
                        <div className="pt-2">
                            <p className="font-bold text-base text-foreground">
                              {isFree ? 'Gratuit' : `${course.price.toLocaleString('fr-FR')} XOF`}
                            </p>
                        </div>
                    </div>
                </div>
            </Link>
        </div>
    );
};


export default function LandingPage() {
  const db = getFirestore();
  const [instructorsMap, setInstructorsMap] = useState<Map<string, Partial<FormaAfriqueUser>>>(new Map());
  const router = useRouter();
  const { user, isUserLoading } = useRole();

  const coursesQuery = useMemoFirebase(() => {
    return query(collection(db, 'courses'), where('status', '==', 'Published'), orderBy('isPopular', 'desc'), limit(12));
  }, [db]);

  const { data: courses, isLoading: coursesLoading } = useCollection<Course>(coursesQuery);

  useEffect(() => {
    if (!isUserLoading && user) {
      router.push('/dashboard');
    }
  }, [user, isUserLoading, router]);

  useEffect(() => {
    const processData = async () => {
        if (coursesLoading || !courses) return;
        const neededInstructorIds = [...new Set(courses.map(c => c.instructorId).filter(id => !instructorsMap.has(id)))];
        if (neededInstructorIds.length > 0) {
            const usersQuery = query(collection(db, 'users'), where('uid', 'in', neededInstructorIds.slice(0, 10)));
            const userSnapshots = await getDocs(usersQuery);
            const newInstructors = new Map(instructorsMap);
            userSnapshots.forEach(doc => newInstructors.set(doc.data().uid, doc.data()));
            setInstructorsMap(newInstructors);
        }
    };
    processData();
  }, [courses, coursesLoading, db, instructorsMap]);

  if (isUserLoading || user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="w-full bg-background text-foreground">
      <header className="absolute top-0 left-0 right-0 z-50 p-4 bg-background/80 backdrop-blur-sm border-b">
        <div className="container mx-auto flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/icon.svg" alt="FormaAfrique Logo" width={28} height={28} />
            <span className="font-bold text-lg text-foreground">FormaAfrique</span>
          </Link>
          <div className="flex items-center gap-2">
            <Button variant="ghost" asChild className="px-2 sm:px-4">
              <Link href="/login">Se connecter</Link>
            </Button>
            <Button asChild className="bg-primary hover:bg-primary/90 text-primary-foreground hidden sm:flex">
              <Link href="/login?tab=register">S'inscrire</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="pt-20">
        {/* Hero Section */}
        <section className="py-12 md:py-20 text-center">
          <div className="container mx-auto px-4 relative">
            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight">Révélez votre potentiel sur le continent</h1>
            <p className="max-w-2xl mx-auto mt-4 text-md md:text-lg text-muted-foreground">Des formations de qualité, accessibles partout, pour booster votre carrière et construire l'Afrique de demain.</p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" asChild className="h-11 px-6 text-base bg-primary hover:bg-primary/90 text-primary-foreground w-full sm:w-auto">
                <Link href="/search">Explorer les cours</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Popular Courses Section */}
        <section className="py-12 bg-background-alt">
          <div className="container mx-auto px-4">
            <h2 className="text-2xl font-bold mb-8">Une sélection de cours pour vous lancer</h2>
            {coursesLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-80 w-full rounded-lg" />)}
                </div>
            ) : courses && courses.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {courses.map(course => (
                        <CourseCard key={course.id} course={course} instructor={instructorsMap.get(course.instructorId) || null} />
                    ))}
                </div>
            ) : (
                <div className="text-center py-16 px-4 border-2 border-dashed rounded-xl">
                    <Frown className="mx-auto h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-4 text-lg font-semibold">Aucun cours disponible pour le moment.</h3>
                    <p className="mt-1 text-sm text-muted-foreground">Nos formateurs préparent du nouveau contenu !</p>
                </div>
            )}
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
}
