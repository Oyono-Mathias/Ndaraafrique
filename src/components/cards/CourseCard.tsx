
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import type { Course } from '@/lib/types';
import type { FormaAfriqueUser } from '@/context/RoleContext';
import { cn } from '@/lib/utils';
import { Star, Play } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface CourseCardProps {
  course: Course & { progress?: number };
  instructor: Partial<FormaAfriqueUser> | null;
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
  const isStarted = course.progress !== undefined && course.progress > 0;
  const isStudentView = variant === 'student';

  return (
    <div className="w-full h-full glassmorphism-card rounded-2xl overflow-hidden group flex flex-col">
       <Link href={isStudentView ? `/courses/${course.id}` : `/course/${course.id}`} className="block">
        <div className="relative aspect-video overflow-hidden">
          <Image
            src={course.imageUrl || `https://picsum.photos/seed/${course.id}/400/225`}
            alt={course.title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
          {course.category && (
            <Badge className="absolute top-3 right-3 bg-black/50 text-white border-white/20 backdrop-blur-sm">
                {course.category}
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
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                        <Progress value={course.progress || 0} className="h-1.5" />
                        <span className="font-semibold">{course.progress || 0}%</span>
                    </div>
                     <Button size="sm" className="w-full font-bold bg-primary hover:bg-primary/90" asChild>
                        <Link href={`/courses/${course.id}`}>
                            <Play className="h-4 w-4 mr-2"/>
                            {isStarted ? t('continue') : t('start')}
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
