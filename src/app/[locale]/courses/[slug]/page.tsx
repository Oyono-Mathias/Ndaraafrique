
'use client';

/**
 * @fileOverview Lecteur de cours Ndara Afrique V2 (Qwen Integrated).
 * ✅ TEMPS RÉEL : Progression et questions synchronisées.
 * ✅ DESIGN : Immersion totale, Android-first, accents Ocre.
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
import { Loader2, Bot, Play, MessageSquare, Clock, Send, ShieldCheck, User, Reply, Sparkles, ChevronLeft } from 'lucide-react';
import { CertificateModal } from '@/components/modals/certificate-modal';
import { AskQuestionModal } from '@/components/modals/ask-question-modal';
import { YoutubePlayer } from '@/components/ui/youtube-player';
import { BunnyPlayer } from '@/components/ui/bunny-player';
import type { Course, Section, Lecture, NdaraUser, CourseProgress, Quiz } from '@/lib/types';
import { cn } from '@/lib/utils';
import { CourseSidebar } from '@/components/CourseSidebar'; 
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { PdfViewerClient } from '@/components/ui/PdfViewerClient';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { replyToLessonQuestion } from '@/actions/qnaActions';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

function CoursePlayerPageContent() {
  const { slug: courseId } = useParams();
  const searchParams = useSearchParams();
  const lessonIdFromUrl = searchParams.get('lesson');
  
  const { user, currentUser, role } = useRole();
  const db = getFirestore();
  const { toast } = useToast();
  const router = useRouter();

  const [sections, setSections] = useState<Section[]>([]);
  const [lecturesMap, setLecturesMap] = useState<Map<string, Lecture[]>>(new Map());
  const [activeLecture, setActiveLecture] = useState<Lecture | null>(null);
  const [showCertificateModal, setShowCertificateModal] = useState(false);
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [isLoadingContent, setIsLoadingContent] = useState(true);
  
  const [lessonQuestions, setLessonQuestions] = useState<any[]>([]);
  const [replyText, setReplyText] = useState<{ [key: string]: string }>({});
  const [isReplying, setIsReplying] = useState<string | null>(null);

  const courseRef = useMemo(() => courseId ? doc(db, 'courses', courseId as string) : null, [db, courseId]);
  const { data: course, isLoading: courseLoading } = useDoc<Course>(courseRef);
  
  const instructorRef = useMemo(() => course?.instructorId ? doc(db, 'users', course.instructorId) : null, [course, db]);
  const { data: instructor } = useDoc<NdaraUser>(instructorRef);

  const progressRef = useMemo(() => user ? doc(db, 'course_progress', `${user.uid}_${courseId}`) : null, [user, db, courseId]);
  const { data: courseProgress, isLoading: progressLoading } = useDoc<CourseProgress>(progressRef);
  
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
        if (!startLecture && (courseProgress as any)?.lastLessonId) {
            for (const list of lMap.values()) {
                const found = list.find((l: Lecture) => l.id === (courseProgress as any).lastLessonId);
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
  }, [courseId, db, lessonIdFromUrl, (courseProgress as any)?.lastLessonId]);

  useEffect(() => {
      if (!activeLecture?.id) return;
      const unsub = onSnapshot(query(collection(db, 'lesson_questions'), where('lessonId', '==', activeLecture.id), orderBy('createdAt', 'desc')), (snap) => {
          setLessonQuestions(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });
      return () => unsub();
  }, [activeLecture?.id, db]);

  const totalLecturesCount = useMemo(() => Array.from(lecturesMap.values()).reduce((acc, curr) => acc + curr.length, 0), [lecturesMap]);

  const handleMarkComplete = async () => {
    if (!user || !activeLecture || !course || !progressRef || totalLecturesCount === 0) return;
    const completed = (courseProgress as any)?.completedLessons || [];
    if (!completed.includes(activeLecture.id)) {
      const updated = [...completed, activeLecture.id];
      const percent = Math.round((updated.length / totalLecturesCount) * 100);
      try {
        await setDoc(progressRef, { userId: user.uid, courseId, courseTitle: course.title, courseCover: course.imageUrl || '', progressPercent: percent, completedLessons: updated, lastLessonId: activeLecture.id, lastLessonTitle: activeLecture.title, updatedAt: serverTimestamp() }, { merge: true });
        await setDoc(doc(db, 'enrollments', `${user.uid}_${courseId}`), { progress: percent, lastAccessedAt: serverTimestamp() }, { merge: true });
        toast({ title: "Leçon terminée !" });
        if (percent >= 100) setShowCertificateModal(true);
      } catch (e) { toast({ variant: 'destructive', title: "Erreur progression" }); }
    }
  };

  const handleReply = async (questionId: string, studentId: string) => {
      const text = replyText[questionId];
      if (!text?.trim() || !currentUser || isReplying) return;
      setIsReplying(questionId);
      const result = await replyToLessonQuestion({ questionId, instructorId: currentUser.uid, instructorName: currentUser.fullName, message: text, studentId });
      if (result.success) { setReplyText(prev => ({ ...prev, [questionId]: '' })); toast({ title: "Réponse envoyée !" }); }
      setIsReplying(null);
  };

  const isLoading = isLoadingContent || courseLoading || progressLoading;

  if (isLoading) return <div className="h-screen bg-slate-950 flex items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;

  const completedLessons = (courseProgress as any)?.completedLessons || [];
  const isInstructor = role === 'instructor' || role === 'admin';

  return (
    <>
      <CertificateModal isOpen={showCertificateModal} onClose={() => setShowCertificateModal(false)} courseName={course?.title || ''} studentName={currentUser?.fullName || ''} instructorName={instructor?.fullName || 'Oyono Mathias'} completionDate={new Date()} certificateId={`${user?.uid}_${courseId}`} courseId={(courseId as string)} userId={user?.uid || ''} />
      <AskQuestionModal isOpen={showQuestionModal} onOpenChange={setShowQuestionModal} courseId={(courseId as string)} courseTitle={course?.title || ''} instructorId={course?.instructorId || ''} lessonId={activeLecture?.id} lessonTitle={activeLecture?.title} />

      <div className="flex flex-col h-screen bg-black overflow-hidden font-sans selection:bg-primary/30">
        
        {/* Barre de Progression Top */}
        <div className="h-1 w-full bg-slate-900 z-[60]">
            <div className="h-full bg-primary transition-all duration-1000 shadow-[0_0_10px_hsl(var(--primary))]" style={{ width: `${(courseProgress as any)?.progressPercent || 0}%` }} />
        </div>

        <main className="flex-1 flex flex-col min-h-0 bg-[#050505] overflow-y-auto custom-scrollbar relative">
          
          {/* Header Mobile / Navigation */}
          <div className="lg:hidden p-4 flex items-center gap-4 bg-[#0a0a0a] border-b border-white/5 sticky top-0 z-[50]">
              <Button variant="ghost" size="icon" onClick={() => router.back()} className="text-white"><ChevronLeft /></Button>
              <h1 className="text-sm font-black uppercase truncate tracking-tight">{activeLecture?.title}</h1>
          </div>

          <div className="bg-black flex flex-col justify-center min-h-[40vh] lg:min-h-[65vh] relative group">
            {activeLecture ? (
              <div className="w-full max-w-6xl mx-auto lg:p-4">
                {activeLecture.type === 'video' ? (
                  <BunnyPlayer videoId={activeLecture.contentUrl || ''} />
                ) : activeLecture.type === 'youtube' ? (
                  <YoutubePlayer url={activeLecture.contentUrl || ''} />
                ) : activeLecture.type === 'pdf' ? (
                  <div className="h-[75vh] w-full bg-slate-900 lg:rounded-2xl overflow-hidden shadow-2xl border border-white/5"><PdfViewerClient fileUrl={activeLecture.contentUrl || ''} /></div>
                ) : (
                  <div className="p-6 md:p-12 lg:p-20 text-slate-300 prose prose-invert max-w-4xl mx-auto animate-in fade-in duration-1000">
                    <h2 className="text-4xl font-black text-white mb-10 border-b border-white/5 pb-8 uppercase tracking-tight">{activeLecture.title}</h2>
                    <div className="text-lg leading-relaxed space-y-6" dangerouslySetInnerHTML={{ __html: activeLecture.textContent || '' }} />
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-12 text-center text-slate-500">
                <Play className="h-16 w-16 mb-4 opacity-20 animate-pulse" />
                <h3 className="text-xl font-bold uppercase tracking-[0.3em]">Sélectionnez une leçon</h3>
              </div>
            )}
          </div>

          <div className="p-4 lg:p-8 bg-[#0a0a0a] border-y border-white/5 flex flex-col sm:flex-row justify-between items-center gap-6 sticky top-0 z-40 backdrop-blur-2xl">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                  <span className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">En cours de visionnage</span>
              </div>
              <h1 className="text-xl lg:text-3xl font-black text-white truncate uppercase tracking-tighter">{activeLecture?.title}</h1>
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <Button variant="outline" className="h-14 rounded-2xl bg-slate-900 border-slate-800 text-slate-400 hover:text-white font-black uppercase text-[10px] tracking-widest transition-all" onClick={() => setShowQuestionModal(true)}><MessageSquare className="mr-2 h-4 w-4" /> Question</Button>
              {activeLecture && (
                <Button onClick={handleMarkComplete} disabled={completedLessons.includes(activeLecture.id)} className={cn("h-14 px-10 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all shadow-2xl shadow-primary/20", completedLessons.includes(activeLecture.id) ? "bg-green-500/10 text-green-500 border-green-500/20" : "bg-primary text-white active:scale-95")}>
                  {completedLessons.includes(activeLecture.id) ? <ShieldCheck className="mr-2 h-4 w-4"/> : null}
                  {completedLessons.includes(activeLecture.id) ? "Validée" : "Terminer la leçon"}
                </Button>
              )}
            </div>
          </div>

          <div className="p-6 lg:p-16 max-w-4xl mx-auto w-full space-y-16 pb-32">
              <header className="space-y-4">
                  <h2 className="text-3xl font-black text-white uppercase tracking-tighter flex items-center gap-4">
                      <div className="p-3 bg-primary/10 rounded-2xl"><MessageSquare className="text-primary h-6 w-6" /></div>
                      Discussions Live
                  </h2>
                  <p className="text-slate-500 text-lg font-medium italic">Interagissez avec vos collègues et votre formateur expert.</p>
              </header>

              <div className="space-y-8">
                  {lessonQuestions.length > 0 ? (
                      lessonQuestions.map(q => (
                          <div key={q.id} className="bg-slate-900/40 border border-white/5 rounded-[2.5rem] p-8 space-y-8 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-700 hover:border-primary/20 transition-colors">
                              <div className="flex items-start gap-5">
                                  <Avatar className="h-14 w-14 border-2 border-primary/20 shadow-xl"><AvatarImage src={q.studentAvatarUrl} className="object-cover" /><AvatarFallback className="bg-slate-800 text-slate-500 font-black">{q.studentName?.charAt(0)}</AvatarFallback></Avatar>
                                  <div className="flex-1 min-w-0">
                                      <div className="flex justify-between items-baseline mb-2">
                                          <p className="font-black text-white text-base uppercase tracking-tight">{q.studentName}</p>
                                          <span className="text-[10px] font-black uppercase text-slate-600 tracking-widest">{q.createdAt && (q.createdAt as any).toDate ? format((q.createdAt as any).toDate(), 'dd MMM HH:mm', { locale: fr }) : '...'}</span>
                                      </div>
                                      <p className="text-slate-300 text-base leading-relaxed italic font-medium">"{q.questionText}"</p>
                                  </div>
                              </div>
                              {q.replies?.map((reply: any, idx: number) => (
                                  <div key={idx} className="flex items-start gap-4 bg-primary/5 p-6 rounded-3xl border border-primary/10 ml-8 md:ml-12 shadow-inner">
                                      <div className="p-3 bg-primary/20 rounded-2xl shrink-0"><Bot className="h-5 w-5 text-primary" /></div>
                                      <div>
                                          <p className="text-[10px] font-black text-primary uppercase tracking-[0.25em] mb-2">{reply.instructorName}</p>
                                          <p className="text-slate-200 text-sm leading-relaxed font-medium">{reply.message}</p>
                                      </div>
                                  </div>
                              ))}
                              {isInstructor && (
                                  <div className="pt-6 border-t border-white/5 flex gap-3 ml-8 md:ml-12">
                                      <Input placeholder="Votre réponse d'expert..." className="h-14 bg-slate-950 border-white/10 rounded-2xl text-sm focus-visible:ring-primary/30" value={replyText[q.id] || ''} onChange={(e) => setReplyText(prev => ({ ...prev, [q.id]: e.target.value }))} />
                                      <Button size="icon" className="h-14 w-14 rounded-2xl bg-primary text-white shadow-xl shadow-primary/20" disabled={isReplying === q.id || !replyText[q.id]?.trim()} onClick={() => handleReply(q.id, q.studentId)}>{isReplying === q.id ? <Loader2 className="h-5 w-5 animate-spin"/> : <Reply className="h-5 w-5" />}</Button>
                                  </div>
                              )}
                          </div>
                      ))
                  ) : (
                      <div className="py-24 text-center bg-slate-900/20 border-2 border-dashed border-white/5 rounded-[3rem] opacity-30 flex flex-col items-center group hover:opacity-50 transition-opacity">
                          <MessageSquare className="h-16 w-16 mb-6 text-slate-700" />
                          <p className="text-lg font-black uppercase tracking-[0.3em] text-slate-500">Posez la première question</p>
                      </div>
                  )}
              </div>
          </div>
        </main>

        <aside className="w-full lg:w-[380px] flex-shrink-0 bg-[#0f0f0f] border-t lg:border-t-0 lg:border-l border-white/5 flex flex-col h-[50vh] lg:h-full z-[60] shadow-2xl">
          <CourseSidebar course={course} sections={sections} lecturesMap={lecturesMap} quizzes={quizzes || []} activeLecture={activeLecture} onLessonClick={(l) => setActiveLecture(l)} completedLessons={completedLessons} />
        </aside>
      </div>
    </>
  );
}

export default function CoursePlayerPage() {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center bg-black"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
      <CoursePlayerPageContent />
    </Suspense>
  );
}
