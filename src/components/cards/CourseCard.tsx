'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import type { Course, NdaraUser } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Star, Award } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';

interface CourseCardProps {
  course: Course & { progress?: number };
  instructor: Partial<NdaraUser> | null;
  variant?: 'catalogue' | 'student';
}

const StarRating = ({ rating, reviewCount }: { rating: number, reviewCount: number }) => (
    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Star className="w-4 h-4 fill-primary/80 text-primary/80" />
        <span className="font-bold text-foreground">{rating.toFixed(1)}</span>
        <span className="text-[10px] opacity-60">({reviewCount.toLocaleString()})</span>
    </div>
);

export function CourseCard({ course, instructor, variant = 'catalogue' }: CourseCardProps) {
  const progress = course.progress ?? 0;
  const isStudentView = variant === 'student';

  return (
    <Link href={`/courses/${course.id}`} className="block group w-full h-full">
      <div className="organic-card rounded-3xl overflow-hidden h-full flex flex-col group-hover:border-primary/20">
        <div className="relative aspect-[4/3] overflow-hidden bg-muted">
          <Image
            src={course.imageUrl || `https://picsum.photos/seed/${course.id}/600/450`}
            alt={course.title}
            fill
            className="object-cover transition-transform duration-700 group-hover:scale-110 sepia-[0.2] contrast-[1.1]"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
          
          {(course.isPopular || course.price === 0) && (
             <Badge className={cn("absolute top-4 left-4 font-bold border-none", course.price === 0 ? "bg-accent text-accent-foreground" : "bg-primary text-primary-foreground")}>
                {course.price === 0 ? "GRATUIT" : "POPULAIRE"}
            </Badge>
          )}
        </div>

        <div className="p-6 flex flex-col flex-grow bg-card">
          <h3 className="font-serif text-2xl text-foreground line-clamp-2 leading-[1.2] mb-4 group-hover:text-primary transition-colors">{course.title}</h3>
          
          {instructor?.fullName && (
             <div className="flex items-center gap-3 mt-auto">
                <Avatar className="h-8 w-8 border border-border">
                    <AvatarImage src={instructor.profilePictureURL} />
                    <AvatarFallback className="text-[10px] bg-muted">{instructor.fullName?.charAt(0)}</AvatarFallback>
                </Avatar>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">{instructor.fullName}</p>
            </div>
          )}
          
          <div className="mt-6 pt-6 border-t border-border/40">
            {isStudentView ? (
              progress === 100 ? (
                <div className="flex items-center gap-2 text-accent font-bold">
                  <Award className="h-5 w-5" />
                  <span className="uppercase tracking-widest text-xs">Certifié !</span>
                </div>
              ) : (
                <div className="space-y-2">
                    <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        <span>Progression</span>
                        <span>{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-1.5 bg-muted" indicatorClassName="bg-primary" />
                </div>
              )
            ) : (
              <div className="flex items-center justify-between">
                <StarRating rating={4.8} reviewCount={856} />
                <p className="font-serif text-2xl text-foreground">
                  {course.price > 0 ? `${course.price.toLocaleString('fr-FR')} XOF` : 'Gratuit'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}