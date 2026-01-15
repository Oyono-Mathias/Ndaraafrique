

'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { useRole } from '@/context/RoleContext';
import { doc, getFirestore, collection, query, orderBy, where, getDocs, updateDoc, serverTimestamp, arrayUnion } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { CheckCircle, Lock, PlayCircle, BookOpen, ArrowLeft, Loader2, FileText, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Course, Section, Lecture, Enrollment } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import 'plyr/dist/plyr.css';
import { useToast } from '@/hooks/use-toast';
import dynamic from 'next/dynamic';
import '@react-pdf-viewer/core/lib/styles/index.css';
import '@react-pdf-viewer/default-layout/lib/styles/index.css';
import { PdfViewerSkeleton } from '@/components/ui/PdfViewerClient';
import Link from 'next/link';
import { CourseCompletionModal } from '@/components/modals/course-completion-modal';


const ReactPlayer = dynamic(() => import('react-player'), { ssr: false });
const PdfViewerClient = dynamic(() => import('@/components/ui/PdfViewerClient').then(mod => mod.PdfViewerClient), { 
    ssr: false,
    loading: () => <PdfViewerSkeleton />
});


const VideoPlayer = ({ videoUrl, onEnded }: { videoUrl?: string; onEnded?: () => void }) => {
    
    if (!videoUrl) {
        return (
            <div className="aspect-video w-full bg-slate-900 flex items-center justify-center rounded-lg">
                <p className="text-white">Sélectionnez une leçon pour commencer.</p>
            </div>
        );
    }

    return (
       <div className="aspect-video w-full bg-black rounded-lg overflow-hidden video-wrapper shadow-2xl min-h-[200px] relative z-10">
         <ReactPlayer 
            key={videoUrl}
            url={videoUrl} 
            onEnded={onEnded} 
            width="100%" 
            height="100%" 
            controls 
            playing={true}
            playsinline={true}
            config={{
                youtube: {
                    playerVars: { 
                        origin: typeof window !== 'undefined' ? window.location.origin : 'https://ndara-afrique.web.app',
                        autoplay: 1,
                    }
                }
            }}
          />
       </div>
    );
};


