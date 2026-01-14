
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRole } from '@/context/RoleContext';
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  Timestamp,
  onSnapshot,
} from 'firebase/firestore';
import Link from 'next/link';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Award, Download, Share2, BookOpen, Linkedin } from 'lucide-react';
import { CertificateModal } from '@/components/modals/certificate-modal';
import type { Course, Enrollment, FormaAfriqueUser } from '@/lib/types';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { WhatsAppIcon } from '@/components/icons/WhatsAppIcon';


interface CompletedCourse extends Course {
  completionDate: Date;
  certificateId: string;
  instructorName: string;
}

export default function MyCertificatesPage() {
  const { formaAfriqueUser, isUserLoading } = useRole();
  const db = getFirestore();

  const [completedCourses, setCompletedCourses] = useState<CompletedCourse[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [selectedCertificate, setSelectedCertificate] = useState<CompletedCourse | null>(null);

  const enrollmentsQuery = useMemo(
    () => formaAfriqueUser?.uid
      ? query(
          collection(db, 'enrollments'), 
          where('studentId', '==', formaAfriqueUser.uid), 
          where('progress', '==', 100)
        )
      : null,
    [db, formaAfriqueUser?.uid]
  );
  
  useEffect(() => {
    if (!enrollmentsQuery) {
        if (!isUserLoading) setDataLoading(false);
        return;
    }
    
    const unsubscribe = onSnapshot(enrollmentsQuery, async (snapshot) => {
      setDataLoading(true);
      if (snapshot.empty) {
        setCompletedCourses([]);
        setDataLoading(false);
        return;
      }
      
      const enrollments = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Enrollment));
      const courseIds = enrollments.map(e => e.courseId).filter(Boolean);
      
      if (courseIds.length === 0) {
        setCompletedCourses([]);
        setDataLoading(false);
        return;
      }

      const coursesMap = new Map<string, Course>();
      const coursesRef = collection(db, 'courses');
      const courseIdChunks = [];
      for (let i = 0; i < courseIds.length; i += 30) {
          courseIdChunks.push(courseIds.slice(i, i + 30));
      }

      for (const chunk of courseIdChunks) {
          const q = query(coursesRef, where('__name__', 'in', chunk));
          const courseSnap = await getDocs(q);
          courseSnap.forEach(doc => coursesMap.set(doc.id, { id: doc.id, ...doc.data() } as Course));
      }

      const instructorIds = [...new Set(Array.from(coursesMap.values()).map(c => c.instructorId).filter(Boolean))];
      const instMap = new Map<string, FormaAfriqueUser>();
      
      if (instructorIds.length > 0) {
        const instSnap = await getDocs(query(collection(db, 'users'), where('uid', 'in', instructorIds.slice(0, 30))));
        instSnap.forEach(d => instMap.set(d.data().uid, d.data() as FormaAfriqueUser));
      }
      
      const populatedCourses: CompletedCourse[] = enrollments.map(enrollment => {
          const course = coursesMap.get(enrollment.courseId);
          if (!course) return null;
          
          const instructor = instMap.get(course.instructorId);
          const completionDate = enrollment.enrollmentDate?.toDate() || new Date(); 

          return {
            ...course,
            completionDate: completionDate,
            certificateId: enrollment.id,
            instructorName: instructor?.fullName || 'L\'équipe Ndara',
          };
        })
        .filter((c): c is CompletedCourse => c !== null)
        .sort((a, b) => b.completionDate.getTime() - a.completionDate.getTime());

      setCompletedCourses(populatedCourses);
      setDataLoading(false);
    });

    return () => unsubscribe();
  }, [enrollmentsQuery, isUserLoading, db]);
  
  const isLoading = isUserLoading || dataLoading;

  const generateShareLinks = (course: CompletedCourse) => {
    const certificateUrl = `${window.location.origin}/verify/${course.certificateId}`;
    const encodedUrl = encodeURIComponent(certificateUrl);
    
    const whatsAppText = encodeURIComponent(`Je suis fier de vous annoncer que j'ai obtenu mon certificat en ${course.title} sur Ndara Afrique ! ${certificateUrl}`);
    const whatsAppLink = `https://wa.me/?text=${whatsAppText}`;

    const linkedInLink = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;

    return { whatsAppLink, linkedInLink };
  };

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold dark:text-white">Mes Certificats</h1>
        <p className="text-muted-foreground dark:text-slate-400">Félicitations ! Voici les certificats que vous avez obtenus.</p>
      </header>

      <Card className="dark:bg-slate-800 dark:border-slate-700">
        <CardHeader>
          <CardTitle className="dark:text-white">Certificats Obtenus</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {isLoading ? (
            [...Array(3)].map((_, i) => (
              <Card key={i} className="flex flex-col items-center justify-center p-6 text-center space-y-4 dark:bg-slate-900/50 dark:border-slate-700">
                <Skeleton className="h-16 w-16 rounded-full dark:bg-slate-700" />
                <Skeleton className="h-6 w-3/4 dark:bg-slate-700" />
                <div className="flex gap-2 pt-2">
                    <Skeleton className="h-10 w-24 dark:bg-slate-700" />
                    <Skeleton className="h-10 w-24 dark:bg-slate-700" />
                </div>
              </Card>
            ))
          ) : completedCourses.length > 0 ? (
            completedCourses.map((course) => {
              const { whatsAppLink, linkedInLink } = generateShareLinks(course);
              return (
                <Card key={course.id} className="flex flex-col items-center p-6 text-center space-y-3 dark:bg-slate-900/50 dark:border-slate-700 shadow-sm">
                  <Award className="h-16 w-16 text-amber-500" />
                  <h3 className="text-lg font-semibold dark:text-white">{course.title}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Obtenu le {course.completionDate ? new Date(course.completionDate).toLocaleDateString('fr-FR') : 'N/A'}
                  </p>
                  <div className="flex gap-2 pt-2">
                      <Button onClick={() => setSelectedCertificate(course)}>
                        <Download className="mr-2 h-4 w-4" />
                        Télécharger
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="secondary">
                            <Share2 className="mr-2 h-4 w-4" />
                            Partager
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="dark:bg-slate-800 dark:border-slate-700">
                          <DropdownMenuItem asChild>
                            <a href={whatsAppLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 cursor-pointer dark:focus:bg-slate-700">
                              <WhatsAppIcon className="h-4 w-4" style={{ color: '#25D366' }} />
                              <span>WhatsApp</span>
                            </a>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <a href={linkedInLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 cursor-pointer dark:focus:bg-slate-700">
                              <Linkedin className="h-4 w-4" style={{ color: '#0A66C2' }} />
                              <span>LinkedIn</span>
                            </a>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                  </div>
                </Card>
              )
            })
          ) : (
            <div className="md:col-span-2 lg:col-span-3 text-center py-20 border-2 border-dashed rounded-lg dark:border-slate-700">
                <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground dark:text-slate-400">
                    <Award className="mx-auto h-12 w-12 mb-4" />
                    <h3 className="font-semibold text-lg">Vous n'avez pas encore de certificat</h3>
                    <p className="text-sm max-w-sm mx-auto">Terminez un cours à 100% pour débloquer votre premier certificat et le voir apparaître ici.</p>
                    <Button asChild className="mt-4">
                        <Link href="/dashboard">
                            <BookOpen className="mr-2 h-4 w-4"/>
                            Parcourir les cours
                        </Link>
                    </Button>
                </div>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedCertificate && formaAfriqueUser && (
        <CertificateModal
          isOpen={!!selectedCertificate}
          onClose={() => setSelectedCertificate(null)}
          courseName={selectedCertificate.title}
          studentName={formaAfriqueUser.fullName}
          instructorName={selectedCertificate.instructorName}
          completionDate={selectedCertificate.completionDate}
          certificateId={selectedCertificate.certificateId}
        />
      )}
    </div>
  );
}
