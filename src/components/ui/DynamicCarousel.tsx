'use client';

import { useState, useEffect, useCallback } from 'react';
import { getFirestore, collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import Autoplay from 'embla-carousel-autoplay';
import Image from 'next/image';
import Link from 'next/link';

import { Carousel, CarouselContent, CarouselItem } from '@/components/ui/carousel';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useEmblaCarousel } from 'embla-carousel-react';

interface CarouselSlide {
  id: string;
  imageUrl: string;
  link?: string;
  order: number;
}

export function DynamicCarousel() {
  const [slides, setSlides] = useState<CarouselSlide[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true }, [
    Autoplay({ delay: 5000, stopOnInteraction: false }),
  ]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    const db = getFirestore();
    const slidesQuery = query(collection(db, 'carousel_slides'), orderBy('order', 'asc'));

    const unsubscribe = onSnapshot(slidesQuery, (snapshot) => {
      const fetchedSlides = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CarouselSlide));
      setSlides(fetchedSlides);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching carousel slides:", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);
  
  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on('select', onSelect);
    emblaApi.on('reInit', onSelect);
  }, [emblaApi, onSelect]);
  
  if (isLoading) {
    return <Skeleton className="w-full h-[200px] md:h-[300px] rounded-xl bg-slate-800" />;
  }

  if (slides.length === 0) {
    return null; // Don't render anything if there are no slides
  }

  return (
    <div className="relative w-full">
      <Carousel
        ref={emblaRef}
        className="w-full overflow-hidden rounded-xl"
      >
        <CarouselContent>
          {slides.map((slide) => {
            const content = (
                 <div className="relative w-full h-[200px] md:h-[300px] bg-slate-800">
                    <Image
                        src={slide.imageUrl}
                        alt={`Slide ${slide.order}`}
                        fill
                        className="object-cover"
                        priority={slide.order === 0}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                </div>
            );
            return (
              <CarouselItem key={slide.id}>
                {slide.link ? <Link href={slide.link}>{content}</Link> : content}
              </CarouselItem>
            );
          })}
        </CarouselContent>
      </Carousel>
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => emblaApi?.scrollTo(index)}
            className={cn(
              "h-2 rounded-full transition-all duration-300",
              index === selectedIndex ? "w-6 bg-primary" : "w-2 bg-white/50"
            )}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
