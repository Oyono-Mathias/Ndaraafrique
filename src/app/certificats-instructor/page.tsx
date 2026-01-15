'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRole } from '@/context/RoleContext';
import { useCollection, useMemoFirebase } from '@/firebase';
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Award, User, Book } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { Course, Enrollment, NdaraUser } from '@/lib/types';

interface CertificateInfo {
    id: string;
    studentName: string;
    courseTitle: string;
    completionDate: Date;
}

export default function InstructorCertificatesPage() {
  const { currentUser: instructor, isUserLoading } = useRole();
  const db = getFirestore();
  const [certificates, setCertificates] = useState<CertificateInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!instructor?.uid || !instructor.isInstructorApproved) {
      if (!isUserLoading) setIsLoading(false);
      return;
    }

    const fetchData = async () => {
        setIsLoading(true);
        
        // 1. Get instructor's courses
        const coursesQuery = query(collection(db, 'courses'), where('instructorId', '==', instructor.uid));
        const coursesSnap = await getDocs(coursesQuery);
        if (coursesSnap.empty) {
            setCertificates([]);
            setIsLoading(false);
            return;
        }
        const courseIds = coursesSnap.docs.map(doc => doc.id);
        const coursesMap = new Map(coursesSnap.docs.map(doc => [doc.id, doc.data() as Course]));

        // 2. Get completed enrollments for these courses
        const enrollmentsQuery = query(
            collection(db, 'enrollments'), 
            where('courseId', 'in', courseIds),
            where('progress', '==', 100)
        );
        const enrollmentsSnap = await getDocs(enrollmentsQuery);
        if (enrollmentsSnap.empty) {
            setCertificates([]);
            setIsLoading(false);
            return;
        }
        const completedEnrollments = enrollmentsSnap.docs.map(doc => doc.data() as Enrollment);

        // 3. Get student details for these enrollments
        const studentIds = [...new Set(completedEnrollments.map(e => e.studentId))];
        const studentsQuery = query(collection(db, 'users'), where('uid', 'in', studentIds));
        const studentsSnap = await getDocs(studentsQuery);
        const studentsMap = new Map(studentsSnap.docs.map(doc => [doc.id, doc.data() as NdaraUser]));
        
        // 4. Combine data
        const certificateList = completedEnrollments.map(enrollment => {
            const student = studentsMap.get(enrollment.studentId);
            const course = coursesMap.get(enrollment.courseId);
            return {
                id: `${enrollment.studentId}-${enrollment.courseId}`,
                studentName: student?.fullName || 'Étudiant inconnu',
                courseTitle: course?.title || 'Cours inconnu',
                completionDate: enrollment.enrollmentDate?.toDate() || new Date(), // Placeholder date
            };
        });

        setCertificates(certificateList);
        setIsLoading(false);
    };

    fetchData();

  }, [instructor, isUserLoading, db]);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Certificats Décernés</h1>
        <p className="text-muted-foreground">Suivez les étudiants qui ont terminé vos formations avec succès.</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Liste des diplômés</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Étudiant</TableHead>
                <TableHead>Cours Terminé</TableHead>
                <TableHead>Date d'obtention</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                  </TableRow>
                ))
              ) : certificates.length > 0 ? (
                certificates.map((cert) => (
                  <TableRow key={cert.id}>
                    <TableCell className="font-medium flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground"/>
                        {cert.studentName}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Book className="h-4 w-4 text-muted-foreground"/>
                          {cert.courseTitle}
                        </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                        {cert.completionDate ? format(cert.completionDate, 'dd MMMM yyyy', { locale: fr }) : 'N/A'}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={3} className="h-32 text-center text-muted-foreground">
                     <div className="flex flex-col items-center justify-center gap-2">
                        <Award className="h-10 w-10" />
                        <span className="font-medium">Aucun certificat décerné pour le moment</span>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
