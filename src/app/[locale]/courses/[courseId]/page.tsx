
'use client';

/**
 * @fileOverview Lecteur de cours haute performance.
 * Gère la lecture vidéo, l'affichage PDF, le texte riche, 
 * le tracking de progression et l'assistance IA Mathias.
 */

export const dynamic = 'force-dynamic';

import { useState, useMemo, useEffect, useCallback, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
  setDoc,
  arrayUnion
} from 'firebase/firestore';
import dynamic_next from 'next/dynamic';

import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, CheckCircle, Bot, Play, Info } from 'lucide-react';
import { CertificateModal } from '@/components/modals/certificate-modal';
import type { Course, Section, Lecture, NdaraUser, Quiz } from '@/lib/types';
import { cn } from '@/lib/utils';
import { CourseSidebar } from '@/components/CourseSidebar'; 
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { PdfViewerClient } from '@/components/ui/PdfViewerClient';

const ReactPlayer = dynamic_next(() => import('react-player/lazy'), { ssr: false });

const VideoPlaceholder = () => (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-slate-900/50">
        <div className="p-6 bg-primary/10 rounded-full mb-6">
            <Play className="h-16 w-16 text-primary animate-pulse" />
        </div>
        <h3 className="text-2xl font-bold text-white italic">"Bara ala, Tonga na ndara"</h3>
        <p className="text-slate-400 max-w-sm mt-3 text-lg leading-relaxed">
            Prêt à transformer vos ambitions en succès ? Sélectionnez une leçon à gauche pour commencer.
        </p>
    </div>
);

