
'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle, FileQuestion, PlayCircle, Lock, ChevronDown, ListChecks } from 'lucide-react';
import type { Course, Section, Lecture, Quiz } from '@/lib/types';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { ScrollArea } from './ui/scroll-area';

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
        <div className="flex flex-col h-full bg-[#0f0f0f] select-none">
            {/* Header Sidebar */}
            <div className="p-5 border-b border-white/5 bg-[#141414]">
                <Link 
                    href="/student/courses" 
                    className="flex items-center text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 hover:text-white transition-colors mb-6 group"
                >
                    <ArrowLeft className="h-3.5 w-3.5 mr-2 transition-transform group-hover:-translate-x-1" />
                    Mes formations
                </Link>
                
                <div className="flex gap-4">
                    <div className="relative h-12 w-16 shrink-0 rounded-lg overflow-hidden border border-white/10 bg-slate-900">
                        {course?.imageUrl && <Image src={course.imageUrl} alt={course.title} fill className="object-cover" />}
                    </div>
                    <div className="flex-1 overflow-hidden">
                        <h2 className="text-sm font-bold text-white leading-tight line-clamp-2">{course?.title}</h2>
                        <p className="text-[10px] text-slate-500 mt-1 font-bold uppercase tracking-tighter">
                            {completedLessons.length} / {Array.from(lecturesMap.values()).flat().length} leçons
                        </p>
                    </div>
                </div>
            </div>

            {/* Liste des modules */}
            <ScrollArea className="flex-1">
                <Accordion type="multiple" defaultValue={sections.map(s => s.id)} className="w-full">
                    {sections.map((section, idx) => (
                        <AccordionItem key={section.id} value={section.id} className="border-b border-white/5">
                            <AccordionTrigger className="px-5 py-4 text-xs font-black uppercase tracking-widest text-slate-400 hover:no-underline hover:bg-white/5 transition-all">
                                <div className="flex items-center gap-3">
                                    <span className="text-primary opacity-40 font-mono">0{idx + 1}</span>
                                    <span className="truncate max-w-[200px]">{section.title}</span>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="pb-0 bg-black/20">
                                <ul className="space-y-0">
                                    {(lecturesMap.get(section.id) || []).map(lecture => {
                                        const isCompleted = completedLessons.includes(lecture.id);
                                        const isActive = activeLecture?.id === lecture.id;
                                        
                                        return (
                                            <li key={lecture.id}>
                                                <button 
                                                    onClick={() => onLessonClick(lecture)} 
                                                    className={cn(
                                                        "w-full text-left flex items-start p-4 gap-4 transition-all border-l-4",
                                                        isActive 
                                                            ? "bg-primary/10 border-primary text-white" 
                                                            : "border-transparent text-slate-500 hover:bg-white/5 hover:text-slate-300",
                                                        isCompleted && !isActive && "text-green-500/60"
                                                    )}
                                                >
                                                    <div className="mt-0.5 shrink-0">
                                                        {isCompleted ? (
                                                            <CheckCircle className="h-4 w-4 text-green-500" />
                                                        ) : (
                                                            <PlayCircle className={cn("h-4 w-4", isActive ? "text-primary" : "text-slate-700")} />
                                                        )}
                                                    </div>
                                                    <div className="flex-1 overflow-hidden">
                                                        <p className={cn("text-xs font-bold leading-snug", isActive && "text-white")}>
                                                            {lecture.title}
                                                        </p>
                                                        {lecture.duration && (
                                                            <span className="text-[9px] font-black uppercase tracking-tighter opacity-40 mt-1 block">
                                                                {lecture.duration} min
                                                            </span>
                                                        )}
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

                {/* Section Quiz */}
                {quizzes.length > 0 && (
                    <div className="p-5 mt-4">
                        <h3 className="text-[10px] font-black text-slate-600 uppercase tracking-[0.25em] mb-4 flex items-center gap-2">
                            <ListChecks className="h-3 w-3" />
                            Évaluations
                        </h3>
                        <div className="space-y-2">
                            {quizzes.map(quiz => (
                                <Link 
                                    key={quiz.id} 
                                    href={`/student/quiz/${quiz.id}`}
                                    className="flex items-center p-3 rounded-xl bg-slate-900 border border-white/5 hover:border-primary/30 transition-all group"
                                >
                                    <div className="p-2 bg-primary/10 rounded-lg mr-3 group-hover:bg-primary transition-colors">
                                        <FileQuestion className="h-4 w-4 text-primary group-hover:text-white" />
                                    </div>
                                    <span className="text-xs font-bold text-slate-300 group-hover:text-white truncate">{quiz.title}</span>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}
            </ScrollArea>
        </div>
    );
}
