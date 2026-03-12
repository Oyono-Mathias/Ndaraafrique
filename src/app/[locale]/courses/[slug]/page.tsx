'use client';

/**
 * @fileOverview Lecteur de cours Ndara Afrique.
 * Gère l'affichage des leçons, la progression, et les discussions en temps réel.
 * ✅ HYBRIDE : BunnyPlayer pour Premium, YoutubePlayer pour externe.
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
import { Loader2, Bot, Play, MessageSquare, Clock, Send, ShieldCheck, User, Reply } from 'lucide-react';
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
  }, [courseId, db, lessonIdFromUrl, courseProgress]);

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

      <div className="flex flex-col h-screen bg-black overflow-hidden font-sans">
        <main className="flex-1 flex flex-col min-h-0 bg-[#050505] overflow-y-auto">
          <div className="bg-black flex flex-col justify-center min-h-[40vh] lg:min-h-[60vh]">
            {activeLecture ? (
              <div className="w-full max-w-6xl mx-auto">
                {activeLecture.type === 'video' ? (
                  <BunnyPlayer videoId={activeLecture.contentUrl || ''} />
                ) : activeLecture.type === 'youtube' ? (
                  <YoutubePlayer url={activeLecture.contentUrl || ''} />
                ) : activeLecture.type === 'pdf' ? (
                  <div className="h-[75vh] w-full bg-slate-900 lg:rounded-2xl overflow-hidden"><PdfViewerClient fileUrl={activeLecture.contentUrl || ''} /></div>
                ) : (
                  <div className="p-6 md:p-12 lg:p-16 text-slate-300 prose prose-invert max-w-4xl mx-auto">
                    <h2 className="text-3xl font-black text-white mb-8 border-b border-white/5 pb-6">{activeLecture.title}</h2>
                    <div dangerouslySetInnerHTML={{ __html: activeLecture.textContent || '' }} />
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-12 text-center text-slate-500">
                <Play className="h-16 w-16 mb-4 opacity-20 animate-pulse" />
                <h3 className="text-xl font-bold uppercase tracking-widest">Sélectionnez une leçon</h3>
              </div>
            )}
          </div>

          <div className="p-4 lg:p-6 bg-[#0a0a0a] border-y border-white/5 flex flex-col sm:flex-row justify-between items-center gap-4 sticky top-0 z-40 backdrop-blur-xl">
            <div className="flex-1 min-w-0">
              <h1 className="text-lg lg:text-xl font-black text-white truncate uppercase tracking-tight">{activeLecture?.title}</h1>
              <p className="text-[10px] font-bold text-primary uppercase tracking-[0.2em] mt-1">{course?.title}</p>
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <Button variant="outline" className="h-11 rounded-xl bg-slate-900 border-slate-800 text-slate-400 hover:text-white font-bold uppercase text-[10px] tracking-widest" onClick={() => setShowQuestionModal(true)}><MessageSquare className="mr-2 h-4 w-4" /> Poser une question</Button>
              {activeLecture && (
                <Button onClick={handleMarkComplete} disabled={completedLessons.includes(activeLecture.id)} className={cn("h-11 px-8 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all shadow-xl shadow-primary/20", completedLessons.includes(activeLecture.id) ? "bg-green-500/10 text-green-500 border-green-500/20" : "bg-primary text-white")}>
                  {completedLessons.includes(activeLecture.id) ? <ShieldCheck className="mr-2 h-4 w-4"/> : null}
                  {completedLessons.includes(activeLecture.id) ? "Validée" : "Terminer la leçon"}
                </Button>
              )}
            </div>
          </div>

          <div className="p-6 lg:p-12 max-w-4xl mx-auto w-full space-y-10">
              <header className="space-y-2">
                  <h2 className="text-2xl font-black text-white uppercase tracking-tight flex items-center gap-3"><MessageSquare className="text-primary" />Questions des étudiants</h2>
                  <p className="text-slate-500 text-sm font-medium">Interagissez avec la communauté et vos formateurs.</p>
              </header>
              <div className="space-y-6">
                  {lessonQuestions.length > 0 ? (
                      lessonQuestions.map(q => (
                          <div key={q.id} className="bg-slate-900/50 border border-slate-800 rounded-[2rem] p-6 space-y-6 shadow-xl animate-in fade-in duration-500">
                              <div className="flex items-start gap-4">
                                  <Avatar className="h-10 w-10 border border-white/10"><AvatarImage src={q.studentAvatarUrl} /><AvatarFallback className="bg-slate-800 text-slate-500 font-bold">{q.studentName?.charAt(0)}</AvatarFallback></Avatar>
                                  <div className="flex-1">
                                      <div className="flex justify-between items-baseline mb-1">
                                          <p className="font-bold text-slate-200">{q.studentName}</p>
                                          <span className="text-[10px] font-black uppercase text-slate-600 tracking-widest">{q.createdAt && (q.createdAt as any).toDate ? format((q.createdAt as any).toDate(), 'dd MMM HH:mm', { locale: fr }) : '...'}</span>
                                      </div>
                                      <p className="text-slate-400 text-sm leading-relaxed italic">"{q.questionText}"</p>
                                  </div>
                              </div>
                              {q.replies?.map((reply: any, idx: number) => (
                                  <div key={idx} className="flex items-start gap-3 bg-primary/5 p-4 rounded-2xl border border-primary/10 ml-8">
                                      <div className="p-2 bg-primary/20 rounded-xl"><Bot className="h-4 w-4 text-primary" /></div>
                                      <div><p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-1">{reply.instructorName}</p><p className="text-sm text-slate-300 leading-relaxed">{reply.message}</p></div>
                                  </div>
                              ))}
                              {isInstructor && (
                                  <div className="pt-4 border-t border-white/5 flex gap-2">
                                      <Input placeholder="Votre réponse d'expert..." className="h-11 bg-slate-950 border-slate-800 rounded-xl text-xs" value={replyText[q.id] || ''} onChange={(e) => setReplyText(prev => ({ ...prev, [q.id]: e.target.value }))} />
                                      <Button size="sm" className="h-11 rounded-xl bg-primary text-white font-black px-4" disabled={isReplying === q.id || !replyText[q.id]?.trim()} onClick={() => handleReply(q.id, q.studentId)}>{isReplying === q.id ? <Loader2 className="h-4 w-4 animate-spin"/> : <Reply className="h-4 w-4" />}</Button>
                                  </div>
                              )}
                          </div>
                      ))
                  ) : (
                      <div className="py-20 text-center bg-slate-900/20 border-2 border-dashed border-slate-800 rounded-[2.5rem] opacity-30 flex flex-col items-center">
                          <MessageSquare className="h-12 w-12 mb-4 text-slate-600" />
                          <p className="text-sm font-black uppercase tracking-widest text-slate-500">Soyez le premier à poser une question</p>
                      </div>
                  )}
              </div>
          </div>
        </main>

        <aside className="w-full lg:w-[350px] flex-shrink-0 bg-[#0f0f0f] border-t lg:border-t-0 lg:border-l border-white/5 flex flex-col h-[50vh] lg:h-full">
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
