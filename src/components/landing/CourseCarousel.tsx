
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

export const CourseCarousel = ({ title, courses, instructorsMap, isLoading }: CourseCarouselProps) => {
    if (isLoading && courses.length === 0) {
        return (
            <section>
                <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-6">{title}</h2>
                <div className="flex -ml-6">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="pl-6 basis-[80%] sm:basis-1/2 md:basis-1/3 lg:basis-1/4 shrink-0">
                           <Skeleton className="w-full aspect-[4/5] rounded-2xl bg-slate-800" />
                        </div>
                    ))}
                </div>
            </section>
        );
    }

    if (!courses || courses.length === 0) {
        return null;
    }

    return (
        <section>
            <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-6">{title}</h2>
             <Carousel opts={{ align: "start", loop: false }} className="w-full">
                <CarouselContent className="-ml-6">
                    {courses.map(course => (
                        <CarouselItem key={course.id} className="pl-6 basis-[80%] sm:basis-1/2 md:basis-1/3 lg:basis-1/4">
                            <CourseCard 
                                course={course} 
                                instructor={instructorsMap.get(course.instructorId) || null} 
                                variant="catalogue" 
                            />
                        </CarouselItem>
                    ))}
                </CarouselContent>
            </Carousel>
        </section>
    );
};
