
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useRole } from '@/context/RoleContext';
import {
  getFirestore,
  collection,
  query,
  where,
  onSnapshot,
  getDocs,
  serverTimestamp,
  doc,
  setDoc,
} from 'firebase/firestore';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { MessageSquare, Search, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslations } from 'next-intl';
import { NdaraUser, Enrollment, Course } from '@/lib/types';
import { startChat } from '@/lib/chat';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useDebounce } from '@/hooks/use-debounce';

interface StudentData {
  id: string; // Unique enrollment ID
  studentId: string;
  name: string;
  email: string;
  courseTitle: string;
  courseId: string;
  progress: number;
  isOnline: boolean;
  lastSeen?: Date;
  avatar?: string;
  initials: string;
}

const StudentCard = ({ student, onContact }: { student: StudentData, onContact: (studentId: string) => void }) => {
    return (
        <Card className="dark:bg-slate-800 dark:border-slate-700">
            <div className="p-4">
                <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={student.avatar} alt={student.name} />
                          <AvatarFallback>{student.initials}</AvatarFallback>
                        </Avatar>
                        <div>
                            <p className="font-bold text-sm text-white">{student.name}</p>
                            <p className="text-xs text-slate-400">{student.email}</p>
                        </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => onContact(student.studentId)}>
                        <MessageSquare className="h-5 w-5 text-primary" />
                    </Button>
                </div>
                <div className="mt-4 space-y-3">
                     <div>
                        <p className="text-xs font-medium text-slate-300 truncate">{student.courseTitle}</p>
                        <div className="flex items-center gap-2 mt-1">
                            <Progress value={student.progress} className="h-1.5" />
                            <span className="text-xs font-semibold text-slate-300">{student.progress}%</span>
                        </div>
                     </div>
                     <div className="text-xs text-slate-400">
                        {student.isOnline ? (
                            <Badge variant="secondary" className="bg-green-500/20 text-green-300 border-green-500/30">En ligne</Badge>
                        ) : (
                           <span>Dernière activité : {student.lastSeen ? formatDistanceToNow(student.lastSeen, { locale: fr, addSuffix: true }) : 'inconnue'}</span>
                        )}
                    </div>
                </div>
            </div>
        </Card>
    )
}

