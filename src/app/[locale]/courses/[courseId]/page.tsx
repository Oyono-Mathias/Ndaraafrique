
'use client';

import { useState, useMemo, useEffect, useCallback, Suspense } from 'react';
import { useParams, useRouter } from 'next-intl/navigation';
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
import { Loader2, CheckCircle } from 'lucide-react';
import { CertificateModal } from '@/components/modals/certificate-modal';
import type { Course, Section, Lecture, NdaraUser, Quiz } from '@/lib/types';
import { cn } from '@/lib/utils';
import { CourseSidebar } from './_components/CourseSidebar';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { PdfViewerClient } from '@/components/ui/PdfViewerClient';

const ReactPlayer = dynamic(() => import('react-player/lazy'), { ssr: false });

function CoursePlayerPageContent() {
  const params = useParams();
  const courseId = params.courseId as string;
  const { user, currentUser } = useRole();
  const db = getFirestore();
  const { toast } = useToast();

  const [sections, setSections] = useState<Section[]>([]);
  const [lecturesMap, setLecturesMap] = useState<Map<string, Lecture[]>>(new Map());
  const [activeLecture, setActiveLecture] = useState<Lecture | null>(null);
  
  const [isCompleted, setIsCompleted] = useState(false);
  const [showCertificateModal, setShowCertificateModal] = useState(false);

  const courseRef = useMemo(() => courseId ? doc(db, 'courses', courseId) : null, [db, courseId]);
  const { data: course, isLoading: courseLoading } = useDoc<Course>(courseRef);
  
  const instructorRef = useMemo(() => course?.instructorId ? doc(db, 'users', course.instructorId) : null, [course, db]);
  const { data: instructor, isLoading: instructorLoading } = useDoc<NdaraUser>(instructorRef);

  const progressRef = useMemo(() => user ? doc(db, 'course_progress', `${user.uid}_${courseId}`) : null, [user, db, courseId]);
  const { data: courseProgress, isLoading: progressLoading } = useDoc(progressRef);
  
  const quizzesQuery = useMemo(() => courseId ? query(collection(db, 'quizzes'), where('courseId', '==', courseId)) : null, [db, courseId]);
  const { data: quizzes, isLoading: quizzesLoading } = useCollection<Quiz>(quizzesQuery);
  
  const isEnrolled = useMemo(() => currentUser?.role === 'admin', [currentUser]);
  const isEbook = course?.contentType === 'ebook';
  const [isLoading, setIsLoading] = useState(true);

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
        const lecturesQuery = query(collection(db, 'courses', courseId, 'sections', section.id, 'lectures'), orderBy('order'));
        const lecturesSnapshot = await getDocs(lecturesQuery);
        lecturesData.set(section.id, lecturesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Lecture)));
      }
      setLecturesMap(lecturesData);
      
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
    if (!user || !activeLecture || !course || !progressRef || totalLectures === 0) return;

    const completedLessons = courseProgress?.completedLessons || [];

    if (!completedLessons.includes(activeLecture.id)) {
      const updatedCompletedLessons = [...completedLessons, activeLecture.id];
      const newProgress = Math.round((updatedCompletedLessons.length / totalLectures) * 100);

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
      
      toast({ title: "Progression sauvegardée !"})

      if (newProgress >= 100) {
        setIsCompleted(true);
        setShowCertificateModal(true);
        
        const activityRef = doc(collection(db, `users/${user.uid}/activity`));
        await setDoc(activityRef, {
            userId: user.uid,
            type: 'certificate',
            title: `Vous avez obtenu un certificat !`,
            description: `Félicitations pour avoir terminé le cours "${course.title}".`,
            link: `/student/mes-certificats`,
            read: false,
            createdAt: serverTimestamp()
        });
      }
    } else {
        toast({ title: "Leçon déjà terminée."})
    }
  }, [user, activeLecture, courseId, totalLectures, db, course, progressRef, courseProgress, toast]);
  
  const isPageLoading = isLoading || courseLoading || progressLoading || instructorLoading || quizzesLoading;
  
  if (isPageLoading) {
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
      <CertificateModal
        isOpen={showCertificateModal}
        onClose={() => setShowCertificateModal(false)}
        courseName={course?.title || ''}
        studentName={currentUser?.fullName}
        instructorName={instructor?.fullName || ''}
        completionDate={courseProgress?.updatedAt?.toDate() || new Date()}
        certificateId={`${user?.uid}_${courseId}`}
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
                quizzes={quizzes || []}
                activeLecture={activeLecture}
                onLessonClick={handleLessonClick}
              />
            </aside>
            <main className="flex-1 flex flex-col bg-black min-h-0">
                <div className="flex-1 relative">
                  {isEbook && course?.ebookUrl ? (
                      <PdfViewerClient fileUrl={course.ebookUrl} />
                  ) : activeLecture?.type === 'video' && activeLecture.contentUrl ? (
                    <div className="absolute inset-0">
                       <ReactPlayer
                           url={activeLecture.contentUrl}
                           width="100%"
                           height="100%"
                           controls={true}
                           playing={false}
                       />
                    </div>
                  ) : activeLecture?.type === 'pdf' && activeLecture.contentUrl ? (
                     <PdfViewerClient fileUrl={activeLecture.contentUrl} />
                  ) : activeLecture?.type === 'text' && activeLecture.textContent ? (
                      <div className="p-8 text-slate-300 prose prose-invert max-w-none">
                         <div dangerouslySetInnerHTML={{ __html: activeLecture.textContent }} />
                      </div>
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
