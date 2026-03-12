
'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle, FileQuestion, PlayCircle, Lock, ChevronDown, ListChecks, GraduationCap } from 'lucide-react';
import type { Course, Section, Lecture, Quiz } from '@/lib/types';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { ScrollArea } from './ui/scroll-area';
import { Progress } from './ui/progress';

interface CourseSidebarProps {
    course: Course | null;
    sections: Section[];
    lecturesMap: Map<string, Lecture[]>;
    quizzes: Quiz[];
    activeLecture: Lecture | null;
    onLessonClick: (lecture: Lecture) => void;
    completedLessons?: string[];
}

/**
 * @fileOverview Sidebar du lecteur de cours (Design Qwen High-Fidelity).
 * ✅ VINTAGE : Numérotation 01, 02...
 * ✅ FINTECH : Progress bar épurée.
 */
export function CourseSidebar({
    course,
    sections,
    lecturesMap,
    quizzes,
    activeLecture,
    onLessonClick,
    completedLessons = [],
}: CourseSidebarProps) {
    
    const totalLectures = Array.from(lecturesMap.values()).flat().length;
    const progress = totalLectures > 0 ? Math.round((completedLessons.length / totalLectures) * 100) : 0;

    return (
        <div className="flex flex-col h-full bg-[#0f0f0f] select-none border-l border-white/5">
            {/* Header Sidebar */}
            <div className="p-6 border-b border-white/5 bg-[#141414] space-y-6">
                <Link 
                    href="/student/courses" 
                    className="flex items-center text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 hover:text-primary transition-all group"
                >
                    <ArrowLeft className="h-3.5 w-3.5 mr-2 transition-transform group-hover:-translate-x-1" />
                    Quitter le lecteur
                </Link>
                
                <div className="flex gap-4">
                    <div className="relative h-14 w-20 shrink-0 rounded-2xl overflow-hidden border border-white/10 bg-slate-900 shadow-2xl">
                        {course?.imageUrl && <Image src={course.imageUrl} alt={course.title} fill className="object-cover" />}
                    </div>
                    <div className="flex-1 overflow-hidden space-y-1">
                        <h2 className="text-sm font-black text-white leading-tight line-clamp-2 uppercase tracking-tight">{course?.title}</h2>
                        <div className="flex items-center gap-2 text-[9px] font-bold text-primary uppercase tracking-widest">
                            <GraduationCap size={12} />
                            <span>Parcours Certifiant</span>
                        </div>
                    </div>
                </div>

                <div className="space-y-3">
                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                        <span className="text-slate-500">Progression</span>
                        <span className="text-white">{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-1 bg-white/5" indicatorClassName="bg-primary shadow-[0_0_10px_hsl(var(--primary))]" />
                </div>
            </div>

            {/* Liste des modules */}
            <ScrollArea className="flex-1">
                <Accordion type="multiple" defaultValue={sections.map(s => s.id)} className="w-full">
                    {sections.map((section, idx) => (
                        <AccordionItem key={section.id} value={section.id} className="border-b border-white/5 last:border-0">
                            <AccordionTrigger className="px-6 py-5 text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 hover:no-underline hover:bg-white/5 transition-all">
                                <div className="flex items-center gap-4">
                                    <span className="text-primary/40 font-mono text-xs">0{idx + 1}</span>
                                    <span className="truncate max-w-[200px] text-left">{section.title}</span>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="pb-0 bg-black/40">
                                <ul className="space-y-0">
                                    {(lecturesMap.get(section.id) || []).map(lecture => {
                                        const isCompleted = completedLessons.includes(lecture.id);
                                        const isActive = activeLecture?.id === lecture.id;
                                        
                                        return (
                                            <li key={lecture.id}>
                                                <button 
                                                    onClick={() => onLessonClick(lecture)} 
                                                    className={cn(
                                                        "w-full text-left flex items-start p-5 gap-4 transition-all border-l-4",
                                                        isActive 
                                                            ? "bg-primary/5 border-primary text-white" 
                                                            : "border-transparent text-slate-500 hover:bg-white/5 hover:text-slate-300",
                                                        isCompleted && !isActive && "text-primary/60"
                                                    )}
                                                >
                                                    <div className="mt-0.5 shrink-0">
                                                        {isCompleted ? (
                                                            <CheckCircle className="h-4 w-4 text-primary" />
                                                        ) : (
                                                            <PlayCircle className={cn("h-4 w-4", isActive ? "text-primary animate-pulse" : "text-slate-800")} />
                                                        )}
                                                    </div>
                                                    <div className="flex-1 overflow-hidden">
                                                        <p className={cn("text-[13px] font-bold leading-relaxed", isActive && "text-white font-black")}>
                                                            {lecture.title}
                                                        </p>
                                                        <div className="flex items-center gap-3 mt-1.5 opacity-40">
                                                            {lecture.duration && (
                                                                <span className="text-[9px] font-black uppercase tracking-tighter flex items-center gap-1">
                                                                    <Clock size={10} /> {lecture.duration} min
                                                                </span>
                                                            )}
                                                            {lecture.type === 'pdf' && <span className="text-[9px] font-black uppercase tracking-tighter">Support PDF</span>}
                                                        </div>
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
                    <div className="p-6 mt-4 space-y-6">
                        <h3 className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em] mb-4 flex items-center gap-2">
                            <ListChecks className="h-3.5 w-3.5" />
                            Auto-Évaluation
                        </h3>
                        <div className="space-y-3">
                            {quizzes.map(quiz => (
                                <Link 
                                    key={quiz.id} 
                                    href={`/student/quiz/${quiz.id}`}
                                    className="flex items-center p-4 rounded-2xl bg-slate-900 border border-white/5 hover:border-primary/30 transition-all group active:scale-95 shadow-xl"
                                >
                                    <div className="p-2.5 bg-primary/10 rounded-xl mr-4 group-hover:bg-primary transition-colors">
                                        <FileQuestion className="h-4 w-4 text-primary group-hover:text-white" />
                                    </div>
                                    <span className="text-xs font-bold text-slate-300 group-hover:text-white truncate uppercase tracking-tight">{quiz.title}</span>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}
            </ScrollArea>

            <div className="p-6 border-t border-white/5 bg-[#111111] text-center">
                <p className="text-[9px] font-black text-slate-700 uppercase tracking-[0.4em]">Ndara Afrique Engine v2.0</p>
            </div>
        </div>
    );
}