const CourseSidebar = ({ courseId, activeLesson, onLessonClick, isEnrolled, completedLessons, allLectures }: { courseId: string, activeLesson: Lecture | null, onLessonClick: (lesson: Lecture) => void, isEnrolled: boolean, completedLessons: string[], allLectures: Map<string, Lecture[]> }) => {
    const db = getFirestore();
    const sectionsQuery = useMemoFirebase(() => query(collection(db, 'courses', courseId, 'sections'), orderBy('order')), [db, courseId]);
    const { data: sections, isLoading: sectionsLoading } = useCollection<Section>(sectionsQuery);
    
    // Effect to set the first lesson as active by default
    useEffect(() => {
        if (sections && sections.length > 0 && allLectures.size > 0 && !activeLesson) {
            const firstSectionId = sections[0].id;
            const firstSectionLectures = allLectures.get(firstSectionId);
            if (firstSectionLectures && firstSectionLectures.length > 0) {
                const firstLesson = firstSectionLectures[0];
                 if (isEnrolled || firstLesson.isFreePreview) {
                    onLessonClick(firstLesson);
                 }
            }
        }
    }, [sections, allLectures, activeLesson, onLessonClick, isEnrolled]);

    if (sectionsLoading) {
        return <Skeleton className="h-full w-full dark:bg-slate-800" />;
    }
    
    if (!sections || sections.length === 0) {
        return (
            <Card className="dark:bg-slate-900/50 dark:border-slate-800">
                <CardContent className="p-4 text-center text-muted-foreground text-sm dark:text-slate-400">
                    Le programme du cours n'est pas encore disponible.
                </CardContent>
            </Card>
        );
    }
    
    let totalLessons = 0;
    allLectures.forEach(sectionLectures => {
        totalLessons += sectionLectures.length;
    });

    return (
        <Card className="h-full shadow-lg bg-white dark:bg-slate-900/50 dark:border-slate-800">
            <CardContent className="p-2 h-full">
                <div className="p-2 mb-2">
                    <h2 className="font-bold dark:text-white">Programme du cours</h2>
                    <p className="text-xs text-muted-foreground dark:text-slate-400">{completedLessons.length} / {totalLessons} leçons terminées</p>
                </div>
                 <Accordion type="multiple" defaultValue={sections?.map(s => s.id)} className="w-full">
                    {sections?.map(section => (
                        <AccordionItem value={section.id} key={section.id} className="border-b-0">
                            <AccordionTrigger className="px-3 py-3 text-sm font-semibold hover:no-underline hover:bg-slate-100 dark:hover:bg-slate-800/60 rounded-lg dark:text-slate-200">{section.title}</AccordionTrigger>
                            <AccordionContent className="p-1 space-y-1">
                                {(allLectures.get(section.id) || []).map(lesson => {
                                    const isLocked = !isEnrolled && !lesson.isFreePreview;
                                    const isActive = activeLesson?.id === lesson.id;
                                    const isCompleted = completedLessons.includes(lesson.id);

                                    return (
                                        <button
                                            key={lesson.id}
                                            disabled={isLocked}
                                            onClick={() => onLessonClick(lesson)}
                                            className={cn(
                                                "w-full text-left flex items-center gap-2 p-2 rounded-md text-xs transition-colors",
                                                isActive ? "bg-primary/10 text-primary font-semibold" : "hover:bg-slate-100 dark:hover:bg-slate-800",
                                                isLocked && "text-slate-400 cursor-not-allowed",
                                                isCompleted && !isActive && "text-slate-500"
                                            )}
                                        >
                                            {isCompleted ? <CheckCircle className="h-4 w-4 text-green-500 shrink-0" /> : (isLocked ? <Lock className="h-3 w-3 shrink-0" /> : <PlayCircle className="h-3 w-3 shrink-0" />)}
                                            <span className="flex-1 line-clamp-1 dark:text-slate-300">{lesson.title}</span>
                                            {lesson.isFreePreview && <Badge variant="secondary" className="text-xs">Aperçu</Badge>}
                                        </button>
                                    );
                                })}
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                 </Accordion>
            </CardContent>
        </Card>
    );
};

const CourseContentTabs = ({ courseId }: { courseId: string }) => {
    const db = getFirestore();
    const resourcesQuery = useMemoFirebase(() => query(collection(db, 'resources'), where('courseId', '==', courseId)), [courseId, db]);
    const {data: resources, isLoading} = useCollection(resourcesQuery);

    return (
        <Tabs defaultValue="overview">
            <TabsList>
                <TabsTrigger value="overview">Aperçu</TabsTrigger>
                <TabsTrigger value="qa">Q&R</TabsTrigger>
                <TabsTrigger value="resources">Ressources</TabsTrigger>
            </TabsList>
            <TabsContent value="overview" className="mt-4 prose prose-sm max-w-none dark:prose-invert">
                <p>Bienvenue dans cette leçon. Suivez attentivement la vidéo pour comprendre les concepts clés abordés par l'instructeur.</p>
                <p>N'oubliez pas de consulter l'onglet "Ressources" pour tout matériel supplémentaire et de poser vos questions dans l'onglet "Q&R" si vous êtes bloqué.</p>
            </TabsContent>
            <TabsContent value="qa" className="mt-4">
                <p>Section Questions/Réponses ici...</p>
            </TabsContent>
            <TabsContent value="resources" className="mt-4">
                 {isLoading ? <Skeleton className="h-20 w-full dark:bg-slate-800"/> : (
                    resources && resources.length > 0 ? (
                        <ul className="space-y-2">
                            {resources.map((res: any) => (
                                <li key={res.id}>
                                    <a href={res.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 border dark:border-slate-700">
                                        <FileText className="h-4 w-4 text-primary" />
                                        <span className="text-sm font-medium dark:text-slate-200">{res.title}</span>
                                    </a>
                                </li>
                            ))}
                        </ul>
                    ) : <p className="text-sm text-muted-foreground p-4 border-dashed border rounded-lg text-center dark:border-slate-700">Aucune ressource pour ce cours.</p>
                 )}
            </TabsContent>
        </Tabs>
    )
}

export default function CoursePlayerPage() {
    const { courseId } = useParams();
    const router = useRouter();
    const db = getFirestore();
    const { user, ndaraUser, isUserLoading } = useRole();
    const { toast } = useToast();

    const [activeLesson, setActiveLesson] = useState<Lecture | null>(null);
    const [allLectures, setAllLectures] = useState<Map<string, Lecture[]>>(new Map());
    const [lecturesLoading, setLecturesLoading] = useState(true);
    const [isCompletionModalOpen, setIsCompletionModalOpen] = useState(false);

    const courseRef = useMemoFirebase(() => doc(db, 'courses', courseId as string), [db, courseId]);
    const { data: course, isLoading: courseLoading } = useDoc<Course>(courseRef);

    const sectionsQuery = useMemoFirebase(() => query(collection(db, 'courses', courseId as string, 'sections'), orderBy('order')), [db, courseId]);
    const { data: sections, isLoading: sectionsLoading } = useCollection<Section>(sectionsQuery);
    
    const enrollmentQuery = useMemoFirebase(() => {
        if (!user || !courseId) return null;
        return query(collection(db, 'enrollments'), where('studentId', '==', user.uid), where('courseId', '==', courseId as string));
    }, [db, user, courseId]);
    
    const { data: enrollments, isLoading: enrollmentLoading } = useCollection<Enrollment>(enrollmentQuery);
    const enrollment = useMemo(() => enrollments?.[0], [enrollments]);
    
    const isEnrolled = useMemo(() => !!enrollment || ndaraUser?.role === 'admin', [enrollment, ndaraUser]);
    
    const completedLessons = useMemo(() => enrollment?.completedLessons || [], [enrollment]);

    useEffect(() => {
        if (!sections || sections.length === 0) {
             if(!sectionsLoading) setLecturesLoading(false);
             return;
        }

        setLecturesLoading(true);
        const promises = sections.map(section => {
            const lecturesQuery = query(collection(db, `courses/${courseId}/sections/${section.id}/lectures`), orderBy('title'));
            return getDocs(lecturesQuery);
        });

        Promise.all(promises).then(snapshots => {
            const lecturesMap = new Map<string, Lecture[]>();
            snapshots.forEach((snapshot, index) => {
                const sectionId = sections[index].id;
                const sectionLectures = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Lecture));
                lecturesMap.set(sectionId, sectionLectures);
            });
            setAllLectures(lecturesMap);
            setLecturesLoading(false);
        });

    }, [sections, sectionsLoading, courseId, db]);

    const isLoading = courseLoading || isUserLoading || enrollmentLoading || lecturesLoading;

    // Redirect if not enrolled (and not admin)
    useEffect(() => {
        if (!isLoading && course) {
            if (!isEnrolled) {
                toast({
                    title: "Accès refusé",
                    description: "Vous devez être inscrit à ce cours pour y accéder.",
                    variant: "destructive"
                });
                router.push(`/course/${courseId}`);
                return;
            }

            if (enrollment && course.price > 0 && enrollment.priceAtEnrollment === 0 && ndaraUser?.role !== 'admin') {
                toast({
                    title: "Accès mis à jour",
                    description: "Désolé, la période de gratuité de ce cours est terminée. Le cours est devenu payant, veuillez l'acheter pour continuer votre progression.",
                    variant: "destructive",
                    duration: 10000,
                });
                router.push(`/course/${courseId}`);
                return;
            }
        }
    }, [isLoading, isEnrolled, enrollment, course, courseId, router, toast, ndaraUser]);

    const handleLessonCompletion = async () => {
        if (!enrollment || !activeLesson || !user) return;
    
        const totalLessons = Array.from(allLectures.values()).reduce((acc, val) => acc + val.length, 0);
        let updatedCompletedLessons = [...completedLessons];
    
        if (!completedLessons.includes(activeLesson.id)) {
            updatedCompletedLessons.push(activeLesson.id);
            const newProgress = totalLessons > 0 ? Math.round((updatedCompletedLessons.length / totalLessons) * 100) : 0;
            const enrollmentRef = doc(db, 'enrollments', enrollment.id);
            
            await updateDoc(enrollmentRef, {
                completedLessons: updatedCompletedLessons,
                progress: newProgress,
                lastWatchedLesson: activeLesson.id,
            });

            toast({
                title: "Leçon terminée !",
                description: `Votre progression est maintenant de ${newProgress}%.`,
            });
        }
    
        if (updatedCompletedLessons.length === totalLessons && totalLessons > 0) {
            const q = query(collection(db, 'enrollments'), where('studentId', '==', user.uid), where('progress', '==', 100));
            const completedCoursesSnap = await getDocs(q);
            if (completedCoursesSnap.size === 1 && !ndaraUser?.badges?.includes('pioneer')) {
                const userRef = doc(db, 'users', user.uid);
                await updateDoc(userRef, { badges: arrayUnion('pioneer') });
                toast({
                    title: "Badge débloqué : Pionnier !",
                    description: "Félicitations pour avoir terminé votre premier cours !",
                });
            }

            setIsCompletionModalOpen(true);
        } else {
            handleNextLesson();
        }
    };
    

    const handleNextLesson = () => {
        if (!activeLesson || !sections) return;

        let foundCurrent = false;
        for (const section of sections) {
            const lectures = allLectures.get(section.id) || [];
            for (const lesson of lectures) {
                if (foundCurrent) {
                    setActiveLesson(lesson);
                    return; // Next lesson found and set
                }
                if (lesson.id === activeLesson.id) {
                    foundCurrent = true;
                }
            }
        }
        toast({ title: "Félicitations!", description: "Vous avez terminé la dernière leçon de ce cours." });
    };

    if (isLoading) {
        return (
             <div className="flex flex-col lg:flex-row h-screen bg-slate-100 dark:bg-slate-900">
                <main className="flex-1 p-4 lg:p-6"><Skeleton className="aspect-video w-full rounded-lg dark:bg-slate-800" /></main>
                <aside className="hidden lg:block w-96 border-l p-4 dark:border-slate-800"><Skeleton className="h-full w-full dark:bg-slate-800" /></aside>
            </div>
        );
    }
    
    if (!course) {
        return <div className="p-8 text-center">Cours non trouvé.</div>
    }

    if (!isEnrolled) {
        return <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    const isEbook = course.contentType === 'ebook';

    return (
        <>
            <div className="flex flex-col lg:flex-row h-screen bg-slate-100 dark:bg-slate-900 -m-6">
                {ndaraUser?.role === 'admin' && (
                    <Button asChild className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg" variant="destructive">
                        <Link href={`/instructor/courses/edit/${courseId}`} title="Accès Modérateur">
                            <Shield className="h-6 w-6" />
                        </Link>
                    </Button>
                )}
                <main className="flex-1 flex flex-col p-4 lg:p-6 space-y-6">
                    <div className="flex items-center justify-between">
                        <Button variant="ghost" onClick={() => router.push(`/course/${courseId}`)} className="dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white">
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Retour aux détails du cours
                        </Button>
                    </div>
                    {isEbook ? (
                        <div className="flex-1 w-full bg-slate-900 rounded-lg overflow-hidden">
                            <PdfViewerClient fileUrl={course.ebookUrl || ''} />
                        </div>
                    ) : (
                        <VideoPlayer videoUrl={activeLesson?.videoUrl} onEnded={handleLessonCompletion} />
                    )}
                    <div className="mt-4">
                        <h1 className="text-xl lg:text-2xl font-bold dark:text-white">{isEbook ? course.title : activeLesson?.title || course.title}</h1>
                        {activeLesson && !isEbook ? (
                            <div className="flex justify-between items-center mt-2">
                                <p className="text-slate-500 dark:text-slate-400 text-sm">Leçon actuelle</p>
                                <Button onClick={handleLessonCompletion} size="sm" disabled={completedLessons.includes(activeLesson.id)}>
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    {completedLessons.includes(activeLesson.id) ? 'Terminée' : 'Marquer comme terminée'}
                                </Button>
                            </div>
                        ) : <p className="text-slate-500 dark:text-slate-400 text-sm">{isEbook ? 'Livre Électronique' : 'Bienvenue dans votre cours'}</p>}
                    </div>
                    {!isEbook && (
                        <div className="mt-6 flex-grow bg-white dark:bg-slate-900/50 p-6 rounded-2xl shadow-inner dark:border dark:border-slate-800">
                        <CourseContentTabs courseId={courseId as string}/>
                        </div>
                    )}
                </main>
                {!isEbook && (
                    <aside className="w-full lg:w-96 lg:h-screen border-t lg:border-t-0 lg:border-l shrink-0 bg-white dark:bg-slate-900/50 dark:border-slate-800">
                        <div className="p-4 h-full overflow-y-auto">
                        <CourseSidebar 
                                courseId={courseId as string} 
                                activeLesson={activeLesson} 
                                onLessonClick={setActiveLesson} 
                                isEnrolled={isEnrolled}
                                completedLessons={completedLessons}
                                allLectures={allLectures}
                            />
                        </div>
                    </aside>
                )}
            </div>
            {ndaraUser && course && (
                 <CourseCompletionModal
                    isOpen={isCompletionModalOpen}
                    onClose={() => setIsCompletionModalOpen(false)}
                    studentName={ndaraUser.fullName}
                    courseName={course.title}
                    onDownload={() => router.push('/mes-certificats')}
                    onShare={() => { /* Implement sharing logic */ toast({ title: "Partage bientôt disponible!" })}}
                />
            )}
        </>
    );
}
