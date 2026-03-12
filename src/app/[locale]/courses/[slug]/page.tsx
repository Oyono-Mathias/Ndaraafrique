
'use client';

/**
 * @fileOverview Lecteur de cours Ndara Afrique V2 (Design Qwen + Firestore Real-time).
 * ✅ DESIGN : Immersion Android-First, Drawer latéral pour le programme.
 * ✅ TEMPS RÉEL : Progression et états synchronisés via onSnapshot.
 */

import { useState, useMemo, useEffect, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useDoc, useCollection } from '@/firebase';
import { useRole } from '@/context/RoleContext';
import {
  doc,
  getFirestore,
  collection,
  query,
  getDocs,
  orderBy,
  serverTimestamp,
  setDoc,
  where,
  onSnapshot,
  collectionGroup
} from 'firebase/firestore';

import { Skeleton } from '@/components/ui/skeleton';
import { 
    Loader2, 
    Bot, 
    Play, 
    MessageSquare, 
    ArrowLeft, 
    List, 
    Download, 
    CheckCircle2, 
    Clock, 
    FileText, 
    Share2, 
    StickyNote,
    PlayCircle,
    Lock,
    ChevronRight,
    X,
    ShieldCheck
} from 'lucide-react';
import { CertificateModal } from '@/components/modals/certificate-modal';
import { AskQuestionModal } from '@/components/modals/ask-question-modal';
import { YoutubePlayer } from '@/components/ui/youtube-player';
import { BunnyPlayer } from '@/components/ui/bunny-player';
import type { Course, Section, Lecture, NdaraUser, CourseProgress, Quiz } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { PdfViewerClient } from '@/components/ui/PdfViewerClient';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import Link from 'next/link';

