
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useCollection } from '@/firebase';
import { getFirestore, collection, query, where, orderBy, getDocs, documentId } from 'firebase/firestore';
import { useRole } from '@/context/RoleContext';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Award, Search, User, BookOpen, Clock, Frown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { Enrollment, NdaraUser, Course } from '@/lib/types';

export function CertificatesClient() {
  const db = getFirestore();
  const { currentUser } = useRole();
  const [searchTerm, setSearchTerm] = useState('');
  const [enrichedCertificates, setEnrichedCertificates] = useState<(Enrollment & { student?: NdaraUser; course?: Course })[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 1. Récupération des inscriptions terminées (progress == 100)
  const enrollmentsQuery = useMemo(
    () => currentUser ? query(collection(db, 'enrollments'), where('instructorId', '==', currentUser.uid), where('progress', '==', 100), orderBy('lastAccessedAt', 'desc')) : null,
    [db, currentUser]
  );
  const { data: enrollments, isLoading: enrollmentsLoading } = useCollection<Enrollment>(enrollmentsQuery);

  useEffect(() => {
    if (!enrollments || enrollmentsLoading) return;

    const enrichData = async () => {
      setIsLoading(true);
      try {
        const studentIds = [...new Set(enrollments.map(e => e.studentId))];
        const courseIds = [...new Set(enrollments.map(e => e.courseId))];

        const studentsMap = new Map<string, NdaraUser>();
        const coursesMap = new Map<string, Course>();

        if (studentIds.length > 0) {
          const studentsSnap = await getDocs(query(collection(db, 'users'), where('uid', 'in', studentIds.slice(0, 30))));
          studentsSnap.forEach(d => studentsMap.set(d.id, d.data() as NdaraUser));
        }

        if (courseIds.length > 0) {
          const coursesSnap = await getDocs(query(collection(db, 'courses'), where(documentId(), 'in', courseIds.slice(0, 30))));
          coursesSnap.forEach(d => coursesMap.set(d.id, { id: d.id, ...d.data() } as Course));
        }

        const enriched = enrollments.map(e => ({
          ...e,
          student: studentsMap.get(e.studentId),
          course: coursesMap.get(e.courseId)
        }));

        setEnrichedCertificates(enriched);
      } catch (error) {
        console.error("Error enriching certificates:", error);
      } finally {
        setIsLoading(false);
      }
    };

    enrichData();
  }, [enrollments, enrollmentsLoading, db]);

  const filteredCerts = useMemo(() => {
    return enrichedCertificates.filter(c => 
      c.student?.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.course?.title.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [enrichedCertificates, searchTerm]);

  return (
    <div className="space-y-6">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
        <Input 
          placeholder="Rechercher par étudiant ou cours..." 
          className="pl-10 h-12 bg-slate-900 border-slate-800 rounded-xl"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="border rounded-2xl bg-slate-900 border-slate-800 overflow-hidden shadow-xl">
        <Table>
          <TableHeader>
            <TableRow className="border-slate-800 bg-slate-800/30">
              <TableHead className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Apprenant</TableHead>
              <TableHead className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Formation</TableHead>
              <TableHead className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Date d'obtention</TableHead>
              <TableHead className="text-slate-400 font-bold uppercase text-[10px] tracking-widest text-right">Statut</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              [...Array(3)].map((_, i) => (
                <TableRow key={i}><TableCell colSpan={4}><Skeleton className="h-10 w-full bg-slate-800" /></TableCell></TableRow>
              ))
            ) : filteredCerts.length > 0 ? (
              filteredCerts.map((cert) => (
                <TableRow key={cert.id} className="border-slate-800 hover:bg-slate-800/40">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8 border border-slate-700">
                        <AvatarImage src={cert.student?.profilePictureURL} />
                        <AvatarFallback className="bg-slate-800 text-[10px]">{cert.student?.fullName?.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <span className="font-bold text-white text-sm">{cert.student?.fullName}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-slate-300 text-sm">
                      <BookOpen className="h-3.5 w-3.5 text-primary" />
                      <span className="line-clamp-1">{cert.course?.title}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-slate-500 text-xs">
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      {cert.lastAccessedAt ? format((cert.lastAccessedAt as any).toDate(), 'd MMM yyyy', { locale: fr }) : 'N/A'}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge className="bg-green-500/10 text-green-400 border-none text-[9px] font-black uppercase">Certifié</Badge>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="h-48 text-center">
                  <div className="flex flex-col items-center gap-2 text-slate-600">
                    <Award className="h-8 w-8 opacity-20" />
                    <p className="text-sm font-medium">Aucun certificat décerné pour le moment.</p>
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
