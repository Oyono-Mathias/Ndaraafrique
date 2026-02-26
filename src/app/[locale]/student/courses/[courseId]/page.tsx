'use client';

/**
 * @fileOverview Lecteur de cours Ndara Universal.
 * Correction Build Vercel : Ajout des props courseId et userId au CertificateModal.
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
  collectionGroup
} from 'firebase/firestore';
import dynamic from 'next/dynamic';

import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, CheckCircle, Bot, Play, MessageSquare } from 'lucide-react';
import { CertificateModal } from '@/components/modals/certificate-modal';
import { AskQuestionModal } from '@/components/modals/ask-question-modal';
import type { Course, Section, Lecture, NdaraUser, CourseProgress, Quiz } from '@/lib/types';
import { cn } from '@/lib/utils';
import { CourseSidebar } from '@/components/CourseSidebar'; 
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { PdfViewerClient } from '@/components/ui/PdfViewerClient';

const ReactPlayer = dynamic(() => import('react-player/lazy'), { ssr: false });

function CoursePlayerPageContent() {
  const { courseId } = useParams();
  const searchParams = useSearchParams();
  const lessonIdFromUrl = searchParams.get('lesson');
  
  const { user, currentUser } = useRole();
  const db = getFirestore();
  const { toast } = useToast();
  const router = useRouter();

  const [hasWindow, setHasWindow] = useState(false);
  const [sections, setSections] = useState<Section[]>([]);
  const [lecturesMap, setLecturesMap] = useState<Map<string, Lecture[]>>(new Map());
  const [activeLecture, setActiveLecture] = useState<Lecture | null>(null);
  const [showCertificateModal, setShowCertificateModal] = useState(false);
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [isLoadingContent, setIsLoadingContent] = useState(true);

  useEffect(() => {
    setHasWindow(true);
  }, []);

  const courseRef = useMemo(() => courseId ? doc(db, 'courses', courseId as string) : null, [db, courseId]);
  const { data: course, isLoading: courseLoading } = useDoc<Course>(courseRef);
  
  const instructorRef = useMemo(() => course?.instructorId ? doc(db, 'users', course.instructorId) : null, [course, db]);
  const { data: instructor, isLoading: instructorLoading } = useDoc<NdaraUser>(instructorRef);

  const progressRef = useMemo(() => user ? doc(db, 'course_progress', `${user.uid}_${courseId}`) : null, [user, db, courseId]);
  const { data: courseProgress, isLoading: progressLoading } = useDoc<CourseProgress>(progressRef);
  
  const quizzesQuery = useMemo(() => 
    courseId ? query(collectionGroup(db, 'quizzes'), where('courseId', '==', courseId)) : null, 
    [db, courseId]
  );
  const { data: quizzes, isLoading: quizzesLoading } = useCollection<Quiz>(quizzesQuery);

  useEffect(() => {
    if (!courseId) return;
    const fetchCurriculum = async () => {
      setIsLoadingContent(true);
      try {
        const sectionsQuery = query(collection(db, 'courses', courseId as string, 'sections'), orderBy('order'));
        const sectionsSnap = await getDocs(sectionsQuery);
        const fetchedSections = sectionsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Section));
        setSections(fetchedSections);

        const lMap = new Map<string, Lecture[]>();
        for (const section of fetchedSections) {
          const lQuery = query(collection(db, 'courses', courseId as string, 'sections', section.id, 'lectures'), orderBy('order'));
          const lSnap = await getDocs(lQuery);
          lMap.set(section.id, lSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Lecture)));
        }
        setLecturesMap(lMap);
        
        let startLecture: Lecture | null = null;
        if (lessonIdFromUrl) {
            for (const list of lMap.values()) {
                const found = list.find(l => l.id === lessonIdFromUrl);
                if (found) { startLecture = found; break; }
            }
        }
        if (!startLecture && (courseProgress as any)?.lastLessonId) {
            for (const list of lMap.values()) {
                const found = list.find(l => l.id === (courseProgress as any).lastLessonId);
                if (found) { startLecture = found; break; }
            }
        }
        if (!startLecture && fetchedSections.length > 0) {
            const firstSectionLectures = lMap.get(fetchedSections[0].id);
            if (firstSectionLectures && firstSectionLectures.length > 0) {
                startLecture = firstSectionLectures[0];
            }
        }
        if (startLecture) setActiveLecture(startLecture);
      } catch (error) {
        console.error("Error loading curriculum:", error);
      } finally {
        setIsLoadingContent(false);
      }
    };
    fetchCurriculum();
  }, [courseId, db, lessonIdFromUrl, (courseProgress as any)?.lastLessonId]);

  const totalLecturesCount = useMemo(() => {
    return Array.from(lecturesMap.values()).reduce((acc, curr) => acc + curr.length, 0);
  }, [lecturesMap]);

  const handleMarkComplete = async () => {
    if (!user || !activeLecture || !course || !progressRef || totalLecturesCount === 0) return;
    
    const completed = (courseProgress as any)?.completedLessons || [];
    if (!completed.includes(activeLecture.id)) {
      const updated = [...completed, activeLecture.id];
      const percent = Math.round((updated.length / totalLecturesCount) * 100);
      
      try {
        await setDoc(progressRef, {
          userId: user.uid,
          courseId: courseId,
          courseTitle: course.title,
          courseCover: course.imageUrl || '',
          progressPercent: percent,
          completedLessons: updated,
          lastLessonId: activeLecture.id,
          lastLessonTitle: activeLecture.title,
          updatedAt: serverTimestamp(),
        }, { merge: true });

        const enrollmentRef = doc(db, 'enrollments', `${user.uid}_${courseId}`);
        await setDoc(enrollmentRef, {
            progress: percent,
            lastAccessedAt: serverTimestamp()
        }, { merge: true });
        
        toast({ title: "Leçon terminée !", description: "Votre progression est à jour." });
        if (percent >= 100) setShowCertificateModal(true);
      } catch (e) {
        console.error("Error updating progress:", e);
        toast({ variant: 'destructive', title: "Erreur", description: "Impossible de mettre à jour votre progression." });
      }
    }
  };

  const isLoading = isLoadingContent || courseLoading || progressLoading || instructorLoading || quizzesLoading;

  if (isLoading) {
    return (
      <div className="flex flex-col lg:flex-row h-screen bg-slate-950 overflow-hidden">
        <div className="flex-1 p-4 lg:p-8 space-y-4">
          <Skeleton className="w-full aspect-video bg-slate-900 rounded-2xl" />
          <Skeleton className="h-10 w-1/2 bg-slate-900" />
        </div>
        <Skeleton className="w-full lg:w-[350px] h-full bg-slate-900" />
      </div>
    );
  }

  const completedLessons = (courseProgress as any)?.completedLessons || [];

  return (
    <>
      <CertificateModal
        isOpen={showCertificateModal}
        onClose={() => setShowCertificateModal(false)}
        courseName={course?.title || ''}
        studentName={currentUser?.fullName || ''}
        instructorName={instructor?.fullName || 'Oyono Mathias'}
        completionDate={new Date()}
        certificateId={`${user?.uid}_${courseId}`}
        courseId={courseId as string}
        userId={user?.uid || ''}
      />

      <AskQuestionModal 
        isOpen={showQuestionModal}
        onOpenChange={setShowQuestionModal}
        courseId={(courseId as string)}
        courseTitle={course?.title || ''}
        instructorId={course?.instructorId || ''}
      />

      <div className="flex flex-col h-screen bg-black overflow-hidden font-sans">
        <main className="flex-1 flex flex-col min-h-0 bg-[#050505]">
          <div className="flex-1 bg-black flex flex-col justify-center overflow-y-auto">
            {activeLecture ? (
              <div className="w-full max-w-6xl mx-auto px-0 lg:px-4">
                {activeLecture.type === 'video' ? (
                  <div className="relative pt-[56.25%] bg-black shadow-2xl overflow-hidden lg:rounded-2xl">
                    {hasWindow && activeLecture.contentUrl && (
                      <ReactPlayer
                        url={activeLecture.contentUrl}
                        width="100%"
                        height="100%"
                        className="absolute top-0 left-0"
                        controls
                        pip
                        config={{ 
                          file: { 
                            attributes: { controlsList: 'nodownload' },
                            forceVideo: true
                          }
                        }}
                      />
                    )}
                  </div>
                ) : activeLecture.type === 'pdf' ? (
                  <div className="h-[75vh] w-full bg-slate-900 lg:rounded-2xl overflow-hidden">
                    <PdfViewerClient fileUrl={activeLecture.contentUrl || ''} />
                  </div>
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
                <h3 className="text-xl font-bold">Prêt pour votre leçon ?</h3>
                <p className="mt-2">Sélectionnez un chapitre dans le menu à droite.</p>
              </div>
            )}
          </div>

          <div className="p-4 lg:p-6 bg-[#0a0a0a] border-t border-white/5 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-lg lg:text-xl font-black text-white truncate uppercase tracking-tight">
                {activeLecture?.title || 'Chargement...'}
              </h1>
              <p className="text-[10px] font-bold text-primary uppercase tracking-[0.2em] mt-1">{course?.title}</p>
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <Button 
                variant="outline" 
                className="h-11 rounded-xl bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
                onClick={() => setShowQuestionModal(true)}
              >
                <MessageSquare className="mr-2 h-4 w-4" /> Question
              </Button>
              <Button variant="secondary" asChild className="h-11 rounded-xl bg-slate-900 border-slate-800 text-slate-400">
                <a href={`/student/tutor?context=${activeLecture?.id}`}><Bot className="mr-2 h-4 w-4" /> Mathias IA</a>
              </Button>
              {activeLecture && (
                <Button 
                  onClick={handleMarkComplete} 
                  disabled={completedLessons.includes(activeLecture.id)}
                  className={cn(
                    "h-11 px-8 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all",
                    completedLessons.includes(activeLecture.id) ? "bg-green-500/10 text-green-500" : "bg-primary text-white shadow-lg shadow-primary/20"
                  )}
                >
                  {completedLessons.includes(activeLecture.id) ? "Validée" : "Terminer la leçon"}
                </Button>
              )}
            </div>
          </div>
        </main>

        <aside className="w-full lg:w-[350px] flex-shrink-0 bg-[#0f0f0f] border-t lg:border-t-0 lg:border-l border-white/5 flex flex-col h-[50vh] lg:h-full">
          <CourseSidebar 
            course={course} 
            sections={sections} 
            lecturesMap={lecturesMap} 
            quizzes={quizzes || []} 
            activeLecture={activeLecture} 
            onLessonClick={(l) => setActiveLecture(l)}
            completedLessons={completedLessons}
          />
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
