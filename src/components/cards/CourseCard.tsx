
'use client';

import { Link } from 'next-intl';
import Image from 'next/image';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import type { Course, NdaraUser } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Star, Play, Award } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';

interface CourseCardProps {
  course: Course & { progress?: number };
  instructor: Partial<NdaraUser> | null;
  variant?: 'catalogue' | 'student';
}

const StarRating = ({ rating, reviewCount }: { rating: number, reviewCount: number }) => (
    <div className="flex items-center gap-1.5 text-sm text-slate-400">
        <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
        <span className="font-bold text-slate-200">{rating.toFixed(1)}</span>
        <span className="text-xs">({reviewCount.toLocaleString()})</span>
    </div>
);

export function CourseCard({ course, instructor, variant = 'catalogue' }: CourseCardProps) {
  const progress = course.progress ?? 0;
  const isStudentView = variant === 'student';

  const progressColorClass = cn({
    "bg-red-500": progress < 40,
    "bg-amber-500": progress >= 40 && progress < 80,
    "bg-green-500": progress >= 80,
  });

  return (
    <Link href={`/courses/${course.id}`} className="block group w-full h-full">
      <div className="bg-slate-800/50 rounded-2xl border border-slate-700/80 overflow-hidden h-full flex flex-col transition-all duration-300 hover:border-primary/50 hover:shadow-2xl hover:shadow-primary/10 hover:-translate-y-1">
        <div className="relative aspect-video overflow-hidden">
          <Image
            src={course.imageUrl || `https://picsum.photos/seed/${course.id}/400/225`}
            alt={course.title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
          
          {(course.isPopular || course.price === 0) && (
             <Badge variant={course.price === 0 ? "success" : "default"} className={cn("absolute top-3 left-3", course.price === 0 ? "bg-green-500/20 text-green-300 border-green-400/30" : "bg-primary/20 text-primary-foreground border-primary/30")}>
                {course.price === 0 ? "Gratuit" : "Populaire"}
            </Badge>
          )}

        </div>

        <div className="p-4 flex flex-col flex-grow">
          <h3 className="font-bold text-lg text-slate-100 line-clamp-2 leading-tight h-[56px]">{course.title}</h3>
          
          {instructor?.fullName && (
             <div className="flex items-center gap-2 mt-3">
                <Avatar className="h-7 w-7 border border-slate-700">
                    <AvatarImage src={instructor.profilePictureURL} />
                    <AvatarFallback className="text-xs bg-slate-700 text-slate-300">{instructor.fullName?.charAt(0)}</AvatarFallback>
                </Avatar>
                <p className="text-sm text-slate-400 truncate">{instructor.fullName}</p>
            </div>
          )}
          
          <div className="flex-grow" />

          <div className="mt-4">
            {isStudentView ? (
              progress === 100 ? (
                <div className="flex items-center gap-2 text-green-400 font-semibold">
                  <Award className="h-5 w-5" />
                  <span>Terminé !</span>
                </div>
              ) : (
                <div>
                    <Progress value={progress} className="h-2" indicatorClassName={progressColorClass} />
                    <p className="text-xs text-right text-slate-400 mt-1">{progress}%</p>
                </div>
              )
            ) : (
              <div className="flex items-center justify-between">
                <StarRating rating={4.7} reviewCount={1234} />
                <p className="font-extrabold text-xl text-white">
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
