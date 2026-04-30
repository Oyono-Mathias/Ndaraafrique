'use client';

/**
 * @fileOverview Lecteur de cours Ndara Afrique V3.
 * ✅ SÉCURITÉ : Vérification stricte de l'enrollment avant affichage.
 * ✅ PÉDAGOGIE : Blocage de progression si l'exercice (Milestone) n'est pas réussi (Score >= 70%).
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

import { 
    Loader2, 
    Bot, 
    Play, 
    List, 
    Download, 
    CheckCircle2, 
    FileText, 
    Share2, 
    StickyNote,
    PlayCircle,
    X,
    ShieldCheck,
    Bookmark,
    FileVideo,
    ArrowLeft,
    Lock,
    AlertCircle,
    ChevronRight
} from 'lucide-react';
import { CertificateModal } from '@/components/modals/certificate-modal';
import { AskQuestionModal } from '@/components/modals/ask-question-modal';
import { YoutubePlayer } from '@/components/ui/youtube-player';
import { BunnyPlayer } from '@/components/ui/bunny-player';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { PdfViewerClient } from '@/components/ui/PdfViewerClient';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import type { Course, Section, Lecture, CourseProgress, Quiz, Enrollment } from '@/lib/types';

function CoursePlayerPageContent() {
  const { slug: courseId } = useParams();
  const searchParams = useSearchParams();
  const lessonIdFromUrl = searchParams.get('lesson');
  
  const { user, currentUser, isUserLoading } = useRole();
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
  const [isEnrolled, setIsEnrolled] = useState<boolean | null>(null);
  const [isValidationBlocked, setIsValidationBlocked] = useState(false);

  const courseRef = useMemo(() => courseId ? doc(db, 'courses', courseId as string) : null, [db, courseId]);
  const { data: course, isLoading: courseLoading } = useDoc<Course>(courseRef);
  
  const progressRef = useMemo(() => user ? doc(db, 'course_progress', `${user.uid}_${courseId}`) : null, [user, db, courseId]);
  const [courseProgress, setCourseProgress] = useState<CourseProgress | null>(null);

  // 🔄 ÉCOUTEUR TEMPS RÉEL : Progression et Quiz réussis
  useEffect(() => {
    if (!user?.uid || !courseId || !activeLecture) return;

    // Si la leçon demande une validation (Milestone)
    if (activeLecture.requiresValidation && activeLecture.associatedQuizId) {
        const quizSubRef = query(
            collection(db, 'quiz_submissions'),
            where('studentId', '==', user.uid),
            where('quizId', '==', activeLecture.associatedQuizId),
            where('score', '>=', 70)
        );
        
        const unsub = onSnapshot(quizSubRef, (snap) => {
            setIsValidationBlocked(snap.empty);
        });
        return () => unsub();
    } else {
        setIsValidationBlocked(false);
    }
  }, [user?.uid, courseId, activeLecture, db]);

  // 🛡️ SÉCURITÉ : Vérification de l'inscription
  useEffect(() => {
    if (!user || !courseId) return;

    const enrollmentRef = doc(db, 'enrollments', `${user.uid}_${courseId}`);
    const unsub = onSnapshot(enrollmentRef, (snap) => {
        setIsEnrolled(snap.exists());
    });
    return () => unsub();
  }, [user, courseId, db]);

  useEffect(() => {
    if (!progressRef) return;
    const unsub = onSnapshot(progressRef, (snap) => {
        if (snap.exists()) setCourseProgress(snap.data() as CourseProgress);
    });
    return () => unsub();
  }, [progressRef]);

  useEffect(() => {
    if (!courseId || isEnrolled === false) return;
    
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
  }, [courseId, db, lessonIdFromUrl, courseProgress?.lastLessonId, isEnrolled]);

  const totalLecturesCount = useMemo(() => Array.from(lecturesMap.values()).reduce((acc, curr) => acc + curr.length, 0), [lecturesMap]);

  const handleMarkComplete = async () => {
    if (!user || !activeLecture || !course || !progressRef || totalLecturesCount === 0) return;
    
    if (isValidationBlocked) {
        toast({ 
            variant: 'destructive', 
            title: "Validation requise", 
            description: "Vous devez réussir le quiz de ce module (min. 70%) pour continuer." 
        });
        return;
    }

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

  const isLoading = isLoadingContent || courseLoading || isEnrolled === null;

  if (isLoading) return <div className="h-screen bg-[#050505] flex items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;

  if (isEnrolled === false) {
      return (
          <div className="h-screen bg-[#050505] flex flex-col items-center justify-center p-6 text-center">
              <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mb-6">
                  <Lock className="h-10 w-10 text-red-500" />
              </div>
              <h1 className="text-2xl font-black text-white uppercase tracking-tight mb-2">Accès Non Autorisé</h1>
              <p className="text-slate-500 text-sm max-w-xs mx-auto mb-8 font-medium">
                  Vous devez acquérir cette formation pour accéder aux leçons.
              </p>
              <Button onClick={() => router.push(`/course/${courseId}`)} className="h-14 px-8 rounded-2xl bg-primary text-slate-950 font-black uppercase text-[10px] tracking-widest shadow-xl">
                  Voir la vitrine
              </Button>
          </div>
      );
  }

  const completedLessons = courseProgress?.completedLessons || [];

  return (
    <>
      <CertificateModal 
        isOpen={showCertificateModal} 
        onClose={() => setShowCertificateModal(false)} 
        courseName={course?.title || ''} 
        studentName={currentUser?.fullName || ''} 
        instructorName={'Expert Ndara'} 
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
        <header className="absolute top-0 left-0 right-0 z-40 flex items-center justify-between px-4 py-4">
            <button onClick={() => router.back()} className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white">
                <ArrowLeft className="h-5 w-5" />
            </button>
            <button onClick={() => setIsCurriculumOpen(true)} className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white">
                <List className="h-5 w-5" />
            </button>
        </header>

        <main className="flex-1 flex flex-col min-h-0 relative z-10">
            <div className="bg-black relative aspect-video shadow-2xl overflow-hidden flex-shrink-0">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gray-800 z-30">
                    <div 
                        className="h-full bg-primary transition-all duration-1000" 
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
                                <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Vidéo en cours...</p>
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
                            {course?.isAiVerified && (
                                <Badge className="bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 font-black uppercase text-[8px] tracking-widest px-2 py-0.5 rounded-full">
                                    <ShieldCheck size={10} className="mr-1" />
                                    Vérifié par Mathias
                                </Badge>
                            )}
                            {(activeLecture?.duration ?? 0) > 0 && (
                                <span className="text-slate-500 text-[10px] font-black font-mono">
                                    {activeLecture?.duration}:00 MIN
                                </span>
                            )}
                        </div>
                        <h1 className="text-2xl font-black text-white leading-tight uppercase tracking-tight">
                            {activeLecture?.title}
                        </h1>
                    </div>

                    {isValidationBlocked && (
                        <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl flex items-start gap-3 animate-in shake duration-500">
                            <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-bold text-white uppercase tracking-tight">Étape bloquée</p>
                                <p className="text-[10px] text-amber-200/70 font-medium italic mt-0.5 leading-relaxed">
                                    "Réussis le quiz de ce module (min. 70%) pour valider ton savoir et continuer ton parcours."
                                </p>
                                <Button 
                                    size="sm" 
                                    onClick={() => router.push(`/${currentUser?.preferredLanguage || 'fr'}/student/quiz/${activeLecture?.associatedQuizId}`)} 
                                    className="h-8 mt-3 bg-amber-500 text-slate-950 font-black uppercase text-[9px] tracking-widest"
                                >
                                    Lancer le Quiz
                                </Button>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 gap-3">
                        <Button 
                            onClick={handleMarkComplete}
                            disabled={completedLessons.includes(activeLecture?.id || '') || isValidationBlocked}
                            className={cn(
                                "w-full h-16 rounded-[2rem] font-black uppercase text-xs tracking-[0.15em]",
                                completedLessons.includes(activeLecture?.id || '') 
                                    ? "bg-emerald-500/10 text-emerald-500" 
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
                            className="w-full h-16 rounded-[2rem] bg-slate-900 border border-white/5 font-black uppercase text-xs tracking-[0.15em] text-white gap-2"
                        >
                            <Bot className="h-5 w-5 text-primary" />
                            Aide Mathias
                        </Button>
                    </div>

                    <div className="bg-slate-900/50 border border-white/5 rounded-[2rem] p-6 space-y-4">
                        <h2 className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">À propos</h2>
                        <div className="text-slate-400 text-sm leading-relaxed font-medium">
                            {activeLecture?.textContent ? (
                                <div dangerouslySetInnerHTML={{ __html: activeLecture.textContent }} />
                            ) : (
                                <p>{activeLecture?.description || "Module d'apprentissage Ndara."}</p>
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
            "fixed inset-0 z-[100] transition-all",
            isCurriculumOpen ? "bg-black/80 backdrop-blur-sm opacity-100" : "opacity-0 pointer-events-none"
        )} onClick={() => setIsCurriculumOpen(false)} />
        
        <div className={cn(
            "fixed top-0 right-0 h-screen w-full max-w-[320px] bg-slate-900 z-[101] border-l border-white/10 transition-transform duration-500",
            isCurriculumOpen ? "translate-x-0" : "translate-x-full"
        )}>
            <div className="flex flex-col h-full">
                <header className="p-6 border-b border-white/5 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-black text-white uppercase tracking-tight">Programme</h2>
                        <p className="text-primary text-[10px] font-black">{courseProgress?.progressPercent || 0}% complété</p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => setIsCurriculumOpen(false)}>
                        <X className="h-6 w-6" />
                    </Button>
                </header>

                <ScrollArea className="flex-1">
                    <div className="p-2 space-y-6">
                        {sections.map((section, idx) => (
                            <div key={section.id} className="space-y-1">
                                <h3 className="px-4 py-2 font-black text-[10px] uppercase tracking-widest text-slate-500">
                                    Section {idx + 1}: {section.title}
                                </h3>
                                <div className="space-y-0.5">
                                    {(lecturesMap.get(section.id) || []).map((lecture, lIdx, list) => {
                                        const isActive = activeLecture?.id === lecture.id;
                                        const isDone = completedLessons.includes(lecture.id);
                                        
                                        // LOGIQUE DE BLOCAGE SEQUENTIEL
                                        // On vérifie si une leçon précédente demandait une validation non complétée
                                        let isLocked = false;
                                        const allLecturesFlat = Array.from(lecturesMap.values()).flat();
                                        const currentFlatIdx = allLecturesFlat.findIndex(l => l.id === lecture.id);
                                        
                                        for (let i = 0; i < currentFlatIdx; i++) {
                                            const prev = allLecturesFlat[i];
                                            if (prev.requiresValidation && !completedLessons.includes(prev.id)) {
                                                isLocked = true;
                                                break;
                                            }
                                        }

                                        return (
                                            <button 
                                                key={lecture.id}
                                                disabled={isLocked}
                                                onClick={() => { setActiveLecture(lecture); setIsCurriculumOpen(false); }}
                                                className={cn(
                                                    "w-full text-left p-4 flex items-center gap-4 rounded-2xl border-l-4 transition-all",
                                                    isActive ? "bg-primary/10 border-primary" : "border-transparent",
                                                    isLocked ? "opacity-30 grayscale" : "hover:bg-white/5"
                                                )}
                                            >
                                                {isDone ? (
                                                    <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                                                ) : isLocked ? (
                                                    <Lock className="h-5 w-5 text-slate-700 shrink-0" />
                                                ) : (
                                                    <PlayCircle className={cn("h-5 w-5 shrink-0", isActive ? "text-primary" : "text-slate-700")} />
                                                )}
                                                <div className="flex-1 min-w-0">
                                                    <p className={cn("text-sm font-bold truncate", isActive ? "text-white" : "text-slate-400")}>{lecture.title}</p>
                                                </div>
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
        <button className="flex flex-col items-center gap-2 group">
            <div className="w-14 h-14 bg-slate-900 border border-white/5 rounded-full flex items-center justify-center text-gray-500 group-hover:text-primary transition-colors">
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