function CoursePlayerPageContent() {
  const { courseId } = useParams();
  const { user, currentUser } = useRole();
  const db = getFirestore();
  const { toast } = useToast();
  const router = useRouter();

  const [sections, setSections] = useState<Section[]>([]);
  const [lecturesMap, setLecturesMap] = useState<Map<string, Lecture[]>>(new Map());
  const [activeLecture, setActiveLecture] = useState<Lecture | null>(null);
  const [showCertificateModal, setShowCertificateModal] = useState(false);
  const [isLoadingContent, setIsLoadingContent] = useState(true);

  const courseRef = useMemo(() => courseId ? doc(db, 'courses', courseId as string) : null, [db, courseId]);
  const { data: course, isLoading: courseLoading } = useDoc<Course>(courseRef);
  
  const instructorRef = useMemo(() => course?.instructorId ? doc(db, 'users', course.instructorId) : null, [course, db]);
  const { data: instructor, isLoading: instructorLoading } = useDoc<NdaraUser>(instructorRef);

  const progressRef = useMemo(() => user ? doc(db, 'course_progress', `${user.uid}_${courseId}`) : null, [user, db, courseId]);
  const { data: courseProgress, isLoading: progressLoading } = useDoc(progressRef);
  
  const quizzesQuery = useMemo(() => courseId ? query(collection(db, 'quizzes'), where('courseId', '==', courseId)) : null, [db, courseId]);
  const { data: quizzes, isLoading: quizzesLoading } = useCollection<Quiz>(quizzesQuery);

  useEffect(() => {
    if (!courseId) return;
    const fetchCourseContent = async () => {
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
        
        // Auto-select first lecture if none selected
        if (fetchedSections.length > 0 && !activeLecture) {
          const firstSectionId = fetchedSections[0].id;
          const sectionLectures = lecturesData.get(firstSectionId);
          if (sectionLectures && sectionLectures.length > 0) {
            setActiveLecture(sectionLectures[0]);
          }
        }
      } catch (error) {
        console.error("Error fetching course content:", error);
      } finally {
        setIsLoadingContent(false);
      }
    };
    fetchCourseContent();
  }, [courseId, db, activeLecture]);
  
  const totalLecturesCount = useMemo(() => {
    return Array.from(lecturesMap.values()).reduce((acc, current) => acc + current.length, 0);
  }, [lecturesMap]);
  
  const handleLessonClick = (lecture: Lecture) => {
    setActiveLecture(lecture);
  }

  const handleLessonComplete = useCallback(async () => {
    if (!user || !activeLecture || !course || !progressRef || totalLecturesCount === 0) return;

    const completedLessons = (courseProgress as any)?.completedLessons || [];

    if (!completedLessons.includes(activeLecture.id)) {
      const updatedCompletedLessons = [...completedLessons, activeLecture.id];
      const newProgress = Math.round((updatedCompletedLessons.length / totalLecturesCount) * 100);

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
      
      toast({ title: "Leçon terminée !", description: "Votre progression a été mise à jour." });

      if (newProgress >= 100) {
        setShowCertificateModal(true);
      }
    } else {
        toast({ title: "Déjà terminée", description: "Vous avez déjà validé cette leçon." });
    }
  }, [user, activeLecture, courseId, totalLecturesCount, course, progressRef, courseProgress, toast]);

  const handleAskMathias = () => {
    if (!activeLecture || !course) return;
    const context = `L'étudiant suit actuellement le cours "${course.title}". La leçon active est "${activeLecture.title}" (Type: ${activeLecture.type}).`;
    router.push(`/student/tutor?lessonId=${activeLecture.id}&context=${encodeURIComponent(context)}`);
  };
  
  const isPageLoading = isLoadingContent || courseLoading || progressLoading || instructorLoading || quizzesLoading;
  
  if (isPageLoading) {
      return (
        <div className="flex h-screen bg-black">
          <Skeleton className="w-80 h-full bg-slate-800" />
          <div className="flex-1 p-4">
            <Skeleton className="w-full aspect-video bg-slate-800" />
            <Skeleton className="h-8 w-1/2 mt-4 bg-slate-800" />
          </div>
        </div>
      );
  }

  const completionDate = (courseProgress as any)?.updatedAt?.toDate?.() || new Date();
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
       <div className="flex flex-col h-screen bg-black">
        <div className="flex flex-1 overflow-hidden">
            {/* --- SIDEBAR ZONE --- */}
            <aside className="w-80 flex-shrink-0 bg-[#121212] flex flex-col border-r border-slate-800 hidden md:flex">
              <CourseSidebar
                course={course}
                sections={sections}
                lecturesMap={lecturesMap}
                quizzes={quizzes || []}
                activeLecture={activeLecture}
                onLessonClick={handleLessonClick}
                completedLessons={completedLessons}
              />
            </aside>

            {/* --- PLAYER ZONE --- */}
            <main className="flex-1 flex flex-col bg-black min-h-0 relative">
                <div className="flex-1 relative overflow-y-auto">
                  {course?.contentType === 'ebook' && course?.ebookUrl ? (
                      <PdfViewerClient fileUrl={course.ebookUrl} />
                  ) : activeLecture?.type === 'video' && activeLecture.contentUrl ? (
                    <div className="absolute inset-0 bg-slate-950">
                       <ReactPlayer
                           url={activeLecture.contentUrl}
                           width="100%"
                           height="100%"
                           controls={true}
                           playing={true}
                           config={{ file: { attributes: { controlsList: 'nodownload' } } }}
                       />
                    </div>
                  ) : activeLecture?.type === 'pdf' && activeLecture.contentUrl ? (
                     <PdfViewerClient fileUrl={activeLecture.contentUrl} />
                  ) : activeLecture?.type === 'text' && activeLecture.textContent ? (
                      <div className="p-8 md:p-12 text-slate-300 prose prose-invert max-w-4xl mx-auto">
                          <div dangerouslySetInnerHTML={{ __html: activeLecture.textContent }} />
                      </div>
                  ) : (
                    <VideoPlaceholder />
                  )}
                </div>

                {/* --- CONTROLS ZONE --- */}
                 <div className="p-6 bg-[#121212] border-t border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-[0_-10px_20px_rgba(0,0,0,0.5)]">
                    <div className="flex-1 overflow-hidden">
                        <h1 className="font-bold text-xl text-white truncate">{activeLecture?.title || 'Chargement du savoir...'}</h1>
                        <div className="flex items-center gap-2 text-sm text-slate-400 mt-1">
                            <Info className="h-3.5 w-3.5" />
                            <span className="truncate">{course?.title}</span>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <Button 
                            variant="secondary" 
                            onClick={handleAskMathias}
                            className="flex-1 sm:flex-none bg-slate-800 hover:bg-slate-700 text-white border-slate-700 h-11"
                        >
                            <Bot className="h-5 w-5 mr-2 text-primary" />
                            Aide de Mathias
                        </Button>
                        
                        {activeLecture && (
                           <Button 
                               onClick={handleLessonComplete} 
                               disabled={completedLessons.includes(activeLecture.id)}
                               className={cn(
                                   "flex-1 sm:flex-none h-11 px-6 font-bold transition-all",
                                   completedLessons.includes(activeLecture.id) 
                                    ? "bg-green-600/20 text-green-400 border border-green-500/30 hover:bg-green-600/30" 
                                    : "bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20"
                               )}
                           >
                               <CheckCircle className="h-5 w-5 mr-2" />
                               {completedLessons.includes(activeLecture.id) ? "Validée" : "Marquer comme terminé"}
                           </Button>
                        )}
                    </div>
                 </div>
            </main>
        </div>
      </div>
    </>
  );
}

export default function CoursePlayerPage() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center bg-black"><Loader2 className="h-8 w-8 animate-spin text-primary"/></div>}>
            <CoursePlayerPageContent />
        </Suspense>
    )
}
