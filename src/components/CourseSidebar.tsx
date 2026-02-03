
'use client';

import Link from 'next/link';
import { ArrowLeft, CheckCircle, FileQuestion, PlayCircle, BookOpen } from 'lucide-react';
import type { Course, Section, Lecture, Quiz } from '@/lib/types';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { cn } from '@/lib/utils';
import Image from 'next/image';

interface CourseSidebarProps {
    course: Course | null;
    sections: Section[];
    lecturesMap: Map<string, Lecture[]>;
    quizzes: Quiz[];
    activeLecture: Lecture | null;
    onLessonClick: (lecture: Lecture) => void;
    completedLessons?: string[];
}

export function CourseSidebar({
    course,
    sections,
    lecturesMap,
    quizzes,
    activeLecture,
    onLessonClick,
    completedLessons = [],
}: CourseSidebarProps) {
    
    return (
        <div className="flex flex-col h-full bg-[#121212]">
            <div className="p-4 border-b border-slate-800">
                <Link href="/student/mes-formations" className="flex items-center text-slate-400 hover:text-white transition-colors mb-4 group">
                    <ArrowLeft className="h-4 w-4 mr-2 transition-transform group-hover:-translate-x-1" />
                    <span className="text-sm font-medium">Mes formations</span>
                </Link>
                <div className="flex items-start gap-3">
                    <div className="relative h-12 w-20 flex-shrink-0 bg-slate-800 rounded-md overflow-hidden border border-slate-700">
                        {course?.imageUrl && <Image src={course.imageUrl} alt={course.title} fill className="object-cover" />}
                    </div>
                    <div className="flex-1 overflow-hidden">
                        <h2 className="font-bold text-sm text-white line-clamp-2 leading-tight">{course?.title}</h2>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
                <Accordion type="multiple" defaultValue={sections.map(s => s.id)} className="w-full">
                {sections.map(section => (
                    <AccordionItem key={section.id} value={section.id} className="border-b border-slate-800">
                        <AccordionTrigger className="px-4 py-4 text-sm font-bold text-slate-200 hover:no-underline hover:bg-slate-800/30 transition-all [&[data-state=open]]:bg-slate-800/20">
                           <span className="truncate">{section.title}</span>
                        </AccordionTrigger>
                        <AccordionContent>
                           <ul className="space-y-0.5">
                                {(lecturesMap.get(section.id) || []).map(lecture => {
                                    const isCompleted = completedLessons.includes(lecture.id);
                                    const isActive = activeLecture?.id === lecture.id;
                                    
                                    return (
                                        <li key={lecture.id}>
                                            <button 
                                                onClick={() => onLessonClick(lecture)} 
                                                className={cn(
                                                    "w-full text-left flex items-start p-4 text-sm gap-3 transition-all duration-200",
                                                    isActive ? "bg-primary/10 text-primary" : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200",
                                                    isCompleted && !isActive && "text-green-500/80"
                                                )}
                                            >
                                                <div className="mt-0.5">
                                                    {isCompleted ? (
                                                        <CheckCircle className="h-4 w-4 shrink-0 text-green-500" />
                                                    ) : (
                                                        <PlayCircle className={cn("h-4 w-4 shrink-0", isActive ? "text-primary" : "text-slate-500")} />
                                                    )}
                                                </div>
                                                <div className="flex-1">
                                                    <p className={cn("font-medium leading-snug", isActive && "font-bold")}>{lecture.title}</p>
                                                    {lecture.duration && <span className="text-[10px] opacity-60 uppercase tracking-wider">{lecture.duration} min</span>}
                                                </div>
                                            </button>
                                        </li>
                                    );
                                })}
                           </ul>
                        </AccordionContent>
                    </AccordionItem>
                ))}
                </Accordion>

                 {quizzes.length > 0 && (
                    <div className="py-6 px-2">
                        <h3 className="px-4 text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-3">Évaluations du cours</h3>
                        <ul className="space-y-1">
                            {quizzes.map(quiz => (
                                <li key={quiz.id}>
                                    <Link 
                                        href={`/courses/${course?.id}/quiz/${quiz.id}`}
                                        className="flex items-center p-3 text-sm gap-3 text-slate-300 hover:bg-slate-800/50 hover:text-white transition-all rounded-xl mx-2 border border-transparent hover:border-slate-700"
                                    >
                                        <div className="p-2 bg-primary/10 rounded-lg">
                                            <FileQuestion className="h-4 w-4 text-primary" />
                                        </div>
                                        <span className="font-semibold">{quiz.title}</span>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                 )}
            </div>
        </div>
    );
}
