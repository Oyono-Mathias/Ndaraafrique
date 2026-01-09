
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import type { Course } from '@/lib/types';

interface EnrolledCourse extends Course {
  progress: number;
  instructorName: string;
}

export function StudentCourseCard({ course }: { course: EnrolledCourse }) {
  const isStarted = course.progress > 0;

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm transition-shadow hover:shadow-md w-full">
        <Link href={`/courses/${course.id}`} className="block">
            <div className="flex flex-col sm:flex-row items-start gap-4 p-4">
                <Image
                    src={course.imageUrl || `https://picsum.photos/seed/${course.id}/150/100`}
                    alt={course.title}
                    width={150}
                    height={84}
                    className="aspect-video object-cover rounded-lg shrink-0 w-full sm:w-[150px]"
                />
                <div className="flex-1 w-full">
                    <h3 className="font-bold text-base text-slate-800 line-clamp-2 h-12">{course.title}</h3>
                    <p className="text-xs text-slate-500 truncate mb-2">Par {course.instructorName}</p>
                    <div className="space-y-2">
                        <Progress value={course.progress} className="h-2" />
                        <p className="text-xs text-slate-500">{course.progress}% terminé</p>
                    </div>
                     <Button size="sm" className="w-full mt-3 font-bold sm:hidden">
                        {isStarted ? 'Reprendre le cours' : 'Commencer le cours'}
                    </Button>
                </div>
                 <div className="hidden sm:flex flex-col justify-center items-center h-full ml-auto">
                    <Button asChild size="sm" className="font-bold">
                        <Link href={`/courses/${course.id}`}>
                            {isStarted ? 'Reprendre' : 'Commencer'}
                        </Link>
                    </Button>
                 </div>
            </div>
        </Link>
    </div>
  );
}
