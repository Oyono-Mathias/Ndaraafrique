
'use client';

/**
 * @fileOverview Carrousel Dynamique Ndara Afrique.
 * ✅ OPTIMISÉ : next/image avec priority pour le premier slide pour un LCP record.
 * ✅ CDN : Utilise la Pull Zone Bunny pour les images.
 */

import { useState, useEffect, useCallback } from 'react';
import { getFirestore, collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import Autoplay from 'embla-carousel-autoplay';
import Image from 'next/image';
import Link from 'next/link';

import { Carousel, CarouselContent, CarouselItem } from '@/components/ui/carousel';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import useEmblaCarousel from 'embla-carousel-react';

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
    Autoplay({ delay: 5000, stopOnInteraction: true }),
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
    return <Skeleton className="w-full aspect-[3/1] md:aspect-[4/1] rounded-[2rem] bg-slate-800" />;
  }

  if (slides.length === 0) {
    return null;
  }

  return (
    <div className="relative w-full animate-in fade-in duration-1000">
      <Carousel
        ref={emblaRef}
        className="w-full overflow-hidden rounded-[2rem] shadow-2xl border border-white/5"
      >
        <CarouselContent>
          {slides.map((slide, index) => {
            const content = (
                 <div className="relative w-full aspect-[3/1] md:aspect-[4/1] bg-slate-900">
                    <Image
                        src={slide.imageUrl}
                        alt={`Bannière ${slide.order}`}
                        fill
                        className="object-cover"
                        priority={index === 0} // ✅ Priorité sur le premier slide
                        sizes="100vw"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
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
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2.5 z-20">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => emblaApi?.scrollTo(index)}
            className={cn(
              "h-1.5 rounded-full transition-all duration-500",
              index === selectedIndex ? "w-8 bg-primary shadow-[0_0_10px_hsl(var(--primary))]" : "w-2 bg-white/30"
            )}
            aria-label={`Aller au slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
