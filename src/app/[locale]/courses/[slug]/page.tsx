
'use client';

/**
 * @fileOverview Lecteur de cours Ndara Afrique V2 (Design Qwen Immersif).
 * ✅ DESIGN : Immersion totale, fond #050505, Drawer latéral Android.
 * ✅ FONCTIONNEL : Progression temps réel, IA Mathias intégrée.
 * ✅ RÉSOLU : Bug d'affichage de la durée (le "0" parasite).
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
    X,
    ShieldCheck,
    Bookmark,
    FileVideo,
    FileText as FilePdf,
    Sparkles
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
import { Badge } from '@/components/ui/badge';
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

  const currentIndices = useMemo(() => {
      if (!activeLecture) return { section: 0, lesson: 0 };
      let lectureCount = 0;
      for (let i = 0; i < sections.length; i++) {
          const sectionLectures = lecturesMap.get(sections[i].id) || [];
          const idx = sectionLectures.findIndex(l => l.id === activeLecture.id);
          if (idx !== -1) {
              return { section: i + 1, lesson: lectureCount + idx + 1 };
          }
          lectureCount += sectionLectures.length;
      }
      return { section: 0, lesson: 0 };
  }, [sections, lecturesMap, activeLecture]);

  const isLoading = isLoadingContent || courseLoading;

  if (isLoading) return <div className="h-screen bg-[#050505] flex items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;

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

      <div className="flex flex-col h-screen bg-[#050505] overflow-hidden font-sans relative">
        <div className="grain-overlay" />
        
        <header className="absolute top-0 left-0 right-0 z-40 flex items-center justify-between px-4 py-4 safe-area-pt">
            <button onClick={() => router.back()} className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/60 transition active:scale-90">
                <ArrowLeft className="h-5 w-5" />
            </button>
            <button onClick={() => setIsCurriculumOpen(true)} className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/60 transition active:scale-90">
                <List className="h-5 w-5" />
            </button>
        </header>

        <main className="flex-1 flex flex-col min-h-0 relative z-10">
            <div className="bg-black relative aspect-video shadow-2xl overflow-hidden flex-shrink-0">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gray-800 z-30">
                    <div 
                        className="h-full bg-primary transition-all duration-1000 shadow-[0_0_15px_rgba(16,185,129,0.6)]" 
                        style={{ width: `${courseProgress?.progressPercent || 0}%` }} 
                    />
                </div>

                {activeLecture ? (
                    activeLecture.type === 'video' ? (
                        activeLecture.contentUrl ? (
                            <BunnyPlayer videoId={activeLecture.contentUrl} />
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center bg-slate-900 p-8 text-center">
                                <FileVideo className="h-12 w-12 text-slate-700 mb-4" />
                                <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Vidéo en cours de traitement...</p>
                            </div>
                        )
                    ) : activeLecture.type === 'youtube' ? (
                        <YoutubePlayer url={activeLecture.contentUrl || ''} />
                    ) : activeLecture.type === 'pdf' ? (
                        <div className="h-full w-full bg-slate-900"><PdfViewerClient fileUrl={activeLecture.contentUrl || ''} /></div>
                    ) : (
                        <div className="h-full flex items-center justify-center bg-slate-900 p-12 text-center text-slate-400">
                            <FileText className="h-16 w-16 mx-auto opacity-20" />
                        </div>
                    )
                ) : (
                    <div className="h-full flex items-center justify-center text-slate-600">
                        <Play className="h-12 w-12 animate-pulse" />
                    </div>
                )}
            </div>

            <ScrollArea className="flex-1">
                <div className="px-4 py-6 space-y-8 pb-32">
                    
                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <Badge className="bg-primary/20 text-primary border border-primary/30 font-black uppercase text-[10px] tracking-widest px-3 py-1 rounded-full certifying-badge">
                                <ShieldCheck size={12} className="mr-1.5" />
                                Certifiant
                            </Badge>
                            {(activeLecture?.duration ?? 0) > 0 && (
                                <span className="text-slate-500 text-[10px] font-black font-mono">
                                    {activeLecture?.duration}:00 MIN
                                </span>
                            )}
                        </div>
                        <h1 className="text-2xl font-black text-white leading-tight uppercase tracking-tight">
                            {activeLecture?.title}
                        </h1>
                        <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">
                            Section {currentIndices.section} • Leçon {currentIndices.lesson}
                        </p>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                        <Button 
                            onClick={handleMarkComplete}
                            disabled={completedLessons.includes(activeLecture?.id || '')}
                            className={cn(
                                "w-full h-16 rounded-[2rem] font-black uppercase text-xs tracking-[0.15em] transition-all shadow-xl active:scale-95",
                                completedLessons.includes(activeLecture?.id || '') 
                                    ? "bg-emerald-500/10 text-emerald-500 border-none opacity-100" 
                                    : "bg-primary text-slate-950 hover:bg-primary/90"
                            )}
                        >
                            {completedLessons.includes(activeLecture?.id || '') ? (
                                <><CheckCircle2 className="mr-2 h-5 w-5" /> Leçon validée</>
                            ) : (
                                "Valider la leçon"
                            )}
                        </Button>
                        <Button 
                            variant="outline" 
                            onClick={() => setShowQuestionModal(true)} 
                            className="w-full h-16 rounded-[2rem] bg-slate-900 border-white/5 font-black uppercase text-xs tracking-[0.15em] text-white gap-2 shadow-lg active:scale-95"
                        >
                            <Bot className="h-5 w-5 text-primary" />
                            Aide Mathias
                        </Button>
                    </div>

                    <div className="bg-slate-900/50 border border-white/5 rounded-[2rem] p-6 space-y-4 shadow-xl">
                        <h2 className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">À propos de cette leçon</h2>
                        <div className="text-slate-400 text-sm leading-relaxed font-medium">
                            {activeLecture?.textContent ? (
                                <div dangerouslySetInnerHTML={{ __html: activeLecture.textContent }} />
                            ) : activeLecture?.description ? (
                                <p>{activeLecture.description}</p>
                            ) : (
                                <p>Maîtrisez les concepts fondamentaux abordés dans ce module à travers cette session d'apprentissage Ndara.</p>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center justify-around gap-4 py-2">
                        <CircularOptionBtn icon={StickyNote} label="Notes" />
                        <CircularOptionBtn icon={Share2} label="Partager" />
                        <CircularOptionBtn icon={Download} label="Télécharger" />
                        <CircularOptionBtn icon={Bookmark} label="Favoris" />
                    </div>
                </div>
            </ScrollArea>
        </main>

        <div className={cn(
            "fixed inset-0 z-[100] transition-all duration-500",
            isCurriculumOpen ? "bg-black/80 backdrop-blur-sm opacity-100" : "opacity-0 pointer-events-none"
        )} onClick={() => setIsCurriculumOpen(false)} />
        
        <div className={cn(
            "fixed top-0 right-0 h-screen w-full max-w-[320px] bg-slate-900 z-[101] border-l border-white/10 shadow-2xl transition-transform duration-500 ease-in-out",
            isCurriculumOpen ? "translate-x-0" : "translate-x-full"
        )}>
            <div className="flex flex-col h-full safe-area-pt">
                <header className="p-6 border-b border-white/5 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-black text-white uppercase tracking-tight">Programme</h2>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-primary text-[10px] font-black">{courseProgress?.progressPercent || 0}%</span>
                            <div className="w-20 h-1 bg-slate-800 rounded-full overflow-hidden">
                                <div className="h-full bg-primary" style={{ width: `${courseProgress?.progressPercent || 0}%` }} />
                            </div>
                        </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => setIsCurriculumOpen(false)} className="rounded-full h-10 w-10 text-slate-500">
                        <X className="h-6 w-6" />
                    </Button>
                </header>

                <ScrollArea className="flex-1">
                    <div className="p-2 space-y-6 pb-20">
                        {sections.map((section, idx) => (
                            <div key={section.id} className="space-y-1">
                                <h3 className="px-4 py-2 font-black text-[10px] uppercase tracking-widest text-slate-500">
                                    Section {idx + 1}: {section.title}
                                </h3>
                                <div className="space-y-0.5 mt-1">
                                    {(lecturesMap.get(section.id) || []).map(lecture => {
                                        const isActive = activeLecture?.id === lecture.id;
                                        const isDone = completedLessons.includes(lecture.id);
                                        return (
                                            <button 
                                                key={lecture.id}
                                                onClick={() => { setActiveLecture(lecture); setIsCurriculumOpen(false); }}
                                                className={cn(
                                                    "w-full text-left p-4 flex items-center gap-4 transition-all rounded-2xl border-l-4",
                                                    isActive ? "bg-primary/10 border-primary" : "border-transparent hover:bg-white/5"
                                                )}
                                            >
                                                {isDone ? (
                                                    <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                                                ) : (
                                                    <PlayCircle className={cn("h-5 w-5 shrink-0", isActive ? "text-primary" : "text-slate-700")} />
                                                )}
                                                <div className="flex-1 min-w-0">
                                                    <p className={cn("text-sm font-bold truncate", isActive ? "text-white" : "text-slate-400")}>{lecture.title}</p>
                                                    {(lecture.duration ?? 0) > 0 && <p className="text-[9px] font-black uppercase text-slate-600 tracking-tighter mt-0.5">{lecture.duration}:00</p>}
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
            </div>
        </div>
      </div>
    </>
  );
}

function CircularOptionBtn({ icon: Icon, label }: { icon: any, label: string }) {
    return (
        <button className="flex flex-col items-center gap-2 group active:scale-90 transition-transform">
            <div className="w-14 h-14 bg-slate-900 border border-white/5 rounded-full flex items-center justify-center text-gray-500 group-hover:text-primary group-hover:border-primary/20 transition-colors shadow-lg">
                <Icon className="h-6 w-6" />
            </div>
            <span className="text-[8px] font-black uppercase text-slate-600 tracking-widest">{label}</span>
        </button>
    );
}

export default function CoursePlayerPage() {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center bg-[#050505]"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>}>
      <CoursePlayerPageContent />
    </Suspense>
  );
}
