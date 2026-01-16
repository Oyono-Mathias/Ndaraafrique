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
import { Button } from '@/components/ui/button';

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

        // 2. Get completed enrollments for these courses (chunking for 'in' query limitation)
        let completedEnrollments: Enrollment[] = [];
        for (let i = 0; i < courseIds.length; i += 30) {
            const chunk = courseIds.slice(i, i + 30);
            const enrollmentsQuery = query(
                collection(db, 'enrollments'), 
                where('courseId', 'in', chunk),
                where('progress', '==', 100)
            );
            const enrollmentsSnap = await getDocs(enrollmentsQuery);
            completedEnrollments.push(...enrollmentsSnap.docs.map(doc => ({id: doc.id, ...doc.data() } as Enrollment)));
        }
        
        if (completedEnrollments.length === 0) {
            setCertificates([]);
            setIsLoading(false);
            return;
        }

        // 3. Get student details for these enrollments
        const studentIds = [...new Set(completedEnrollments.map(e => e.studentId))];
        const studentsMap = new Map<string, NdaraUser>();
         for (let i = 0; i < studentIds.length; i += 30) {
            const chunk = studentIds.slice(i, i + 30);
            const studentsQuery = query(collection(db, 'users'), where('uid', 'in', chunk));
            const studentsSnap = await getDocs(studentsQuery);
            studentsSnap.forEach(doc => studentsMap.set(doc.id, doc.data() as NdaraUser));
        }
        
        // 4. Combine data
        const certificateList = completedEnrollments.map(enrollment => {
            const student = studentsMap.get(enrollment.studentId);
            const course = coursesMap.get(enrollment.courseId);
            return {
                id: enrollment.id,
                studentName: student?.fullName || 'Étudiant inconnu',
                courseTitle: course?.title || 'Cours inconnu',
                completionDate: enrollment.lastAccessedAt?.toDate() || new Date(), // Using lastAccessedAt as a proxy
            };
        }).sort((a, b) => b.completionDate.getTime() - a.completionDate.getTime());

        setCertificates(certificateList);
        setIsLoading(false);
    };

    fetchData();

  }, [instructor, isUserLoading, db]);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold dark:text-white">Certificats Décernés</h1>
        <p className="text-muted-foreground dark:text-slate-400">Suivez les étudiants qui ont terminé vos formations avec succès.</p>
      </header>

      <Card className="dark:bg-slate-800 dark:border-slate-700">
        <CardHeader>
          <CardTitle className="dark:text-white">Liste des diplômés</CardTitle>
          <CardDescription className="dark:text-slate-400">Cette liste est mise à jour en temps réel.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="dark:border-slate-700 hover:bg-slate-700/50">
                <TableHead className="dark:text-slate-300">Étudiant</TableHead>
                <TableHead className="dark:text-slate-300">Cours Terminé</TableHead>
                <TableHead className="hidden md:table-cell dark:text-slate-300">Date d'obtention</TableHead>
                <TableHead className="text-right dark:text-slate-300">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(3)].map((_, i) => (
                  <TableRow key={i} className="dark:border-slate-700">
                    <TableCell><Skeleton className="h-5 w-32 dark:bg-slate-700" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-48 dark:bg-slate-700" /></TableCell>
                    <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-24 dark:bg-slate-700" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-24 dark:bg-slate-700" /></TableCell>
                  </TableRow>
                ))
              ) : certificates.length > 0 ? (
                certificates.map((cert) => (
                  <TableRow key={cert.id} className="dark:border-slate-700 hover:bg-slate-700/50">
                    <TableCell className="font-medium flex items-center gap-2 dark:text-white">
                        <User className="h-4 w-4 text-muted-foreground"/>
                        {cert.studentName}
                    </TableCell>
                    <TableCell className="text-muted-foreground dark:text-slate-300">
                        {cert.courseTitle}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground dark:text-slate-400">
                        {cert.completionDate ? format(cert.completionDate, 'dd MMMM yyyy', { locale: fr }) : 'N/A'}
                    </TableCell>
                    <TableCell className="text-right">
                       <Button variant="outline" size="sm">Voir</Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="h-48 text-center text-muted-foreground">
                     <div className="flex flex-col items-center justify-center gap-2">
                        <Award className="h-10 w-10 text-slate-500" />
                        <span className="font-medium text-lg dark:text-slate-300">Aucun certificat décerné pour le moment</span>
                        <p className="text-sm dark:text-slate-400">Dès que des étudiants termineront vos cours, ils apparaîtront ici.</p>
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
