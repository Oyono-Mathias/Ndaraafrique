'use client';

/**
 * @fileOverview Liste des certificats de l'étudiant optimisée pour les formateurs.
 * Correction : Ajout des propriétés obligatoires courseId et userId au CertificateModal.
 */

import { useState, useMemo, useEffect } from 'react';
import { useCollection } from '@/firebase';
import { getFirestore, collection, query, where, getDocs, documentId } from 'firebase/firestore';
import { useRole } from '@/context/RoleContext';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Award, Search, User, BookOpen, Clock, Frown, Eye } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CertificateModal } from '@/components/modals/certificate-modal';
import type { Enrollment, NdaraUser, Course } from '@/lib/types';

export function CertificatesClient() {
  const db = getFirestore();
  const { currentUser } = useRole();
  const [searchTerm, setSearchTerm] = useState('');
  const [enrichedCertificates, setEnrichedCertificates] = useState<(Enrollment & { student?: NdaraUser; course?: Course; instructorName?: string })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [selectedCert, setSelectedCert] = useState<(Enrollment & { student?: NdaraUser; course?: Course; instructorName?: string }) | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // 1. Récupération des inscriptions à 100% par instructeur
  const enrollmentsQuery = useMemo(
    () => currentUser ? query(collection(db, 'enrollments'), where('instructorId', '==', currentUser.uid), where('progress', '==', 100)) : null,
    [db, currentUser]
  );
  const { data: enrollments, isLoading: enrollmentsLoading } = useCollection<Enrollment>(enrollmentsQuery);

  useEffect(() => {
    if (enrollmentsLoading) return;

    if (!enrollments || enrollments.length === 0) {
        setEnrichedCertificates([]);
        setIsLoading(false);
        return;
    }

    const enrichData = async () => {
      setIsLoading(true);
      try {
        const studentIds = [...new Set(enrollments.map(e => e.studentId))];
        const courseIds = [...new Set(enrollments.map(e => e.courseId))];

        const studentsMap = new Map<string, NdaraUser>();
        const coursesMap = new Map<string, Course>();

        if (studentIds.length > 0) {
          for (let i = 0; i < studentIds.length; i += 30) {
            const chunk = studentIds.slice(i, i + 30);
            const studentsSnap = await getDocs(query(collection(db, 'users'), where('uid', 'in', chunk)));
            studentsSnap.forEach(d => studentsMap.set(d.id, d.data() as NdaraUser));
          }
        }

        if (courseIds.length > 0) {
          for (let i = 0; i < courseIds.length; i += 30) {
            const chunk = courseIds.slice(i, i + 30);
            const coursesSnap = await getDocs(query(collection(db, 'courses'), where(documentId(), 'in', chunk)));
            coursesSnap.forEach(d => coursesMap.set(d.id, { id: d.id, ...d.data() } as Course));
          }
        }

        const enriched = enrollments.map(e => {
            const course = coursesMap.get(e.courseId);
            return {
                ...e,
                student: studentsMap.get(e.studentId),
                course: course,
                instructorName: currentUser?.fullName || "Oyono Mathias"
            };
        }).sort((a, b) => {
            const dateA = (a.lastAccessedAt as any)?.toDate?.() || (a.enrollmentDate as any)?.toDate?.() || new Date(0);
            const dateB = (b.lastAccessedAt as any)?.toDate?.() || (b.enrollmentDate as any)?.toDate?.() || new Date(0);
            return dateB.getTime() - dateA.getTime();
        });

        setEnrichedCertificates(enriched);
      } catch (error) {
        console.error("Error enriching certificates:", error);
      } finally {
        setIsLoading(false);
      }
    };

    enrichData();
  }, [enrollments, enrollmentsLoading, db, currentUser]);

  const filteredCerts = useMemo(() => {
    return enrichedCertificates.filter(c => 
      c.student?.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.course?.title.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [enrichedCertificates, searchTerm]);

  const handleViewCertificate = (cert: any) => {
    setSelectedCert(cert);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {selectedCert && (
        <CertificateModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          courseName={selectedCert.course?.title || ''}
          studentName={selectedCert.student?.fullName || 'Étudiant Ndara'}
          instructorName={selectedCert.instructorName || 'Oyono Mathias'}
          completionDate={(selectedCert.lastAccessedAt as any)?.toDate?.() || (selectedCert.enrollmentDate as any)?.toDate?.() || new Date()}
          certificateId={selectedCert.id}
          courseId={selectedCert.courseId}
          userId={selectedCert.studentId}
        />
      )}

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
              <TableHead className="text-slate-400 font-bold uppercase text-[10px] tracking-widest text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              [...Array(3)].map((_, i) => (
                <TableRow key={i}><TableCell colSpan={4}><Skeleton className="h-10 w-full bg-slate-800" /></TableCell></TableRow>
              ))
            ) : filteredCerts.length > 0 ? (
              filteredCerts.map((cert) => {
                const dateRaw = cert.lastAccessedAt || cert.enrollmentDate;
                const formattedDate = dateRaw && (dateRaw as any).toDate 
                    ? format((dateRaw as any).toDate(), 'd MMM yyyy', { locale: fr }) 
                    : 'Récemment';

                return (
                  <TableRow key={cert.id} className="border-slate-800 hover:bg-slate-800/40">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8 border border-slate-700">
                          <AvatarImage src={cert.student?.profilePictureURL} />
                          <AvatarFallback className="bg-slate-800 text-[10px] font-bold text-slate-500">
                              {cert.student?.fullName?.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-bold text-white text-sm">{cert.student?.fullName || 'Utilisateur'}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-slate-300 text-sm">
                        <BookOpen className="h-3.5 w-3.5 text-primary" />
                        <span className="line-clamp-1">{cert.course?.title || 'Cours supprimé'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-500 text-xs">
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" />
                        {formattedDate}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-9 px-4 rounded-xl font-bold text-primary hover:bg-primary/10"
                        onClick={() => handleViewCertificate(cert)}
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        Voir
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
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