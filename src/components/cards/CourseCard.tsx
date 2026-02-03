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
    <div className="flex items-center gap-1.5 text-sm text-slate-400">
        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
        <span className="font-bold text-slate-200">{rating.toFixed(1)}</span>
        <span className="text-[10px] opacity-60">({reviewCount.toLocaleString()})</span>
    </div>
);

export function CourseCard({ course, instructor, variant = 'catalogue' }: CourseCardProps) {
  const progress = course.progress ?? 0;
  const isStudentView = variant === 'student';

  return (
    <Link href={`/courses/${course.id}`} className="block group w-full h-full">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden h-full flex flex-col transition-all duration-300 hover:border-primary/50 hover:-translate-y-1 hover:shadow-2xl hover:shadow-primary/10">
        <div className="relative aspect-video overflow-hidden bg-slate-800">
          <Image
            src={course.imageUrl || `https://picsum.photos/seed/${course.id}/600/450`}
            alt={course.title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
          
          {(course.isPopular || course.price === 0) && (
             <Badge className={cn("absolute top-3 left-3 font-bold border-none", course.price === 0 ? "bg-green-500 text-white" : "bg-primary text-white")}>
                {course.price === 0 ? "GRATUIT" : "POPULAIRE"}
            </Badge>
          )}
        </div>

        <div className="p-5 flex flex-col flex-grow">
          <h3 className="font-bold text-lg text-white line-clamp-2 leading-tight mb-4 group-hover:text-primary transition-colors">{course.title}</h3>
          
          {instructor?.fullName && (
             <div className="flex items-center gap-2 mt-auto">
                <Avatar className="h-6 w-6 border border-slate-700">
                    <AvatarImage src={instructor.profilePictureURL} />
                    <AvatarFallback className="text-[10px] bg-slate-800">{instructor.fullName?.charAt(0)}</AvatarFallback>
                </Avatar>
                <p className="text-xs font-medium text-slate-400">{instructor.fullName}</p>
            </div>
          )}
          
          <div className="mt-4 pt-4 border-t border-slate-800">
            {isStudentView ? (
              progress === 100 ? (
                <div className="flex items-center gap-2 text-green-400 font-bold text-sm">
                  <Award className="h-4 w-4" />
                  <span>Certifié !</span>
                </div>
              ) : (
                <div className="space-y-2">
                    <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        <span>Progression</span>
                        <span>{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-1 bg-slate-800" indicatorClassName="bg-primary" />
                </div>
              )
            ) : (
              <div className="flex items-center justify-between">
                <StarRating rating={4.8} reviewCount={124} />
                <p className="font-bold text-lg text-white">
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