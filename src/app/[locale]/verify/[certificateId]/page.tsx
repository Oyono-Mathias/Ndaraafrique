
'use client';

import { useParams } from 'next/navigation';
import { Link } from 'next-intl';
import { useDoc } from '@/firebase/firestore/use-doc';
import { useMemo } from 'react';
import { doc, getFirestore } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { BadgeCheck, ShieldAlert } from 'lucide-react';
import type { Enrollment, Course, NdaraUser } from '@/lib/types';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import Image from 'next/image';
import { cn } from '@/lib/utils';

function VerificationPageContent() {
  const params = useParams();
  const certificateId = params.certificateId as string;
  const db = getFirestore();

  // 1. Fetch enrollment document which acts as the certificate
  const enrollmentRef = useMemo(() => certificateId ? doc(db, 'enrollments', certificateId) : null, [db, certificateId]);
  const { data: enrollment, isLoading: enrollmentLoading, error: enrollmentError } = useDoc<Enrollment>(enrollmentRef);

  // 2. Fetch course details based on enrollment
  const courseRef = useMemo(() => enrollment?.courseId ? doc(db, 'courses', enrollment.courseId) : null, [db, enrollment]);
  const { data: course, isLoading: courseLoading } = useDoc<Course>(courseRef);

  // 3. Fetch student details based on enrollment
  const studentRef = useMemo(() => enrollment?.studentId ? doc(db, 'users', enrollment.studentId) : null, [db, enrollment]);
  const { data: student, isLoading: studentLoading } = useDoc<NdaraUser>(studentRef);
  
  // 4. Fetch instructor details based on course
  const instructorRef = useMemo(() => course?.instructorId ? doc(db, 'users', course.instructorId) : null, [db, course]);
  const { data: instructor, isLoading: instructorLoading } = useDoc<NdaraUser>(instructorRef);

  const isLoading = enrollmentLoading || courseLoading || studentLoading || instructorLoading;
  
  const completionDate = enrollment?.lastAccessedAt?.toDate();

  if (isLoading) {
    return <VerificationSkeleton />;
  }

  if (!enrollment || enrollmentError) {
    return (
      <div className="flex flex-col items-center justify-center text-center p-4">
        <ShieldAlert className="w-16 h-16 text-destructive mb-4" />
        <h1 className="text-3xl font-bold text-white">Certificat Invalide</h1>
        <p className="text-slate-400 mt-2 max-w-sm">
          Le numéro de certificat est incorrect ou le certificat n'existe plus. Veuillez vérifier l'URL et réessayer.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto bg-slate-800/50 border border-slate-700/80 rounded-2xl shadow-2xl shadow-primary/10 overflow-hidden">
        <div className="p-8 md:p-12 text-center bg-slate-900/50">
             <BadgeCheck className="h-20 w-20 text-green-400 mx-auto animate-pulse" />
            <h1 className="text-3xl md:text-4xl font-extrabold text-white mt-4">Certificat Vérifié</h1>
             <p className="text-green-400 font-semibold mt-1">Authenticité confirmée par Ndara Afrique</p>
        </div>
        <div className="p-8 md:p-10 space-y-6 bg-slate-800/30">
            <InfoRow label="Décerné à" value={student?.fullName || 'Chargement...'} />
            <InfoRow label="Pour la formation" value={course?.title || 'Chargement...'} />
            {completionDate && <InfoRow label="Obtenu le" value={format(completionDate, 'dd MMMM yyyy', { locale: fr })} />}
            <InfoRow label="Instructeur" value={instructor?.fullName || 'Instructeur inconnu'} />
            <InfoRow label="ID du Certificat" value={certificateId} isMono />
        </div>
    </div>
  );
}

const InfoRow = ({ label, value, isMono = false }: { label: string, value: string, isMono?: boolean }) => (
    <div>
        <p className="text-sm font-semibold text-slate-400 mb-1">{label}</p>
        <p className={cn("text-lg text-white", isMono ? 'font-mono text-base' : 'font-bold')}>{value}</p>
    </div>
);

const VerificationSkeleton = () => (
    <div className="max-w-2xl mx-auto bg-slate-800/50 border border-slate-700/80 rounded-2xl shadow-lg">
        <div className="p-12 text-center bg-slate-900/50">
            <Skeleton className="h-20 w-20 rounded-full mx-auto bg-slate-700" />
            <Skeleton className="h-10 w-3/4 mx-auto mt-6 bg-slate-700" />
        </div>
        <div className="p-10 space-y-8">
            <div className="space-y-2">
                <Skeleton className="h-4 w-1/4 bg-slate-700" />
                <Skeleton className="h-6 w-3/4 bg-slate-700" />
            </div>
             <div className="space-y-2">
                <Skeleton className="h-4 w-1/3 bg-slate-700" />
                <Skeleton className="h-6 w-full bg-slate-700" />
            </div>
             <div className="space-y-2">
                <Skeleton className="h-4 w-1/4 bg-slate-700" />
                <Skeleton className="h-6 w-1/2 bg-slate-700" />
            </div>
        </div>
    </div>
);

export default function VerificationPage() {
    return (
        <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
            <Link href="/" className="flex items-center gap-3 group transition-transform hover:scale-105 mb-8">
                <Image src="/icon.svg" alt="Ndara Afrique Logo" width={32} height={32} />
                <span className="text-xl font-bold tracking-tighter text-white">Ndara Afrique</span>
            </Link>
            <VerificationPageContent />
        </div>
    )
}
