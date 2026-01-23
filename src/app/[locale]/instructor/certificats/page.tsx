
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useCollection, useDoc } from '@/firebase';
import { getFirestore, collection, query, where, doc, getDocs } from 'firebase/firestore';
import { useRole } from '@/context/RoleContext';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Award, Eye, Frown } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CertificateModal } from '@/components/modals/certificate-modal';
import type { Enrollment, NdaraUser, Course } from '@/lib/types';

interface EnrichedCertificate extends Enrollment {
  student?: Partial<NdaraUser>;
  course?: Partial<Course>;
  instructor?: Partial<NdaraUser>;
}

// Helper function to fetch data in chunks and return a map
async function fetchDataMap(db: any, collectionName: string, fieldName: string | null, ids: string[]) {
    const dataMap = new Map();
    if (ids.length === 0) return dataMap;

    for (let i = 0; i < ids.length; i += 30) {
        const chunk = ids.slice(i, i + 30);
        if (chunk.length === 0) continue;
        
        const key = fieldName || '__name__'; // Use document ID if fieldName is null
        const q = query(collection(db, collectionName), where(key, 'in', chunk));
        const snapshot = await getDocs(q);
        snapshot.forEach(doc => dataMap.set(doc.id, doc.data()));
    }
    return dataMap;
}


export default function InstructorCertificatesPage() {
  const db = getFirestore();
  const { currentUser } = useRole();
  const [selectedCertificate, setSelectedCertificate] = useState<EnrichedCertificate | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // 1. Fetch completed enrollments for the instructor
  const enrollmentsQuery = useMemo(() =>
    currentUser?.uid
      ? query(collection(db, 'enrollments'), where('instructorId', '==', currentUser.uid), where('progress', '==', 100))
      : null,
    [db, currentUser]
  );
  const { data: enrollments, isLoading: enrollmentsLoading } = useCollection<Enrollment>(enrollmentsQuery);

  // 2. State for enriched data
  const [enrichedData, setEnrichedData] = useState<EnrichedCertificate[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  // 3. Effect to fetch related data
  useEffect(() => {
    if (!enrollments) {
        setDataLoading(false);
        return;
    };
    
    const enrichData = async () => {
        setDataLoading(true);
        const studentIds = [...new Set(enrollments.map(e => e.studentId))];
        const courseIds = [...new Set(enrollments.map(e => e.courseId))];

        const [studentsMap, coursesMap] = await Promise.all([
             fetchDataMap(db, 'users', 'uid', studentIds),
             fetchDataMap(db, 'courses', null, courseIds)
        ]);
        
        const newEnrichedData = enrollments.map(e => ({
            ...e,
            student: studentsMap.get(e.studentId),
            course: coursesMap.get(e.courseId),
            instructor: currentUser,
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
    <>
      {selectedCertificate && (
        <CertificateModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          courseName={selectedCertificate.course?.title || ''}
          studentName={selectedCertificate.student?.fullName || 'Étudiant'}
          instructorName={selectedCertificate.instructor?.fullName || ''}
          completionDate={selectedCertificate.lastAccessedAt?.toDate() || new Date()}
          certificateId={selectedCertificate.id}
        />
      )}
      <div className="space-y-8">
        <header>
          <h1 className="text-3xl font-bold text-white">Certificats Décernés</h1>
          <p className="text-muted-foreground">Consultez les certificats obtenus par vos étudiants.</p>
        </header>

        <div className="border rounded-lg dark:border-slate-700">
          <Table>
            <TableHeader><TableRow><TableHead>Étudiant</TableHead><TableHead>Cours</TableHead><TableHead>Date d'obtention</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(3)].map((_, i) => <TableRow key={i}><TableCell colSpan={4}><Skeleton className="h-10 w-full"/></TableCell></TableRow>)
              ) : enrichedData.length > 0 ? (
                enrichedData.map(cert => (
                  <TableRow key={cert.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8"><AvatarImage src={cert.student?.profilePictureURL} /><AvatarFallback>{cert.student?.fullName?.charAt(0)}</AvatarFallback></Avatar>
                        <span className="font-medium text-white">{cert.student?.fullName}</span>
                      </div>
                    </TableCell>
                    <TableCell>{cert.course?.title}</TableCell>
                    <TableCell>{cert.lastAccessedAt ? format(cert.lastAccessedAt.toDate(), 'd MMM yyyy', { locale: fr }) : 'N/A'}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" onClick={() => handleViewCertificate(cert)}><Eye className="mr-2 h-4 w-4"/>Voir</Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow><TableCell colSpan={4} className="h-24 text-center">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <Frown className="h-8 w-8" />
                        <p>Aucun certificat n'a encore été décerné pour vos cours.</p>
                      </div>
                </TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </>
  );
}
