

'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { useRole } from '@/context/RoleContext';
import { doc, getFirestore, collection, serverTimestamp, query, where, getDocs, setDoc, updateDoc, orderBy, DocumentData, QuerySnapshot } from 'firebase/firestore';
import ReactPlayer from 'react-player/lazy';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, CheckCircle, FileText, Loader2, MessageSquare, PlayCircle, Link2 } from 'lucide-react';
import type { Section, Lecture, Course, CourseProgress, Enrollment, Resource } from '@/lib/types';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { toast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';


function CoursePlayerSidebar({ course, sections, lecturesMap, activeLessonId, onLessonClick, progressPercent, isLoading, totalLessons, completedLessons }: { course: Course | null, sections: Section[], lecturesMap: Map<string, Lecture[]>, activeLessonId: string | null, onLessonClick: (lesson: Lecture) => void, progressPercent: number, isLoading: boolean, totalLessons: number, completedLessons: number }) {
    return (
        <div className="h-full flex flex-col bg-slate-800/50 border-l border-slate-700">
            <div className="p-4 border-b border-slate-700">
                <h2 className="font-bold text-white line-clamp-2">{course?.title}</h2>
                <div className="mt-2 space-y-1">
                    <Progress value={progressPercent} className="h-1.5" />
                    <p className="text-xs text-slate-400">{completedLessons} / {totalLessons} leçons terminées</p>
                </div>
            </div>
            <ScrollArea className="flex-1">
                <Accordion type="multiple" defaultValue={sections.map(s => s.id)} className="w-full">
                    {sections.map(section => (
                        <AccordionItem key={section.id} value={section.id} className="border-b-0">
                            <AccordionTrigger className="px-4 py-3 text-sm font-semibold text-slate-300 hover:no-underline hover:bg-slate-700/50">
                                {section.title}
                            </AccordionTrigger>
                            <AccordionContent className="bg-slate-800/30">
                                <ul className="divide-y divide-slate-700/50">
                                    {isLoading ? <Skeleton className="h-10 w-full m-2 bg-slate-700" /> : 
                                    (lecturesMap.get(section.id) || []).map(lecture => (
                                        <li key={lecture.id}>
                                            <button onClick={() => onLessonClick(lecture)} className={cn(
                                                "w-full text-left flex items-start text-sm p-3 transition-colors hover:bg-slate-700/50 gap-3",
                                                activeLessonId === lecture.id && "bg-primary/10"
                                            )}>
                                                <PlayCircle className={cn("h-5 w-5 text-slate-500 shrink-0 mt-px", activeLessonId === lecture.id && "text-primary")} />
                                                <span className={cn("flex-1 text-slate-300", activeLessonId === lecture.id && "font-semibold text-primary")}>{lecture.title}</span>
                                                <span className="text-xs text-slate-500">{lecture.duration ? `${lecture.duration}m` : ''}</span>
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                </Accordion>
            </ScrollArea>
        </div>
    );
}

const ResourceItem = ({ resource }: { resource: Resource }) => (
    <a href={resource.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-800/50 transition-colors">
        <Link2 className="h-5 w-5 text-slate-400 shrink-0" />
        <span className="text-sm font-medium text-slate-200">{resource.title}</span>
    </a>
)

export default function CoursePlayerPage() {
    const { courseId } = useParams();
    const router = useRouter();
    const db = getFirestore();
    const { user, isUserLoading } = useRole();
    const isMobile = useIsMobile();

    const [activeLesson, setActiveLesson] = useState<Lecture | null>(null);
    const [sections, setSections] = useState<Section[]>([]);
    const [lecturesMap, setLecturesMap] = useState<Map<string, Lecture[]>>(new Map());
    const [pageLoading, setPageLoading] = useState(true);

    const courseRef = useMemoFirebase(() => courseId ? doc(db, 'courses', courseId as string) : null, [db, courseId]);
    const { data: course, isLoading: courseLoading } = useDoc<Course>(courseRef);

    const enrollmentRef = useMemoFirebase(() => (user && courseId) ? doc(db, 'enrollments', `${user.uid}_${courseId}`) : null, [db, user, courseId]);
    const { data: enrollment, isLoading: enrollmentLoading } = useDoc<Enrollment>(enrollmentRef);

    const progressRef = useMemoFirebase(() => (user && courseId) ? doc(db, 'course_progress', `${user.uid}_${courseId}`) : null, [db, user, courseId]);
    const { data: progressDoc, isLoading: progressLoading } = useDoc<CourseProgress>(progressRef);
    
    const resourcesQuery = useMemoFirebase(() => courseId ? query(collection(db, 'resources'), where('courseId', '==', courseId)) : null, [db, courseId]);
    const { data: resources, isLoading: resourcesLoading } = useCollection<Resource>(resourcesQuery);

    const handleLessonClick = useCallback((lesson: Lecture) => {
        setActiveLesson(lesson);
        if (isMobile) {
           window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }, [isMobile]);

    useEffect(() => {
        const checkEnrollment = () => {
            if (!enrollmentLoading && !enrollment) {
                toast({ variant: 'destructive', title: 'Accès non autorisé', description: "Vous n'êtes pas inscrit à ce cours." });
                router.push(`/course/${courseId}`);
            }
        };
        checkEnrollment();
    }, [enrollment, enrollmentLoading, router, courseId]);


    useEffect(() => {
        if (courseLoading) return;

        const fetchCurriculum = async () => {
            const sectionsQuery = query(collection(db, 'courses', courseId as string, 'sections'), orderBy('order'));
            const sectionsSnap = await getDocs(sectionsQuery);
            const fetchedSections = sectionsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Section);
            setSections(fetchedSections);

            const allLecturesMap = new Map<string, Lecture[]>();
            for (const section of fetchedSections) {
                const lecturesQuery = query(collection(db, 'courses', courseId as string, 'sections', section.id, 'lectures'), orderBy('order'));
                const lecturesSnap = await getDocs(lecturesQuery);
                const lectures = lecturesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Lecture));
                allLecturesMap.set(section.id, lectures);
            }
            setLecturesMap(allLecturesMap);

            // Set initial active lesson
            if (!activeLesson) {
                const lastLessonId = progressDoc?.lastLessonId;
                let lessonToStart: Lecture | null = null;
                if(lastLessonId) {
                    for (const lectures of Array.from(allLecturesMap.values())) {
                        const found = lectures.find(l => l.id === lastLessonId);
                        if (found) {
                            lessonToStart = found;
                            break;
                        }
                    }
                }
                if (!lessonToStart && fetchedSections.length > 0) {
                   const firstSectionId = fetchedSections[0].id;
                   const firstSectionLectures = allLecturesMap.get(firstSectionId);
                   if (firstSectionLectures && firstSectionLectures.length > 0) {
                       lessonToStart = firstSectionLectures[0];
                   }
                }
                setActiveLesson(lessonToStart);
            }
             setPageLoading(false);
        };

        fetchCurriculum();
    }, [courseLoading, courseId, db, progressDoc, activeLesson, handleLessonClick]);
    
    const { totalLessons, completedLessons, progressPercent } = useMemo(() => {
        const lessons = Array.from(lecturesMap.values()).flat();
        const total = lessons.length;
        // In a real app, completed lessons would come from user progress data
        const completed = progressDoc?.progressPercent ? Math.floor(total * (progressDoc.progressPercent / 100)) : 0;
        return {
            totalLessons: total,
            completedLessons: completed,
            progressPercent: progressDoc?.progressPercent || 0,
        };
    }, [lecturesMap, progressDoc]);


    if (isUserLoading || courseLoading || enrollmentLoading || progressLoading || pageLoading) {
        return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
    }
    
    return (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] h-screen bg-slate-900 text-white">
            {/* Main Content */}
            <main className="flex flex-col h-screen overflow-y-auto">
                <header className="flex items-center gap-2 p-2 border-b border-slate-700 bg-slate-900 sticky top-0 z-10">
                    <Button variant="ghost" size="icon" onClick={() => router.push('/mes-formations')}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <span className="font-semibold text-sm truncate">{course?.title}</span>
                </header>
                
                <div className="aspect-video bg-black flex items-center justify-center">
                    {activeLesson?.videoUrl ? (
                         <ReactPlayer
                            url={activeLesson.videoUrl}
                            width="100%"
                            height="100%"
                            controls
                            playing
                            config={{ youtube: { playerVars: { origin: typeof window !== 'undefined' ? window.location.origin : '' } } }}
                        />
                    ) : (
                        <div className="text-center text-slate-400">
                            <PlayCircle className="h-12 w-12 mx-auto mb-2" />
                            <p>Sélectionnez une leçon pour commencer.</p>
                        </div>
                    )}
                </div>
                
                <div className="p-4 sm:p-6">
                    <h1 className="text-xl sm:text-2xl font-bold">{activeLesson?.title || "Bienvenue dans votre cours"}</h1>
                    
                     <Tabs defaultValue="description" className="w-full mt-4">
                        <TabsList className="grid w-full grid-cols-3 dark:bg-slate-800 dark:border-slate-700">
                            <TabsTrigger value="description">Description</TabsTrigger>
                            <TabsTrigger value="resources">Ressources</TabsTrigger>
                            <TabsTrigger value="q-a">Q&R</TabsTrigger>
                        </TabsList>
                        <TabsContent value="description" className="mt-4 text-sm text-slate-300 leading-relaxed">
                            {course?.description || "Aucune description pour ce cours."}
                        </TabsContent>
                        <TabsContent value="resources" className="mt-4">
                           {resourcesLoading ? (
                                <Skeleton className="h-20 w-full" />
                           ) : resources && resources.length > 0 ? (
                               <div className="space-y-2">
                                   {resources.map(res => <ResourceItem key={res.id} resource={res} />)}
                               </div>
                           ) : (
                                <p className="text-sm text-center text-slate-500 py-8">Aucune ressource pour ce cours.</p>
                           )}
                        </TabsContent>
                        <TabsContent value="q-a" className="mt-4">
                             <Button asChild><Link href={`/questions-reponses/${courseId}`}><MessageSquare className="mr-2 h-4 w-4"/> Poser une question</Link></Button>
                        </TabsContent>
                    </Tabs>
                </div>
            </main>

            {/* Sidebar */}
            <aside className="hidden lg:flex flex-col h-screen">
                 <CoursePlayerSidebar 
                    course={course}
                    sections={sections}
                    lecturesMap={lecturesMap}
                    activeLessonId={activeLesson?.id || null}
                    onLessonClick={handleLessonClick}
                    progressPercent={progressPercent}
                    isLoading={pageLoading}
                    totalLessons={totalLessons}
                    completedLessons={completedLessons}
                 />
            </aside>
        </div>
    );
}

    