export default function MyStudentsPage() {
  const { toast } = useToast();
  const { currentUser: instructor, isUserLoading, user } = useRole();
  const [students, setStudents] = useState<StudentData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const db = getFirestore();
  const router = useRouter();
  const t = useTranslations();

  const [time, setTime] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setTime(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!instructor?.uid) {
      if (!isUserLoading) setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const enrollmentsQuery = query(
      collection(db, 'enrollments'),
      where('instructorId', '==', instructor.uid)
    );

    const unsubscribe = onSnapshot(enrollmentsQuery, async (snapshot) => {
      if (snapshot.empty) {
        setStudents([]);
        setIsLoading(false);
        return;
      }

      const enrollmentData = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as Enrollment[];

      const studentIds = [...new Set(enrollmentData.map(e => e.studentId))];
      const courseIds = [...new Set(enrollmentData.map(e => e.courseId))];

      const userDocs = studentIds.length > 0 ? await getDocs(query(collection(db, 'users'), where('uid', 'in', studentIds.slice(0,30)))) : { docs: [] };
      const courseDocs = courseIds.length > 0 ? await getDocs(query(collection(db, 'courses'), where('__name__', 'in', courseIds.slice(0,30)))) : { docs: [] };
      
      const usersMap = new Map(userDocs.docs.map(d => [d.data().uid, d.data() as NdaraUser]));
      const coursesMap = new Map(courseDocs.docs.map(d => [d.id, d.data() as Course]));

      const studentsList: StudentData[] = enrollmentData.map(enrollment => {
        const studentInfo = usersMap.get(enrollment.studentId);
        const courseInfo = coursesMap.get(enrollment.courseId);
        const name = studentInfo?.fullName || 'Utilisateur inconnu';
        
        return {
          id: enrollment.id,
          studentId: enrollment.studentId,
          name: name,
          email: studentInfo?.email || 'email inconnu',
          courseTitle: courseInfo?.title || 'Cours inconnu',
          courseId: enrollment.courseId,
          progress: enrollment.progress || 0,
          isOnline: studentInfo?.isOnline || false,
          lastSeen: studentInfo?.lastSeen?.toDate(),
          avatar: studentInfo?.profilePictureURL,
          initials: name.split(' ').map((n:string) => n[0]).join(''),
        };
      });

      setStudents(studentsList);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching students: ", error);
      toast({ variant: 'destructive', title: "Erreur", description: "Impossible de charger les étudiants." });
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [instructor, db, isUserLoading, toast]);
  
  const handleStartChat = useCallback(async (studentId: string) => {
    if (!user) return;
    try {
        const chatId = await startChat(user.uid, studentId);
        router.push(`/messages/${chatId}`);
    } catch(error: any) {
        toast({ variant: 'destructive', title: 'Erreur', description: error.message });
    }
  }, [user, router, toast]);

  const filteredStudents = useMemo(() => {
    if (!debouncedSearchTerm) return students;
    const lowercasedFilter = debouncedSearchTerm.toLowerCase();
    return students.filter(student =>
      student.name.toLowerCase().includes(lowercasedFilter) ||
      student.email.toLowerCase().includes(lowercasedFilter)
    );
  }, [students, debouncedSearchTerm]);
  
  const renderSkeleton = (isMobile = false) => {
    if(isMobile) {
        return (
            <div className="space-y-4">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-32 w-full dark:bg-slate-800" />)}
            </div>
        )
    }
    return (
      [...Array(5)].map((_, i) => (
        <TableRow key={i} className="dark:border-slate-700">
          <TableCell><Skeleton className="h-10 w-40 dark:bg-slate-700" /></TableCell>
          <TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-48 dark:bg-slate-700" /></TableCell>
          <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-32 dark:bg-slate-700" /></TableCell>
          <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-24 dark:bg-slate-700" /></TableCell>
          <TableCell className="hidden sm:table-cell"><Skeleton className="h-4 w-24 dark:bg-slate-700" /></TableCell>
          <TableCell className="text-right"><Skeleton className="h-8 w-8 inline-block dark:bg-slate-700" /></TableCell>
        </TableRow>
      ))
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
            <h1 className="text-3xl font-bold dark:text-white">{t('navMyStudents')}</h1>
            <p className="text-muted-foreground dark:text-slate-400">
              Suivez et interagissez avec vos apprenants.
            </p>
        </div>
      </header>
        
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          placeholder="Rechercher par nom ou email..."
          className="pl-10 w-full md:w-1/3 dark:bg-slate-800 dark:border-slate-700 placeholder:text-slate-400"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="hidden md:block border rounded-lg overflow-hidden dark:border-slate-700">
        <Table>
          <TableHeader>
            <TableRow className="dark:hover:bg-slate-800/50 dark:border-slate-700">
              <TableHead className="w-[250px] dark:text-slate-300">Nom</TableHead>
              <TableHead className="hidden lg:table-cell dark:text-slate-300">Email</TableHead>
              <TableHead className="hidden md:table-cell dark:text-slate-300">Cours</TableHead>
              <TableHead className="w-[150px] hidden md:table-cell dark:text-slate-300">Progression</TableHead>
              <TableHead className="hidden sm:table-cell dark:text-slate-300">Activité</TableHead>
              <TableHead className="text-right dark:text-slate-300">Contacter</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? renderSkeleton() : (
              filteredStudents.length > 0 ? (
                filteredStudents.map((student) => (
                  <TableRow key={student.id} className="dark:hover:bg-slate-800/50 dark:border-slate-700">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={student.avatar} alt={student.name} />
                          <AvatarFallback>{student.initials}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium text-sm text-white">{student.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-slate-400 text-xs">{student.email}</TableCell>
                    <TableCell className="hidden md:table-cell text-slate-300 text-xs truncate max-w-xs">{student.courseTitle}</TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="flex items-center gap-2">
                        <Progress value={student.progress} className="h-1.5" />
                        <span className="text-xs font-semibold text-slate-300">{student.progress}%</span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {student.isOnline ? (
                        <Badge variant="secondary" className="bg-green-500/20 text-green-300 border-green-500/30">En ligne</Badge>
                      ) : (
                        <span className="text-xs text-slate-400">
                           {student.lastSeen ? `Il y a ${formatDistanceToNow(student.lastSeen, { locale: fr })}` : 'inconnue'}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleStartChat(student.studentId)}>
                        <MessageSquare className="h-5 w-5 text-primary" />
                        <span className="sr-only">Contacter</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-48 text-center text-slate-400">
                     <Users className="mx-auto h-12 w-12 mb-4" />
                     <p className="font-semibold text-lg">Aucun étudiant pour le moment</p>
                    {searchTerm ? "Aucun étudiant ne correspond à votre recherche." : "Lorsqu'un étudiant s'inscrira à un de vos cours, il apparaîtra ici."}
                  </TableCell>
                </TableRow>
              )
            )}
          </TableBody>
        </Table>
      </div>
      
      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {isLoading ? renderSkeleton(true) : (
          filteredStudents.length > 0 ? (
            filteredStudents.map((student) => (
                <StudentCard key={student.id} student={student} onContact={handleStartChat} />
            ))
          ) : (
             <div className="text-center py-20 text-slate-400">
                <Users className="mx-auto h-12 w-12 mb-4" />
                <p className="font-semibold text-lg">Aucun étudiant trouvé</p>
             </div>
          )
        )}
      </div>

    </div>
  );
}
