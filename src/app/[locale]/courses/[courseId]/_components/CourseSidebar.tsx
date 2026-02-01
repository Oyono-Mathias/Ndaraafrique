'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, BookOpen, CheckCircle, FileQuestion } from 'lucide-react';
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
}

export function CourseSidebar({
    course,
    sections,
    lecturesMap,
    quizzes,
    activeLecture,
    onLessonClick,
}: CourseSidebarProps) {
    
    return (
        <>
            <div className="p-4 border-b border-slate-800">
                <Link href={`/student/mes-formations`} className="flex items-center gap-3 group">
                    <div className="relative h-10 w-16 bg-slate-700 rounded-md overflow-hidden">
                        {course?.imageUrl && <Image src={course.imageUrl} alt={course.title} fill className="object-cover" />}
                    </div>
                    <div className="flex-1 overflow-hidden">
                        <h2 className="font-bold text-sm text-white truncate group-hover:text-primary">{course?.title}</h2>
                        <p className="text-xs text-slate-400">Retour à la page du cours</p>
                    </div>
                </Link>
            </div>
            <div className="flex-1 overflow-y-auto">
                <Accordion type="multiple" defaultValue={sections.map(s => s.id)} className="w-full">
                {sections.map(section => (
                    <AccordionItem key={section.id} value={section.id} className="border-b-0">
                        <AccordionTrigger className="px-4 py-3 text-sm font-semibold text-slate-300 hover:no-underline hover:bg-slate-800/50">
                           {section.title}
                        </AccordionTrigger>
                        <AccordionContent>
                           <ul>
                                {(lecturesMap.get(section.id) || []).map(lecture => (
                                    <li key={lecture.id}>
                                        <button 
                                            onClick={() => onLessonClick(lecture)} 
                                            className={cn(
                                                "w-full text-left flex items-center p-4 text-sm gap-3 hover:bg-slate-800/50 transition-colors",
                                                activeLecture?.id === lecture.id && "bg-primary/10 text-primary font-semibold"
                                            )}
                                        >
                                            <CheckCircle className="h-4 w-4 shrink-0" />
                                            <span className="flex-1">{lecture.title}</span>
                                            {lecture.duration && <span className="text-xs text-slate-500">{lecture.duration} min</span>}
                                        </button>
                                    </li>
                                ))}
                           </ul>
                        </AccordionContent>
                    </AccordionItem>
                ))}
                </Accordion>

                 {quizzes.length > 0 && (
                    <div className="p-4 mt-2">
                        <h3 className="px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Évaluations</h3>
                        <ul>
                            {quizzes.map(quiz => (
                                <li key={quiz.id}>
                                    <Link 
                                        href={`/courses/${course?.id}/quiz/${quiz.id}`}
                                        className="w-full text-left flex items-center p-4 text-sm gap-3 hover:bg-slate-800/50 transition-colors rounded-lg text-slate-300 font-medium"
                                    >
                                        <FileQuestion className="h-4 w-4 shrink-0 text-primary" />
                                        <span className="flex-1">{quiz.title}</span>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                 )}
            </div>
        </>
    );
}
