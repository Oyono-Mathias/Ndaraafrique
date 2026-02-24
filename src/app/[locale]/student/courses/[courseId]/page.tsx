'use client';

/**
 * @fileOverview Lecteur de cours Ndara Universal.
 * Gère la lecture multimédia (vidéo, PDF, texte) avec conteneur responsive 16:9.
 */

import { useState, useMemo, useEffect, useCallback, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useDoc, useCollection } from '@/firebase';
import { useRole } from '@/context/RoleContext';
import {
  doc,
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  orderBy,
  serverTimestamp,
  setDoc
} from 'firebase/firestore';
import dynamic from 'next/dynamic';

import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, CheckCircle, Bot, Play, BookOpen, AlertCircle, ExternalLink } from 'lucide-react';
import { CertificateModal } from '@/components/modals/certificate-modal';
import type { Course, Section, Lecture, NdaraUser, CourseProgress, Quiz } from '@/lib/types';
import { cn } from '@/lib/utils';
import { CourseSidebar } from '@/components/CourseSidebar'; 
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { PdfViewerClient } from '@/components/ui/PdfViewerClient';

// Import dynamique pour le lecteur vidéo
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
  const [isLoadingContent, setIsLoadingContent] = useState(true);
  const [videoError, setVideoError] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setHasWindow(true);
    }
  }, []);

  const courseRef = useMemo(() => courseId ? doc(db, 'courses', courseId as string) : null, [db, courseId]);
  const { data: course, isLoading: courseLoading } = useDoc<Course>(courseRef);
  
  const instructorRef = useMemo(() => course?.instructorId ? doc(db, 'users', course.instructorId) : null, [course, db]);
  const { data: instructor, isLoading: instructorLoading } = useDoc<NdaraUser>(instructorRef);

  const progressRef = useMemo(() => user ? doc(db, 'course_progress', `${user.uid}_${courseId}`) : null, [user, db, courseId]);
  const { data: courseProgress, isLoading: progressLoading } = useDoc<CourseProgress>(progressRef);
  
  const quizzesQuery = useMemo(() => courseId ? query(collection(db, 'quizzes'), where('courseId', '==', courseId)) : null, [db, courseId]);
  const { data: quizzes, isLoading: quizzesLoading } = useCollection<Quiz>(quizzesQuery);

  useEffect(() => {
    if (!courseId) return;
    const fetchCurriculum = async () => {
      setIsLoadingContent(true);
      try {
        const sectionsQuery = query(collection(db, 'courses', courseId as string, 'sections'), orderBy('order'));
        const sectionsSnapshot = await getDocs(sectionsQuery);
        const fetchedSections = sectionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Section));
        setSections(fetchedSections);

        const lecturesData = new Map<string, Lecture[]>();
        for (const section of fetchedSections) {
          const lecturesQuery = query(collection(db, 'courses', courseId as string, 'sections', section.id, 'lectures'), orderBy('order'));
          const lecturesSnapshot = await getDocs(lecturesQuery);
          lecturesData.set(section.id, lecturesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Lecture)));
        }
        setLecturesMap(lecturesData);
        
        let startLecture: Lecture | null = null;
        if (lessonIdFromUrl) {
            for (const list of lecturesData.values()) {
                const found = list.find(l => l.id === lessonIdFromUrl);
                if (found) { startLecture = found; break; }
            }
        }
        if (!startLecture && (courseProgress as any)?.lastLessonId) {
            for (const list of lecturesData.values()) {
                const found = list.find(l => l.id === (courseProgress as any).lastLessonId);
                if (found) { startLecture = found; break; }
            }
        }
        if (!startLecture && fetchedSections.length > 0) {
            const firstSection = fetchedSections[0];
            const sectionLectures = lecturesData.get(firstSection.id);
            if (sectionLectures && sectionLectures.length > 0) {
                startLecture = sectionLectures[0];
            }
        }
        if (startLecture) setActiveLecture(startLecture);
      } catch (error) {
        console.error("Erreur curriculum:", error);
      } finally {
        setIsLoadingContent(false);
      }
    };
    fetchCurriculum();
  }, [courseId, db, (courseProgress as any)?.lastLessonId, lessonIdFromUrl]);
  
  const totalLecturesCount = useMemo(() => {
    return Array.from(lecturesMap.values()).reduce((acc, current) => acc + current.length, 0);
  }, [lecturesMap]);
  
  const handleLessonClick = (lecture: Lecture) => {
    setVideoError(false);
    setActiveLecture(lecture);
    if (window.innerWidth < 1024) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  const handleMarkAsCompleted = useCallback(async () => {
    if (!user || !activeLecture || !course || !progressRef || totalLecturesCount === 0) return;
    const completedLessons = (courseProgress as any)?.completedLessons || [];
    if (!completedLessons.includes(activeLecture.id)) {
      const updatedCompletedLessons = [...completedLessons, activeLecture.id];
      const newProgress = Math.round((updatedCompletedLessons.length / totalLecturesCount) * 100);
      try {
        await setDoc(progressRef, {
          userId: user.uid,
          courseId: courseId,
          courseTitle: course.title,
          courseCover: course.imageUrl || '',
          progressPercent: newProgress,
          completedLessons: updatedCompletedLessons,
          lastLessonId: activeLecture.id,
          lastLessonTitle: activeLecture.title,
          updatedAt: serverTimestamp(),
        }, { merge: true });
        toast({ title: "Félicitations !", description: "Progression enregistrée." });
        if (newProgress >= 100) setShowCertificateModal(true);
      } catch (e) {
        toast({ variant: "destructive", title: "Erreur", description: "Impossible de sauvegarder votre progression." });
      }
    }
  }, [user, activeLecture, courseId, totalLecturesCount, course, progressRef, courseProgress, toast]);

  if (isLoadingContent || courseLoading || progressLoading || instructorLoading || quizzesLoading) {
      return (
        <div className="flex flex-col lg:flex-row h-screen bg-slate-950 overflow-hidden">
          <div className="flex-1 p-4 lg:p-8 space-y-4">
            <Skeleton className="w-full aspect-video bg-slate-900 rounded-2xl" />
            <Skeleton className="h-10 w-1/2 bg-slate-900" />
          </div>
          <Skeleton className="w-full lg:w-80 h-full bg-slate-900" />
        </div>
      );
  }

  const completionDate = (courseProgress?.updatedAt as any)?.toDate?.() || new Date();
  const completedLessons = (courseProgress as any)?.completedLessons || [];

  return (
    <>
      <CertificateModal
        isOpen={showCertificateModal}
        onClose={() => setShowCertificateModal(false)}
        courseName={course?.title || ''}
        studentName={currentUser?.fullName || ''}
        instructorName={instructor?.fullName || ''}
        completionDate={completionDate}
        certificateId={`${user?.uid}_${courseId}`}
      />
       <div className="flex flex-col lg:flex-row h-screen bg-black overflow-hidden">
            <main className="flex-1 flex flex-col bg-slate-950 min-h-0 relative overflow-y-auto">
                <div className="flex-1 bg-black flex flex-col">
                  {course?.contentType === 'ebook' && course?.ebookUrl ? (
                      <PdfViewerClient fileUrl={course.ebookUrl} />
                  ) : activeLecture?.type === 'video' ? (
                    <div className="w-full max-w-5xl mx-auto bg-black overflow-hidden">
                        <div className="relative pt-[56.25%] bg-black">
                            {hasWindow && activeLecture.contentUrl ? (
                                <ReactPlayer
                                    url={activeLecture.contentUrl}
                                    width="100%"
                                    height="100%"
                                    className="absolute top-0 left-0"
                                    controls={true}
                                    pip={true}
                                    stopOnTerminate={false}
                                    config={{
                                        file: { attributes: { controlsList: 'nodownload', forceVideo: true } }
                                    }}
                                    onError={() => setVideoError(true)}
                                />
                            ) : (
                                <div className="absolute inset-0 flex items-center justify-center text-slate-500">
                                    {videoError ? "Erreur lors de la lecture" : "Chargement du lecteur..."}
                                </div>
                            )}
                        </div>
                    </div>
                  ) : activeLecture?.type === 'pdf' && activeLecture.contentUrl ? (
                     <PdfViewerClient fileUrl={activeLecture.contentUrl} />
                  ) : activeLecture?.type === 'text' && activeLecture.textContent ? (
                      <div className="p-6 md:p-12 lg:p-16 text-slate-300 prose prose-invert max-w-4xl mx-auto">
                          <h2 className="text-2xl md:text-3xl font-bold text-white mb-8 border-b border-slate-800 pb-4">{activeLecture.title}</h2>
                          <div dangerouslySetInnerHTML={{ __html: activeLecture.textContent }} />
                      </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full min-h-[300px] p-8 text-center bg-slate-900/30">
                        <Play className="h-16 w-16 text-primary animate-pulse mb-6" />
                        <h3 className="text-2xl font-bold text-white italic">"Bara ala, Tonga na ndara"</h3>
                        <p className="text-slate-400 mt-3">Sélectionnez une leçon dans le menu pour commencer.</p>
                    </div>
                  )}
                </div>

                 <div className="p-4 lg:p-6 bg-[#0f172a] border-t border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 z-10">
                    <div className="flex-1 overflow-hidden">
                        <h1 className="font-bold text-lg lg:text-xl text-white truncate">{activeLecture?.title || 'Démarrage du cours...'}</h1>
                        <p className="text-xs text-slate-500 mt-1 uppercase font-bold tracking-widest">{course?.title}</p>
                    </div>
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <Button variant="secondary" onClick={() => router.push(`/student/tutor?context=${activeLecture?.id}`)} className="flex-1 sm:flex-none bg-slate-800 h-11 px-6 rounded-xl">
                            <Bot className="h-5 w-5 mr-2 text-primary" /> Aide Mathias
                        </Button>
                        {activeLecture && (
                           <Button onClick={handleMarkAsCompleted} disabled={completedLessons.includes(activeLecture.id)} className={cn("flex-1 sm:flex-none h-11 px-8 rounded-xl font-bold", completedLessons.includes(activeLecture.id) ? "bg-green-600/20 text-green-400" : "bg-primary text-white")}>
                               <CheckCircle className="h-5 w-5 mr-2" /> {completedLessons.includes(activeLecture.id) ? "Terminée" : "Finir la leçon"}
                           </Button>
                        )}
                    </div>
                 </div>
            </main>

            <aside className="w-full lg:w-80 lg:flex-shrink-0 bg-[#111827] flex flex-col border-t lg:border-t-0 lg:border-l border-slate-800 h-auto lg:h-full overflow-y-auto">
              <CourseSidebar course={course || null} sections={sections} lecturesMap={lecturesMap} quizzes={quizzes || []} activeLecture={activeLecture} onLessonClick={handleLessonClick} completedLessons={completedLessons} />
            </aside>
      </div>
    </>
  );
}

export default function CoursePlayerPage() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center bg-slate-950"><Loader2 className="h-8 w-8 animate-spin text-primary"/></div>}>
            <CoursePlayerPageContent />
        </Suspense>
    )
}