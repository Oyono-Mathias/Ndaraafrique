'use client';

/**
 * @fileOverview Lecteur de cours haute performance pour les étudiants.
 * À gauche : Zone de lecture multimédia et contrôles.
 * À droite : Curriculum (sections et leçons) avec état de complétion.
 */

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
  setDoc
} from 'firebase/firestore';
import dynamic from 'next/dynamic';

import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, CheckCircle, Bot, Play, Info, BookOpen } from 'lucide-react';
import { CertificateModal } from '@/components/modals/certificate-modal';
import type { Course, Section, Lecture, NdaraUser, CourseProgress, Quiz } from '@/lib/types';
import { cn } from '@/lib/utils';
import { CourseSidebar } from '@/components/CourseSidebar'; 
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { PdfViewerClient } from '@/components/ui/PdfViewerClient';

// Import dynamique pour éviter les erreurs de SSR sur le lecteur vidéo
const ReactPlayer = dynamic(() => import('react-player/lazy'), { ssr: false });

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

  // 1. Récupération des métadonnées du cours et de l'instructeur
  const courseRef = useMemo(() => courseId ? doc(db, 'courses', courseId as string) : null, [db, courseId]);
  const { data: course, isLoading: courseLoading } = useDoc<Course>(courseRef);
  
  const instructorRef = useMemo(() => course?.instructorId ? doc(db, 'users', course.instructorId) : null, [course, db]);
  const { data: instructor, isLoading: instructorLoading } = useDoc<NdaraUser>(instructorRef);

  // 2. Récupération de la progression de l'étudiant
  const progressRef = useMemo(() => user ? doc(db, 'course_progress', `${user.uid}_${courseId}`) : null, [user, db, courseId]);
  const { data: courseProgress, isLoading: progressLoading } = useDoc<CourseProgress>(progressRef);
  
  const quizzesQuery = useMemo(() => courseId ? query(collection(db, 'quizzes'), where('courseId', '==', courseId)) : null, [db, courseId]);
  const { data: quizzes, isLoading: quizzesLoading } = useCollection<Quiz>(quizzesQuery);

  // 3. Chargement des chapitres et des leçons
  useEffect(() => {
    if (!courseId) return;
    const fetchCourseStructure = async () => {
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
        
        // Sélection automatique de la première leçon si rien n'est sélectionné
        if (fetchedSections.length > 0 && !activeLecture) {
          const firstSection = fetchedSections[0];
          const firstLectures = lecturesData.get(firstSection.id);
          if (firstLectures && firstLectures.length > 0) {
            setActiveLecture(firstLectures[0]);
          }
        }
      } catch (error) {
        console.error("Erreur lors du chargement de la structure du cours:", error);
      } finally {
        setIsLoadingContent(false);
      }
    };
    fetchCourseStructure();
  }, [courseId, db, activeLecture]);
  
  const totalLecturesCount = useMemo(() => {
    return Array.from(lecturesMap.values()).reduce((acc, current) => acc + current.length, 0);
  }, [lecturesMap]);
  
  const handleLessonClick = (lecture: Lecture) => {
    setActiveLecture(lecture);
  }

  // 4. Logique de validation de leçon et progression
  const handleMarkAsCompleted = useCallback(async () => {
    if (!user || !activeLecture || !course || !progressRef || totalLecturesCount === 0) return;

    const completedLessons = courseProgress?.completedLessons || [];

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
      
      toast({ title: "Bravo !", description: "Leçon terminée. Votre progression a été mise à jour." });

      if (newProgress >= 100) {
        setShowCertificateModal(true);
      }
    } else {
        toast({ title: "Leçon déjà validée", description: "Vous avez déjà terminé cette leçon." });
    }
  }, [user, activeLecture, courseId, totalLecturesCount, course, progressRef, courseProgress, toast]);

  // 5. Redirection Mathias avec contexte
  const handleAskMathias = () => {
    if (!activeLecture || !course) return;
    const context = `L'étudiant suit actuellement le cours "${course.title}". La leçon active est "${activeLecture.title}" (ID: ${activeLecture.id}). Aidez-le à comprendre ce sujet spécifiquement.`;
    router.push(`/student/tutor?lessonId=${activeLecture.id}&context=${encodeURIComponent(context)}`);
  };
  
  const isPageLoading = isLoadingContent || courseLoading || progressLoading || instructorLoading || quizzesLoading;
  
  if (isPageLoading) {
      return (
        <div className="flex h-screen bg-slate-950">
          <div className="flex-1 p-8 space-y-4">
            <Skeleton className="w-full aspect-video bg-slate-900 rounded-2xl" />
            <Skeleton className="h-10 w-1/2 bg-slate-900" />
          </div>
          <Skeleton className="w-80 h-full bg-slate-900" />
        </div>
      );
  }

  const completionDate = (courseProgress?.updatedAt as any)?.toDate?.() || new Date();
  const completedLessons = courseProgress?.completedLessons || [];

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
       <div className="flex flex-col h-screen bg-black overflow-hidden">
        <div className="flex flex-1 overflow-hidden">
            
            {/* --- ZONE GAUCHE : LECTEUR ET CONTRÔLES --- */}
            <main className="flex-1 flex flex-col bg-slate-950 min-h-0 relative">
                <div className="flex-1 relative overflow-y-auto">
                  {course?.contentType === 'ebook' && course?.ebookUrl ? (
                      <PdfViewerClient fileUrl={course.ebookUrl} />
                  ) : activeLecture?.type === 'video' && activeLecture.contentUrl ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-black">
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
                      <div className="p-8 md:p-16 text-slate-300 prose prose-invert max-w-4xl mx-auto">
                          <h2 className="text-3xl font-bold text-white mb-8 border-b border-slate-800 pb-4">{activeLecture.title}</h2>
                          <div dangerouslySetInnerHTML={{ __html: activeLecture.textContent }} />
                      </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                        <div className="p-6 bg-primary/10 rounded-full mb-6">
                            <Play className="h-16 w-16 text-primary animate-pulse" />
                        </div>
                        <h3 className="text-2xl font-bold text-white italic">"Bara ala, Tonga na ndara"</h3>
                        <p className="text-slate-400 max-w-sm mt-3 text-lg">
                            Sélectionnez une leçon à droite pour commencer votre apprentissage.
                        </p>
                    </div>
                  )}
                </div>

                {/* --- BARRE DE CONTRÔLES --- */}
                 <div className="p-6 bg-[#0f172a] border-t border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-2xl">
                    <div className="flex-1 overflow-hidden">
                        <h1 className="font-bold text-xl text-white truncate">{activeLecture?.title || 'Démarrage du cours...'}</h1>
                        <div className="flex items-center gap-2 text-sm text-slate-400 mt-1">
                            <BookOpen className="h-3.5 w-3.5" />
                            <span className="truncate">{course?.title}</span>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <Button 
                            variant="secondary" 
                            onClick={handleAskMathias}
                            className="flex-1 sm:flex-none bg-slate-800 hover:bg-slate-700 text-white border-slate-700 h-11 px-6 rounded-xl transition-all active:scale-95"
                        >
                            <Bot className="h-5 w-5 mr-2 text-primary" />
                            Aide de Mathias
                        </Button>
                        
                        {activeLecture && (
                           <Button 
                               onClick={handleMarkAsCompleted} 
                               disabled={completedLessons.includes(activeLecture.id)}
                               className={cn(
                                   "flex-1 sm:flex-none h-11 px-8 rounded-xl font-bold transition-all active:scale-95 shadow-lg",
                                   completedLessons.includes(activeLecture.id) 
                                    ? "bg-green-600/20 text-green-400 border border-green-500/30" 
                                    : "bg-primary hover:bg-primary/90 text-white"
                               )}
                           >
                               <CheckCircle className="h-5 w-5 mr-2" />
                               {completedLessons.includes(activeLecture.id) ? "Validée" : "Terminer la leçon"}
                           </Button>
                        )}
                    </div>
                 </div>
            </main>

            {/* --- ZONE DROITE : CURRICULUM (SIDEBAR) --- */}
            <aside className="w-85 flex-shrink-0 bg-[#111827] flex flex-col border-l border-slate-800 hidden lg:flex">
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

        </div>
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
