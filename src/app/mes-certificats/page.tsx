
'use client';

import { useState, useMemo } from 'react';
import { useRole } from '@/context/RoleContext';
import { useCollection, useMemoFirebase } from '@/firebase';
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Award, Download, Share2, BookOpen, Linkedin } from 'lucide-react';
import { CertificateModal } from '@/components/modals/certificate-modal';
import type { Course, Enrollment } from '@/lib/types';
import Link from 'next/link';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";


interface CompletedCourse extends Course {
  completionDate: Date;
  certificateId: string;
}

const WhatsAppIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M12.04 2.01C6.58 2.01 2.13 6.46 2.13 12.02c0 1.76.46 3.45 1.32 4.94L2.05 22l5.3-1.4c1.42.82 3.02 1.28 4.69 1.28h.01c5.46 0 9.91-4.45 9.91-9.91s-4.45-9.9-9.91-9.9zM12.04 20.2c-1.45 0-2.84-.38-4.06-1.08l-.3-.18-3.03.8.82-2.96-.2-.32a8.03 8.03 0 01-1.23-4.45c0-4.43 3.6-8.03 8.03-8.03s8.03 3.6 8.03 8.03-3.6 8.02-8.03 8.02zm4.45-6.21c-.24-.12-1.42-.7-1.64-.78-.22-.08-.38-.12-.54.12-.16.24-.62.78-.76.94-.14.16-.28.18-.52.06-.24-.12-1.02-.38-1.94-1.2-1.25-.87-1.57-1.6-1.61-1.72-.04-.12 0-.18.11-.3.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.3-.74-1.78-.2-.48-.4-.42-.54-.42h-.47c-.16 0-.42.06-.64.3.22.24-.88.85-.88,2.07s.9,2.4,1.02,2.56c.12.16,1.78,2.73,4.31,3.8.59.25,1.05.4,1.41.52.6.2,1.14.16,1.56.1.48-.07,1.42-.58,1.62-1.14.2-.56.2-1.04.14-1.14-.06-.1-.22-.16-.46-.28z"></path>
  </svg>
);


export default function MyCertificatesPage() {
  const { formaAfriqueUser, isUserLoading } = useRole();
  const db = getFirestore();

  const [completedCourses, setCompletedCourses] = useState<CompletedCourse[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [selectedCertificate, setSelectedCertificate] = useState<CompletedCourse | null>(null);

  const enrollmentsQuery = useMemoFirebase(
    () => formaAfriqueUser?.uid
      ? query(
          collection(db, 'enrollments'), 
          where('studentId', '==', formaAfriqueUser.uid), 
          where('progress', '==', 100)
        )
      : null,
    [db, formaAfriqueUser?.uid]
  );
  const { data: completedEnrollments, isLoading: enrollmentsLoading } = useCollection<Enrollment>(enrollmentsQuery);

  useMemo(() => {
    if (enrollmentsLoading) return;
    if (!completedEnrollments || completedEnrollments.length === 0) {
      setDataLoading(false);
      setCompletedCourses([]);
      return;
    }

    const fetchCourseDetails = async () => {
      setDataLoading(true);
      const courseIds = completedEnrollments.map(e => e.courseId);
      if (courseIds.length === 0) {
          setDataLoading(false);
          setCompletedCourses([]);
          return;
      }
      
      const coursesMap = new Map<string, Course>();
      const coursesRef = collection(db, 'courses');
      const q = query(coursesRef, where('__name__', 'in', courseIds.slice(0, 30)));
      const courseSnap = await getDocs(q);
      courseSnap.forEach(doc => coursesMap.set(doc.id, { id: doc.id, ...doc.data() } as Course));
      
      const populatedCourses: CompletedCourse[] = completedEnrollments.map(enrollment => {
          const course = coursesMap.get(enrollment.courseId);
          if (!course) return null;
          
          const completionDate = enrollment.enrollmentDate?.toDate() || new Date(); 

          return {
            ...course,
            completionDate: completionDate,
            certificateId: enrollment.id
          };
        })
        .filter((c): c is CompletedCourse => c !== null);

      setCompletedCourses(populatedCourses);
      setDataLoading(false);
    };

    fetchCourseDetails();
  }, [completedEnrollments, enrollmentsLoading, db]);
  
  const isLoading = isUserLoading || dataLoading;

  const generateShareLinks = (course: CompletedCourse) => {
    const certificateUrl = `https://formaafrique.com/verify/${course.certificateId}`;
    const encodedUrl = encodeURIComponent(certificateUrl);
    
    const whatsAppText = encodeURIComponent(`Je suis fier de vous annoncer que j'ai obtenu mon certificat en ${course.title} sur FormaAfrique ! ${certificateUrl}`);
    const whatsAppLink = `https://wa.me/?text=${whatsAppText}`;

    const linkedInLink = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;

    return { whatsAppLink, linkedInLink };
  };

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold">Mes Certificats</h1>
        <p className="text-muted-foreground">Félicitations ! Voici les certificats que vous avez obtenus.</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Certificats Obtenus</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {isLoading ? (
            [...Array(3)].map((_, i) => (
              <Card key={i} className="flex flex-col items-center justify-center p-6 text-center space-y-4 bg-slate-50 border-slate-200">
                <Skeleton className="h-16 w-16 rounded-full" />
                <Skeleton className="h-6 w-3/4" />
                <div className="flex gap-2 pt-2">
                    <Skeleton className="h-10 w-24" />
                    <Skeleton className="h-10 w-24" />
                </div>
              </Card>
            ))
          ) : completedCourses.length > 0 ? (
            completedCourses.map((course) => {
              const { whatsAppLink, linkedInLink } = generateShareLinks(course);
              return (
                <Card key={course.id} className="flex flex-col items-center p-6 text-center space-y-3 bg-slate-50 border-slate-200 shadow-sm">
                  <Award className="h-16 w-16 text-yellow-500" />
                  <h3 className="text-lg font-semibold text-slate-800">{course.title}</h3>
                  <p className="text-sm text-slate-500">
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
                        <DropdownMenuContent>
                          <DropdownMenuItem asChild>
                            <a href={whatsAppLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 cursor-pointer">
                              <WhatsAppIcon className="h-4 w-4" style={{ color: '#25D366' }} />
                              <span>WhatsApp</span>
                            </a>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <a href={linkedInLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 cursor-pointer">
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
            <div className="md:col-span-2 lg:col-span-3 text-center py-20 border-2 border-dashed rounded-lg">
                <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
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
          completionDate={selectedCertificate.completionDate}
        />
      )}
    </div>
  );
}