function CoursePlayerPageContent() {
  const { slug: courseId } = useParams();
  const searchParams = useSearchParams();
  const lessonIdFromUrl = searchParams.get('lesson');
  
  const { user, currentUser } = useRole();
  const db = getFirestore();
  const { toast } = useToast();
  const router = useRouter();

  const [sections, setSections] = useState<Section[]>([]);
  const [lecturesMap, setLecturesMap] = useState<Map<string, Lecture[]>>(new Map());
  const [activeLecture, setActiveLecture] = useState<Lecture | null>(null);
  const [showCertificateModal, setShowCertificateModal] = useState(false);
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [isCurriculumOpen, setIsCurriculumOpen] = useState(false);
  const [isLoadingContent, setIsLoadingContent] = useState(true);

  const courseRef = useMemo(() => courseId ? doc(db, 'courses', courseId as string) : null, [db, courseId]);
  const { data: course, isLoading: courseLoading } = useDoc<Course>(courseRef);
  
  const instructorRef = useMemo(() => course?.instructorId ? doc(db, 'users', course.instructorId) : null, [course, db]);
  const { data: instructor } = useDoc<NdaraUser>(instructorRef);

  const progressRef = useMemo(() => user ? doc(db, 'course_progress', `${user.uid}_${courseId}`) : null, [user, db, courseId]);
  const [courseProgress, setCourseProgress] = useState<CourseProgress | null>(null);

  // Écouteur temps réel pour la progression
  useEffect(() => {
    if (!progressRef) return;
    const unsub = onSnapshot(progressRef, (snap) => {
        if (snap.exists()) setCourseProgress(snap.data() as CourseProgress);
    });
    return () => unsub();
  }, [progressRef]);

  const quizzesQuery = useMemo(() => 
    courseId ? query(collectionGroup(db, 'quizzes'), where('courseId', '==', courseId)) : null, 
    [db, courseId]
  );
  const { data: quizzes } = useCollection<Quiz>(quizzesQuery);

  useEffect(() => {
    if (!courseId) return;
    const fetchCurriculum = async () => {
      setIsLoadingContent(true);
      try {
        const sectionsSnap = await getDocs(query(collection(db, 'courses', courseId as string, 'sections'), orderBy('order')));
        const fetchedSections = sectionsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Section));
        setSections(fetchedSections);

        const lMap = new Map<string, Lecture[]>();
        for (const section of fetchedSections) {
          const lSnap = await getDocs(query(collection(db, 'courses', courseId as string, 'sections', section.id, 'lectures'), orderBy('order')));
          lMap.set(section.id, lSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Lecture)));
        }
        setLecturesMap(lMap);
        
        let startLecture: Lecture | null = null;
        if (lessonIdFromUrl) {
            for (const list of lMap.values()) {
                const found = list.find((l: Lecture) => l.id === lessonIdFromUrl);
                if (found) { startLecture = found; break; }
            }
        }
        if (!startLecture && courseProgress?.lastLessonId) {
            for (const list of lMap.values()) {
                const found = list.find((l: Lecture) => l.id === courseProgress.lastLessonId);
                if (found) { startLecture = found; break; }
            }
        }
        if (!startLecture && fetchedSections.length > 0) {
            const firstSectionLectures = lMap.get(fetchedSections[0].id);
            if (firstSectionLectures && firstSectionLectures.length > 0) startLecture = firstSectionLectures[0];
        }
        if (startLecture) setActiveLecture(startLecture);
      } catch (e) { console.error(e); } finally { setIsLoadingContent(false); }
    };
    fetchCurriculum();
  }, [courseId, db, lessonIdFromUrl, courseProgress?.lastLessonId]);

  const totalLecturesCount = useMemo(() => Array.from(lecturesMap.values()).reduce((acc, curr) => acc + curr.length, 0), [lecturesMap]);

  const handleMarkComplete = async () => {
    if (!user || !activeLecture || !course || !progressRef || totalLecturesCount === 0) return;
    const completed = courseProgress?.completedLessons || [];
    if (!completed.includes(activeLecture.id)) {
      const updated = [...completed, activeLecture.id];
      const percent = Math.round((updated.length / totalLecturesCount) * 100);
      try {
        await setDoc(progressRef, { 
            userId: user.uid, 
            courseId, 
            courseTitle: course.title, 
            courseCover: course.imageUrl || '', 
            progressPercent: percent, 
            completedLessons: updated, 
            lastLessonId: activeLecture.id, 
            lastLessonTitle: activeLecture.title, 
            updatedAt: serverTimestamp() 
        }, { merge: true });
        
        await setDoc(doc(db, 'enrollments', `${user.uid}_${courseId}`), { 
            progress: percent, 
            lastAccessedAt: serverTimestamp() 
        }, { merge: true });
        
        toast({ title: "Leçon validée !" });
        if (percent >= 100) setShowCertificateModal(true);
      } catch (e) { toast({ variant: 'destructive', title: "Erreur progression" }); }
    }
  };

  const currentLessonIndex = useMemo(() => {
      if (!activeLecture) return 0;
      let count = 0;
      for (const section of sections) {
          const sectionLectures = lecturesMap.get(section.id) || [];
          const idx = sectionLectures.findIndex(l => l.id === activeLecture.id);
          if (idx !== -1) return count + idx + 1;
          count += sectionLectures.length;
      }
      return 0;
  }, [sections, lecturesMap, activeLecture]);

  const isLoading = isLoadingContent || courseLoading;

  if (isLoading) return <div className="h-screen bg-slate-950 flex items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;

  const completedLessons = courseProgress?.completedLessons || [];

  return (
    <>
      <CertificateModal 
        isOpen={showCertificateModal} 
        onClose={() => setShowCertificateModal(false)} 
        courseName={course?.title || ''} 
        studentName={currentUser?.fullName || ''} 
        instructorName={instructor?.fullName || 'Expert Ndara'} 
        completionDate={new Date()} 
        certificateId={`${user?.uid}_${courseId}`} 
        courseId={(courseId as string)} 
        userId={user?.uid || ''} 
      />
      
      <AskQuestionModal 
        isOpen={showQuestionModal} 
        onOpenChange={setShowQuestionModal} 
        courseId={(courseId as string)} 
        courseTitle={course?.title || ''} 
        instructorId={course?.instructorId || ''} 
        lessonId={activeLecture?.id} 
        lessonTitle={activeLecture?.title} 
      />

      <div className="flex flex-col h-screen bg-white dark:bg-slate-950 overflow-hidden font-sans">
        
        {/* --- TOP BAR (Android Style) --- */}
        <header className="bg-white dark:bg-slate-900 shadow-sm sticky top-0 z-40 safe-area-pt">
            <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                    <button onClick={() => router.back()} className="w-10 h-10 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition active:scale-90">
                        <ArrowLeft className="h-5 w-5 text-slate-600 dark:text-slate-300" />
                    </button>
                    <div className="flex-1 min-w-0">
                        <h1 className="font-black text-slate-900 dark:text-white text-xs uppercase truncate tracking-tight">{course?.title}</h1>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Leçon {currentLessonIndex} / {totalLecturesCount}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button className="w-10 h-10 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition relative group">
                        <Download className="h-5 w-5 text-slate-600 dark:text-slate-300" />
                        <span className="sr-only">Télécharger</span>
                    </button>
                    <button onClick={() => setIsCurriculumOpen(true)} className="w-10 h-10 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition active:scale-90">
                        <List className="h-5 w-5 text-slate-600 dark:text-slate-300" />
                    </button>
                </div>
            </div>
            {/* Barre de Progression Fine */}
            <div className="h-1 bg-slate-100 dark:bg-slate-800">
                <div className="h-full bg-primary transition-all duration-1000 shadow-[0_0_10px_hsl(var(--primary))]" style={{ width: `${courseProgress?.progressPercent || 0}%` }} />
            </div>
        </header>

        <main className="flex-1 overflow-y-auto no-scrollbar">
            {/* --- VIDEO / CONTENT PLAYER --- */}
            <div className="bg-black relative aspect-video shadow-2xl overflow-hidden">
                {activeLecture ? (
                    activeLecture.type === 'video' ? (
                        <BunnyPlayer videoId={activeLecture.contentUrl || ''} />
                    ) : activeLecture.type === 'youtube' ? (
                        <YoutubePlayer url={activeLecture.contentUrl || ''} />
                    ) : activeLecture.type === 'pdf' ? (
                        <div className="h-full w-full bg-slate-900"><PdfViewerClient fileUrl={activeLecture.contentUrl || ''} /></div>
                    ) : (
                        <div className="h-full flex items-center justify-center bg-slate-900 p-12 text-center text-slate-400">
                            <div className="space-y-4">
                                <FileText className="h-16 w-16 mx-auto opacity-20" />
                                <p className="text-sm font-bold uppercase tracking-widest">Contenu textuel (Déroulez pour lire)</p>
                            </div>
                        </div>
                    )
                ) : (
                    <div className="h-full flex items-center justify-center text-slate-600">
                        <Play className="h-12 w-12 animate-pulse" />
                    </div>
                )}
            </div>

            {/* --- LESSON INFO --- */}
            <div className="bg-white dark:bg-slate-900 px-4 py-6 border-b border-slate-100 dark:border-white/5 space-y-6">
                <div className="space-y-2">
                    <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight leading-snug">{activeLecture?.title}</h2>
                    <div className="flex items-center gap-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                        <span className="flex items-center gap-1.5"><Clock className="h-3 w-3" /> {activeLecture?.duration || 15}:00</span>
                        <span className="flex items-center gap-1.5"><ShieldCheck className="h-3 w-3 text-emerald-500" /> Certifiant</span>
                    </div>
                </div>

                <div className="flex gap-3">
                    <Button 
                        onClick={handleMarkComplete}
                        disabled={completedLessons.includes(activeLecture?.id || '')}
                        className={cn(
                            "flex-1 h-14 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all shadow-xl active:scale-95",
                            completedLessons.includes(activeLecture?.id || '') 
                                ? "bg-emerald-500/10 text-emerald-500 border-none opacity-100" 
                                : "bg-primary text-white"
                        )}
                    >
                        {completedLessons.includes(activeLecture?.id || '') ? <CheckCircle2 className="mr-2 h-4 w-4" /> : null}
                        {completedLessons.includes(activeLecture?.id || '') ? "Terminé" : "Valider la leçon"}
                    </Button>
                    <Button variant="outline" onClick={() => setShowQuestionModal(true)} className="flex-1 h-14 rounded-2xl border-slate-200 dark:border-slate-800 font-black uppercase text-[10px] tracking-widest gap-2">
                        <MessageSquare className="h-4 w-4" />
                        Aide Mathias
                    </Button>
                </div>
            </div>

            {/* --- ABOUT LESSON --- */}
            <div className="bg-white dark:bg-slate-950 p-6 space-y-8 pb-32">
                <section className="space-y-4">
                    <h3 className="text-[10px] font-black uppercase text-primary tracking-[0.3em]">À propos de cette leçon</h3>
                    <div className="prose prose-sm dark:prose-invert max-w-none text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
                        {activeLecture?.textContent ? (
                            <div dangerouslySetInnerHTML={{ __html: activeLecture.textContent }} />
                        ) : (
                            <p>Maîtrisez les concepts fondamentaux abordés dans ce module à travers cette session d'apprentissage Ndara.</p>
                        )}
                    </div>
                </section>

                <section className="space-y-4">
                    <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-[0.3em]">Options & Outils</h3>
                    <div className="grid grid-cols-2 gap-3">
                        <button className="flex flex-col items-center justify-center p-4 bg-slate-100 dark:bg-slate-900 rounded-2xl gap-2 active:scale-95 transition-all">
                            <StickyNote className="h-5 w-5 text-slate-500" />
                            <span className="text-[10px] font-bold uppercase text-slate-600">Prendre Note</span>
                        </button>
                        <button className="flex flex-col items-center justify-center p-4 bg-slate-100 dark:bg-slate-900 rounded-2xl gap-2 active:scale-95 transition-all">
                            <Share2 className="h-5 w-5 text-slate-500" />
                            <span className="text-[10px] font-bold uppercase text-slate-600">Partager</span>
                        </button>
                    </div>
                </section>
            </div>
        </main>

        {/* --- CURRICULUM PANEL (Drawer) --- */}
        <div className={cn(
            "fixed inset-0 z-[100] transition-opacity duration-300",
            isCurriculumOpen ? "bg-black/60 opacity-100" : "opacity-0 pointer-events-none"
        )} onClick={() => setIsCurriculumOpen(false)} />
        
        <div className={cn(
            "fixed top-0 right-0 h-screen w-full max-w-[380px] bg-white dark:bg-slate-900 z-[101] shadow-2xl transition-transform duration-500 ease-in-out",
            isCurriculumOpen ? "translate-x-0" : "translate-x-full"
        )}>
            <div className="flex flex-col h-full">
                <header className="p-6 border-b dark:border-white/5 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50 safe-area-pt">
                    <div>
                        <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Programme</h2>
                        <p className="text-[10px] font-bold text-primary uppercase tracking-widest mt-1">{courseProgress?.progressPercent || 0}% complété</p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => setIsCurriculumOpen(false)} className="rounded-full h-10 w-10">
                        <X className="h-6 w-6" />
                    </Button>
                </header>

                <ScrollArea className="flex-1">
                    <div className="p-2 space-y-6">
                        {sections.map((section, idx) => (
                            <div key={section.id} className="space-y-1">
                                <div className="px-4 py-3 bg-slate-100/50 dark:bg-white/5 rounded-xl flex justify-between items-center">
                                    <h3 className="font-black text-[10px] uppercase tracking-widest text-slate-500">
                                        <span className="text-primary mr-2">0{idx+1}</span> {section.title}
                                    </h3>
                                </div>
                                <div className="space-y-0.5 mt-1">
                                    {(lecturesMap.get(section.id) || []).map(lecture => {
                                        const isActive = activeLecture?.id === lecture.id;
                                        const isDone = completedLessons.includes(lecture.id);
                                        return (
                                            <button 
                                                key={lecture.id}
                                                onClick={() => { setActiveLecture(lecture); setIsCurriculumOpen(false); }}
                                                className={cn(
                                                    "w-full text-left p-4 flex items-center gap-4 transition-all rounded-xl border-l-4",
                                                    isActive ? "bg-primary/5 border-primary" : "border-transparent hover:bg-slate-50 dark:hover:bg-white/5"
                                                )}
                                            >
                                                {isDone ? (
                                                    <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                                                ) : (
                                                    <PlayCircle className={cn("h-5 w-5 shrink-0", isActive ? "text-primary" : "text-slate-300 dark:text-slate-700")} />
                                                )}
                                                <div className="flex-1 min-w-0">
                                                    <p className={cn("text-sm font-bold truncate", isActive ? "text-primary" : "text-slate-700 dark:text-slate-300")}>{lecture.title}</p>
                                                    <p className="text-[9px] font-black uppercase text-slate-400 tracking-tighter mt-0.5">{lecture.duration || 10}:00 min</p>
                                                </div>
                                                {isActive && <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
                
                <div className="p-6 border-t dark:border-white/5 bg-slate-50 dark:bg-slate-900/80 text-center">
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.4em]">Ndara Afrique Engine v2.0</p>
                </div>
            </div>
        </div>
      </div>
    </>
  );
}

export default function CoursePlayerPage() {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center bg-slate-950"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
      <CoursePlayerPageContent />
    </Suspense>
  );
}
