'use client';

import { Course, NdaraUser } from '@/lib/types';
import { Carousel, CarouselContent, CarouselItem } from '@/components/ui/carousel';
import { CourseCard } from '@/components/cards/CourseCard';
import { Skeleton } from '@/components/ui/skeleton';

interface CourseCarouselProps {
    title: string;
    courses: Course[];
    instructorsMap: Map<string, Partial<NdaraUser>>;
    isLoading: boolean;
}

/**
 * @fileOverview Carrousel de cours horizontal compact (Udemy Style).
 * ✅ RÉSOLU : Variant "grid" pour corriger l'erreur de build.
 * ✅ RÉSOLU : Basis 1/2 pour voir 2 cartes sur mobile.
 */
export const CourseCarousel = ({ title, courses, instructorsMap, isLoading }: CourseCarouselProps) => {
    if (isLoading && courses.length === 0) {
        return (
            <section className="py-6">
                <Skeleton className="h-6 w-48 mb-4 rounded-full" />
                <div className="flex gap-3 overflow-hidden">
                    <Skeleton className="h-40 w-1/2 rounded-xl shrink-0" />
                    <Skeleton className="h-40 w-1/2 rounded-xl shrink-0" />
                </div>
            </section>
        );
    }

    if (!courses || courses.length === 0) {
        return null;
    }

    return (
        <section className="py-6 overflow-hidden">
            <h2 className="text-lg md:text-2xl font-black mb-4 text-foreground flex items-center gap-2 uppercase tracking-tight">
                <div className="h-6 w-1 bg-primary rounded-full" />
                {title}
            </h2>
             <Carousel opts={{ align: "start", loop: false }} className="w-full">
                <CarouselContent className="-ml-3">
                    {courses.map(course => (
                        <CarouselItem key={course.id} className="pl-3 basis-[48%] sm:basis-1/3 md:basis-1/4">
                            <CourseCard 
                                course={course} 
                                instructor={instructorsMap.get(course.instructorId) || null} 
                                variant="grid" 
                            />
                        </CarouselItem>
                    ))}
                </CarouselContent>
            </Carousel>
        </section>
    );
};
