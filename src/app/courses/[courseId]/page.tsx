
'use client';

import { useState, useMemo, useEffect, useCallback, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useDoc, useMemoFirebase } from '@/firebase';
import { useRole } from '@/context/RoleContext';
import {
  doc,
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  startAfter,
  QueryDocumentSnapshot,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { Player, Youtube, Vimeo, DefaultUi, DefaultControls } from '@vime/react';
import '@vime/core/themes/default.css';

import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, ArrowLeft, Book, CheckCircle, Award, FileText } from 'lucide-react';
import { CourseCompletionModal } from '@/components/modals/course-completion-modal';
import type { Course, Section, Lecture } from '@/lib/types';
import { cn } from '@/lib/utils';
import { CourseSidebar } from './_components/CourseSidebar';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { PdfViewerClient } from '@/components/ui/PdfViewerClient';

// This is the inner component that uses Suspense features
function CoursePlayerPageContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const courseId = params.courseId as string;
  const router = useRouter();
  const { user, currentUser } = useRole();
  const db = getFirestore();
  const { toast } = useToast();

  const [sections, setSections] = useState<Section[]>([]);
  const [lecturesMap, setLecturesMap] = useState<Map<string, Lecture[]>>(new Map());
  const [activeLecture, setActiveLecture] = useState<Lecture | null>(null);
  const [courseProgress, setCourseProgress] = useState<any>(null);
  
  const [isCompleted, setIsCompleted] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);

  const courseRef = useMemoFirebase(() => courseId ? doc(db, 'courses', courseId) : null, [db, courseId]);
  const { data: course, isLoading: courseLoading } = useDoc<Course>(courseRef);
  
  const isEnrolled = useMemo(() => currentUser?.role === 'admin', [currentUser]);

  // Derived state
  const isEbook = course?.contentType === 'ebook';

  const [isLoading, setIsLoading] = useState(true);

  // Fetch sections and lectures
  useEffect(() => {
    if (!courseId) return;
    const fetchCourseContent = async () => {
      setIsLoading(true);
      const sectionsQuery = query(collection(db, 'courses', courseId, 'sections'), orderBy('order'));
      const sectionsSnapshot = await getDocs(sectionsQuery);
      const fetchedSections = sectionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Section));
      setSections(fetchedSections);

      const lecturesData = new Map<string, Lecture[]>();
      for (const section of fetchedSections) {
        const lecturesQuery = query(collection(db, 'courses', courseId, 'sections', section.id, 'lectures'), orderBy('title'));
        const lecturesSnapshot = await getDocs(lecturesQuery);
        lecturesData.set(section.id, lecturesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Lecture)));
      }
      setLecturesMap(lecturesData);
      
      // Set initial active lecture
      if (fetchedSections.length > 0 && lecturesData.get(fetchedSections[0].id)?.length > 0) {
        setActiveLecture(lecturesData.get(fetchedSections[0].id)![0]);
      }
      setIsLoading(false);
    };
    fetchCourseContent();
  }, [courseId, db]);
  
  const totalLectures = useMemo(() => {
    return Array.from(lecturesMap.values()).flat().length;
  }, [lecturesMap]);
  
  const handleLessonClick = (lecture: Lecture) => {
    setActiveLecture(lecture);
  }

  const handleLessonComplete = useCallback(async () => {
    if (!user || !activeLecture || !course) return;

    const progressRef = doc(db, 'course_progress', `${user.uid}_${courseId}`);
    const progressSnap = await getDoc(progressRef);
    let completedLessons: string[] = [];
    if(progressSnap.exists()){
      completedLessons = progressSnap.data()?.completedLessons || [];
    }

    if (!completedLessons.includes(activeLecture.id)) {
      completedLessons.push(activeLecture.id);
      
      const newProgress = Math.round((completedLessons.length / totalLectures) * 100);

      await setDoc(progressRef, {
        userId: user.uid,
        courseId: courseId,
        courseTitle: course.title,
        courseCover: course.imageUrl || '',
        progressPercent: newProgress,
        completedLessons: completedLessons,
        lastLessonId: activeLecture.id,
        lastLessonTitle: activeLecture.title,
        updatedAt: serverTimestamp(),
      }, { merge: true });

      if (newProgress === 100) {
        setIsCompleted(true);
        setShowCompletionModal(true);
        
        const activityRef = doc(collection(db, `users/${user.uid}/activity`));
        await setDoc(activityRef, {
            userId: user.uid,
            type: 'certificate',
            title: `Vous avez obtenu un certificat !`,
            description: `Félicitations pour avoir terminé le cours "${course.title}".`,
            link: `/mes-certificats`,
            read: false,
            createdAt: serverTimestamp()
        });
      }
    }
  }, [user, activeLecture, courseId, totalLectures, db, course]);
  
  if (isLoading || courseLoading) {
      return (
        <div className="flex h-screen bg-black">
          <Skeleton className="w-80 h-full bg-slate-800" />
          <div className="flex-1 p-4">
            <Skeleton className="w-full aspect-video bg-slate-800" />
            <Skeleton className="h-8 w-1/2 mt-4 bg-slate-800" />
            <Skeleton className="h-20 w-full mt-2 bg-slate-800" />
          </div>
        </div>
      );
  }

  return (
    <>
      <CourseCompletionModal
        isOpen={showCompletionModal}
        onClose={() => setShowCompletionModal(false)}
        courseName={course?.title || ''}
        studentName={currentUser?.fullName}
        onDownload={() => alert('Download certificate')}
        onShare={() => alert('Share certificate')}
      />
       <div className="flex flex-col h-screen bg-black">
        {currentUser?.role === 'admin' && (
            <div className="bg-amber-400 text-black text-center text-sm font-bold p-1">
              Mode Administrateur
            </div>
        )}
        <div className="flex flex-1 overflow-hidden">
            <aside className="w-80 flex-shrink-0 bg-[#121212] flex flex-col">
              <CourseSidebar
                course={course}
                sections={sections}
                lecturesMap={lecturesMap}
                activeLecture={activeLecture}
                onLessonClick={handleLessonClick}
              />
            </aside>
            <main className="flex-1 flex flex-col bg-black">
                <div className="flex-1 relative">
                  {isEbook && course?.ebookUrl ? (
                      <PdfViewerClient fileUrl={course.ebookUrl} />
                  ) : activeLecture?.videoUrl ? (
                      <Player>
                        {(activeLecture.videoUrl.includes('youtube') || activeLecture.videoUrl.includes('youtu.be')) ? (
                           <Youtube videoId={activeLecture.videoUrl.split('v=')[1] || activeLecture.videoUrl.split('/').pop() || ''} />
                        ) : activeLecture.videoUrl.includes('vimeo') ? (
                          <Vimeo videoId={activeLecture.videoUrl.split('/').pop() || ''} />
                        ) : null}
                        <DefaultUi />
                        <DefaultControls hideOnMouseLeave activeDuration={2000} />
                      </Player>
                  ) : (
                    <div className="h-full flex items-center justify-center text-slate-400">
                        Sélectionnez une leçon pour commencer.
                    </div>
                  )}
                </div>
                 <div className="p-4 bg-[#121212] border-t border-slate-800">
                    <h1 className="font-bold text-xl text-white">{activeLecture?.title || 'Bienvenue'}</h1>
                    <p className="text-sm text-slate-400 mt-1">{activeLecture?.description || 'Sélectionnez une leçon dans la barre latérale pour commencer votre apprentissage.'}</p>
                    
                    {!isEbook && activeLecture && (
                       <Button onClick={handleLessonComplete} className="mt-4">
                           <CheckCircle className="h-4 w-4 mr-2" />
                           Marquer comme terminée
                       </Button>
                    )}
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
