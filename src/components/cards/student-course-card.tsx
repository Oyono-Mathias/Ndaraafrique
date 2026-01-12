
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import type { Course } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Play } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface EnrolledCourse extends Course {
  progress: number;
  instructorName: string;
}

export function StudentCourseCard({ course }: { course: EnrolledCourse }) {
  const isStarted = course.progress > 0;
  const { t } = useTranslation();

  return (
    <Link href={`/courses/${course.id}`} className="block group">
        <div className={cn(
            "bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-sm transition-all duration-300 w-full flex flex-col",
            "hover:shadow-lg hover:-translate-y-1"
        )}>
            <div className="relative aspect-video">
                <Image
                    src={course.imageUrl || `https://picsum.photos/seed/${course.id}/300/170`}
                    alt={course.title}
                    fill
                    className="object-cover"
                />
            </div>
            <div className="p-4 flex flex-col flex-grow">
                <p className="text-xs text-slate-500 dark:text-slate-400">{course.category}</p>
                <h3 className="font-bold text-base text-slate-800 dark:text-slate-100 line-clamp-2 h-12 flex-grow group-hover:text-primary transition-colors">{course.title}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-1">Par {course.instructorName}</p>
            </div>
            <div className="px-4 pb-4">
                <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 mb-2">
                    <Progress value={course.progress} className="h-1.5 tv:h-2.5" />
                    <span className="font-semibold tv:text-lg">{course.progress}%</span>
                </div>
                 <Button size="sm" className="w-full font-bold">
                    <Play className="h-4 w-4 mr-2"/>
                    {isStarted ? t('continue') : t('start')}
                </Button>
            </div>
        </div>
    </Link>
  );
}
