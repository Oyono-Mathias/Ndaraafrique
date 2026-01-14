

'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import type { Course } from '@/lib/types';
import type { NdaraUser } from '@/context/RoleContext';
import { cn } from '@/lib/utils';
import { Star, Play, Award } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';

interface CourseCardProps {
  course: Course & { progress?: number };
  instructor: Partial<NdaraUser> | null;
  variant?: 'catalogue' | 'student';
}

const StarRating = ({ rating, reviewCount }: { rating: number, reviewCount: number }) => (
    <div className="flex items-center gap-1 text-xs text-slate-400">
        <span className="font-bold text-amber-400">{rating.toFixed(1)}</span>
        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
        <span>({reviewCount.toLocaleString()})</span>
    </div>
);

export function CourseCard({ course, instructor, variant = 'catalogue' }: CourseCardProps) {
  const { t } = useTranslation();
  const [imageLoading, setImageLoading] = useState(true);
  
  const progress = course.progress ?? 0;
  const isStarted = progress > 0;
  const isCompleted = progress === 100;
  const isStudentView = variant === 'student';

  const getButtonText = () => {
    if (isCompleted) return "Revoir le cours";
    if (isStarted) return "Continuer";
    return "Commencer";
  };
  
  const progressColorClass = cn({
    "bg-red-500": progress < 40,
    "bg-amber-500": progress >= 40 && progress < 80,
    "bg-green-500": progress >= 80,
  });

  return (
    <div className="w-full h-full glassmorphism-card rounded-2xl overflow-hidden group flex flex-col">
       <Link href={isStudentView ? `/courses/${course.id}` : `/course/${course.id}`} className="block">
        <div className="relative aspect-video overflow-hidden bg-slate-800">
          <Image
            src={course.imageUrl || `https://picsum.photos/seed/${course.id}/400/225`}
            alt={course.title}
            fill
            className={cn(
              "object-cover transition-all duration-300 group-hover:scale-105",
              imageLoading ? 'opacity-0' : 'opacity-100'
            )}
            onLoad={() => setImageLoading(false)}
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
          {course.isPopular && (
            <Badge className="absolute top-3 left-3 bg-amber-400/20 text-amber-300 border-amber-400/30">
                Populaire
            </Badge>
          )}
        </div>
      </Link>
      <div className="p-4 flex flex-col flex-grow">
        <Link href={isStudentView ? `/courses/${course.id}` : `/course/${course.id}`} className="block">
            <h3 className="font-bold text-base text-slate-100 line-clamp-2 h-12 group-hover:text-primary transition-colors">{course.title}</h3>
            <p className="text-xs text-slate-400 truncate mt-1">Par {instructor?.fullName || t('unknown_instructor')}</p>
            <div className="flex items-center pt-1">
                <StarRating rating={4.7} reviewCount={123} />
            </div>
        </Link>
        <div className="flex-grow" />
        <div className="mt-4">
            {isStudentView ? (
                 <div className="space-y-2">
                    {isCompleted ? (
                        <div className="flex items-center justify-center gap-2 text-green-500 font-semibold p-1.5 bg-green-500/10 rounded-lg text-sm">
                            <Award className="h-4 w-4" />
                            <span>Terminé !</span>
                        </div>
                    ) : (
                        <div>
                            {isStarted && (
                                <p className="text-xs text-center text-slate-400 mb-1">
                                    Plus que {100 - progress}% pour obtenir votre certificat !
                                </p>
                            )}
                            <Progress value={progress} className="h-1.5" indicatorClassName={progressColorClass} />
                        </div>
                    )}
                     <Button size="sm" className="w-full font-bold bg-primary hover:bg-primary/90" asChild>
                        <Link href={`/courses/${course.id}`}>
                            <Play className="h-4 w-4 mr-2"/>
                            {getButtonText()}
                        </Link>
                    </Button>
                </div>
            ) : (
                <div className="text-right">
                     <p className="font-extrabold text-lg text-white">
                        {course.price > 0 ? `${course.price.toLocaleString('fr-FR')} XOF` : 'Gratuit'}
                    </p>
                </div>
            )}
        </div>
      </div>
    </div>
  );
}
