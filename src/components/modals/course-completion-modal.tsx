'use client';

import { useState, useMemo, useEffect } from 'react';
import { useCollection } from '@/firebase';
import { getFirestore, collection, query, where, getDocs, documentId } from 'firebase/firestore';
import { useRole } from '@/context/RoleContext';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Eye, Frown } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CertificateModal } from '@/components/modals/certificate-modal';
import type { Enrollment, NdaraUser, Course } from '@/lib/types';
import Link from 'next/link';

interface EnrichedCertificate extends Enrollment {
  student?: Partial<NdaraUser>;
  course?: Partial<Course>;
  instructor?: Partial<NdaraUser>;
}

async function fetchDataMap(db: any, collectionName: string, fieldName: string | null, ids: string[]) {
    const dataMap = new Map();
    if (ids.length === 0) return dataMap;

    for (let i = 0; i < ids.length; i += 30) {
        const chunk = ids.slice(i, i + 30);
        if (chunk.length === 0) continue;
        
        const key = fieldName || documentId();
        const q = query(collection(db, collectionName), where(key, 'in', chunk));
        const snapshot = await getDocs(q);
        snapshot.forEach(doc => dataMap.set(doc.id, doc.data()));
    }
    return dataMap;
}

export default function MesCertificatsPage() {
  const db = getFirestore();
  const { currentUser } = useRole();
  const [selectedCertificate, setSelectedCertificate] = useState<EnrichedCertificate | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const enrollmentsQuery = useMemo(() =>
    currentUser?.uid
      ? query(collection(db, 'enrollments'), where('studentId', '==', currentUser.uid), where('progress', '==', 100))
      : null,
    [db, currentUser]
  );
  const { data: enrollments, isLoading: enrollmentsLoading } = useCollection<Enrollment>(enrollmentsQuery);

  const [enrichedData, setEnrichedData] = useState<EnrichedCertificate[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (!enrollments) {
        setDataLoading(false);
        return;
    };
    
    const enrichData = async () => {
        setDataLoading(true);
        const courseIds = [...new Set(enrollments.map(e => e.courseId))];
        const instructorIds = [...new Set(enrollments.map(e => e.instructorId))];

        const [coursesMap, instructorsMap] = await Promise.all([
             fetchDataMap(db, 'courses', null, courseIds),
             fetchDataMap(db, 'users', 'uid', instructorIds)
        ]);
        
        const newEnrichedData: EnrichedCertificate[] = enrollments.map(e => ({
            ...e,
            student: currentUser || undefined, 
            course: coursesMap.get(e.courseId),
            instructor: instructorsMap.get(e.instructorId),
        }));

        setEnrichedData(newEnrichedData);
        setDataLoading(false);
    };

    enrichData();
  }, [enrollments, db, currentUser]);

  const handleViewCertificate = (cert: EnrichedCertificate) => {
    setSelectedCertificate(cert);
    setIsModalOpen(true);
  };
  
  const isLoading = enrollmentsLoading || dataLoading;

  return (
    <div className="space-y-8">
      {selectedCertificate && (
        <CertificateModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          courseName={selectedCertificate.course?.title || ''}
          studentName={selectedCertificate.student?.fullName || 'Étudiant'}
          instructorName={selectedCertificate.instructor?.fullName || ''}
          // ✅ Sécurisation de la date Firestore
          completionDate={(selectedCertificate.lastAccessedAt as any)?.toDate?.() || new Date()}
          certificateId={selectedCertificate.id}
        />
      )}
      <header>
        <h1 className="text-3xl font-bold dark:text-white">Mes Certificats</h1>
        <p className="text-muted-foreground dark:text-slate-400">Toutes les certifications que vous avez obtenues sur Ndara Afrique.</p>
      </header>

      <div className="border rounded-lg bg-slate-800/50 border-slate-700/80">
        <Table>
          <TableHeader>
            <TableRow className="border-slate-700">
              <TableHead>Cours</TableHead>
              <TableHead>Instructeur</TableHead>
              <TableHead>Date d'obtention</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              [...Array(3)].map((_, i) => <TableRow key={i}><TableCell colSpan={4}><Skeleton className="h-10 w-full bg-slate-700"/></TableCell></TableRow>)
            ) : enrichedData.length > 0 ? (
              enrichedData.map(cert => (
                <TableRow key={cert.id} className="border-slate-800">
                  <TableCell className="font-medium text-white">{cert.course?.title}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8"><AvatarImage src={cert.instructor?.profilePictureURL} /><AvatarFallback>{cert.instructor?.fullName?.charAt(0)}</AvatarFallback></Avatar>
                      <span className="font-medium text-slate-300">{cert.instructor?.fullName}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {/* ✅ Sécurisation de la date Firestore */}
                    {(cert.lastAccessedAt as any)?.toDate?.() 
                        ? format((cert.lastAccessedAt as any).toDate(), 'd MMM yyyy', { locale: fr }) 
                        : 'N/A'}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" onClick={() => handleViewCertificate(cert)}><Eye className="mr-2 h-4 w-4"/>Voir</Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="h-48 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Frown className="h-12 w-12" />
                      <p className="font-semibold">Aucun certificat obtenu pour le moment.</p>
                      <Button asChild variant="link">
                        <Link href="/student/mes-formations">Continuez vos cours pour en obtenir !</Link>
                      </Button>
                    </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
