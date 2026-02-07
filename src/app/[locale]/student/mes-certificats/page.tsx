'use client';

/**
 * @fileOverview Liste des certificats de l'étudiant optimisée Android.
 * Affiche uniquement les cours terminés à 100%.
 */

import { useState, useMemo, useEffect } from 'react';
import { useCollection } from '@/firebase';
import { getFirestore, collection, query, where, getDocs, documentId } from 'firebase/firestore';
import { useRole } from '@/context/RoleContext';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Award, Trophy, Share2, Eye, BookOpen, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CertificateModal } from '@/components/modals/certificate-modal';
import type { Enrollment, NdaraUser, Course } from '@/lib/types';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';

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

  // 1. On ne récupère que les enrollments à 100%
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
        
        const newEnrichedData = enrollments.map(e => ({
            ...e,
            student: (currentUser as any) || undefined,
            course: coursesMap.get(e.courseId) || undefined,
            instructor: instructorsMap.get(e.instructorId) || undefined,
        }));

        setEnrichedData(newEnrichedData as EnrichedCertificate[]);
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
    <div className="flex flex-col gap-8 pb-24 bg-slate-950 min-h-screen bg-grainy">
      {selectedCertificate && (
        <CertificateModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          courseName={selectedCertificate.course?.title || ''}
          studentName={selectedCertificate.student?.fullName || 'Étudiant'}
          instructorName={selectedCertificate.instructor?.fullName || ''}
          completionDate={
            selectedCertificate.lastAccessedAt && typeof (selectedCertificate.lastAccessedAt as any).toDate === 'function'
                ? (selectedCertificate.lastAccessedAt as any).toDate()
                : new Date()
          }
          certificateId={selectedCertificate.id}
        />
      )}

      <header className="px-4 pt-8">
        <div className="flex items-center gap-2 text-primary mb-2">
            <Trophy className="h-5 w-5" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Excellence</span>
        </div>
        <h1 className="text-3xl font-black text-white leading-tight">Mes <br/><span className="text-primary">Certificats</span></h1>
        <p className="text-slate-500 text-sm mt-2">Le fruit de votre travail et de votre persévérance.</p>
      </header>

      <div className="px-4 space-y-4">
        {isLoading ? (
          <div className="grid gap-4">
            {[...Array(2)].map((_, i) => <Skeleton key={i} className="h-48 w-full rounded-3xl bg-slate-900" />)}
          </div>
        ) : enrichedData.length > 0 ? (
          <div className="grid gap-6">
            {enrichedData.map(cert => (
              <Card key={cert.id} className="bg-slate-900/50 border-slate-800 overflow-hidden shadow-2xl group active:scale-[0.98] transition-all">
                <CardContent className="p-0">
                    <div className="p-6 space-y-4">
                        <div className="flex justify-between items-start">
                            <div className="p-3 bg-primary/10 rounded-2xl">
                                <Award className="h-8 w-8 text-primary" />
                            </div>
                            <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest bg-slate-800/50 px-3 py-1 rounded-full border border-slate-700">
                                ID: {cert.id.substring(0, 8)}
                            </span>
                        </div>
                        
                        <div className="space-y-1">
                            <h3 className="text-xl font-bold text-white line-clamp-2 leading-tight group-hover:text-primary transition-colors">
                                {cert.course?.title}
                            </h3>
                            <p className="text-xs text-slate-500 font-medium italic">
                                Obtenu le {cert.lastAccessedAt && typeof (cert.lastAccessedAt as any).toDate === 'function' 
                                    ? format((cert.lastAccessedAt as any).toDate(), 'dd MMMM yyyy', { locale: fr }) 
                                    : 'récemment'}
                            </p>
                        </div>
                    </div>
                    
                    <div className="p-4 bg-slate-900 flex gap-2 border-t border-slate-800">
                        <Button 
                            className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-black uppercase text-[10px] tracking-widest h-12"
                            onClick={() => handleViewCertificate(cert)}
                        >
                            <Eye className="mr-2 h-4 w-4" />
                            Voir le diplôme
                        </Button>
                        <Button 
                            variant="outline" 
                            size="icon" 
                            className="h-12 w-12 rounded-xl border-slate-800 bg-slate-900 text-slate-400"
                            onClick={() => {
                                const url = `${window.location.origin}/verify/${cert.id}`;
                                window.open(`https://wa.me/?text=Je suis fier de vous partager mon nouveau certificat Ndara Afrique ! Vérifiez-le ici : ${url}`, '_blank');
                            }}
                        >
                            <Share2 className="h-4 w-4" />
                        </Button>
                    </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 px-8 text-center bg-slate-900/20 rounded-[2.5rem] border-2 border-dashed border-slate-800/50">
            <div className="p-6 bg-slate-800/50 rounded-full mb-6">
              <Award className="h-16 w-16 text-slate-700" />
            </div>
            <h3 className="text-xl font-black text-white leading-tight">Votre premier diplôme <br/>vous attend.</h3>
            <p className="text-slate-500 text-sm mt-3 leading-relaxed max-w-[220px] mx-auto font-medium">
              Terminez vos formations à <span className="text-white font-bold">100%</span> pour débloquer vos certificats officiels.
            </p>
            <Button asChild className="mt-8 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl h-14 px-8 font-black uppercase text-[10px] tracking-widest shadow-xl shadow-primary/20">
              <Link href="/student/courses">
                Reprendre les cours
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
