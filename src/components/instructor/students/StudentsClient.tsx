'use client';

import { useState, useMemo, useEffect } from 'react';
import { useCollection } from '@/firebase';
import { getFirestore, collection, query, where, getDocs, documentId } from 'firebase/firestore';
import { useRole } from '@/context/RoleContext';
import { useToast } from '@/hooks/use-toast';
import { startChat } from '@/lib/chat';
import { useRouter } from 'next/navigation';
import type { Enrollment, NdaraUser, Course } from '@/lib/types';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Users, MessageSquare, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EnrichedEnrollment extends Enrollment {
  student?: Partial<NdaraUser>;
  course?: Partial<Course>;
}

export function StudentsClient() {
  const db = getFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const { currentUser, isUserLoading } = useRole();
  
  const [courseFilter, setCourseFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isContacting, setIsContacting] = useState<string | null>(null);

  const coursesQuery = useMemo(
    () => currentUser ? query(collection(db, 'courses'), where('instructorId', '==', currentUser.uid)) : null,
    [db, currentUser]
  );
  const { data: courses, isLoading: coursesLoading } = useCollection<Course>(coursesQuery);

  const enrollmentsQuery = useMemo(
    () => currentUser ? query(collection(db, 'enrollments'), where('instructorId', '==', currentUser.uid)) : null,
    [db, currentUser]
  );
  const { data: enrollments, isLoading: enrollmentsLoading } = useCollection<Enrollment>(enrollmentsQuery);

  const [enrichedEnrollments, setEnrichedEnrollments] = useState<EnrichedEnrollment[]>([]);
  const [relatedDataLoading, setRelatedDataLoading] = useState(true);

  useEffect(() => {
    if (!enrollments) {
        setRelatedDataLoading(false);
        return;
    };

    const enrichData = async () => {
        setRelatedDataLoading(true);

        const studentIds = [...new Set(enrollments.map(e => e.studentId))];
        const courseIds = [...new Set(enrollments.map(e => e.courseId))];

        const studentsMap = new Map<string, Partial<NdaraUser>>();
        const coursesMap = new Map<string, Partial<Course>>();

        if (studentIds.length > 0) {
            for (let i = 0; i < studentIds.length; i += 30) {
                const chunk = studentIds.slice(i, i + 30);
                const q = query(collection(db, 'users'), where('uid', 'in', chunk));
                const snapshot = await getDocs(q);
                snapshot.forEach(doc => studentsMap.set(doc.id, doc.data() as NdaraUser));
            }
        }
        
        if (courseIds.length > 0) {
             for (let i = 0; i < courseIds.length; i += 30) {
                const chunk = courseIds.slice(i, i + 30);
                const q = query(collection(db, 'courses'), where(documentId(), 'in', chunk));
                const snapshot = await getDocs(q);
                snapshot.forEach(doc => coursesMap.set(doc.id, doc.data() as Course));
            }
        }
        
        const newEnrichedData = enrollments.map(e => ({
            ...e,
            student: studentsMap.get(e.studentId),
            course: coursesMap.get(e.courseId)
        }));
        
        setEnrichedEnrollments(newEnrichedData);
        setRelatedDataLoading(false);
    };

    enrichData();
  }, [enrollments, db]);

  const filteredData = useMemo(() => {
    return enrichedEnrollments.filter(item => {
        const courseMatch = courseFilter === 'all' || item.courseId === courseFilter;
        const searchMatch = !searchTerm || item.student?.fullName?.toLowerCase().includes(searchTerm.toLowerCase());
        return courseMatch && searchMatch;
    });
  }, [enrichedEnrollments, courseFilter, searchTerm]);

  const handleContact = async (studentId: string) => {
    if (!currentUser) return;
    setIsContacting(studentId);
    try {
        const chatId = await startChat(currentUser.uid, studentId);
        router.push(`/student/messages?chatId=${chatId}`);
    } catch (error: any) {
        toast({
            variant: 'destructive',
            title: 'Erreur',
            description: error.message || "Impossible de démarrer la conversation."
        });
    } finally {
        setIsContacting(null);
    }
  };

  const isLoading = isUserLoading || coursesLoading || enrollmentsLoading || relatedDataLoading;

  return (
    <Card className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 shadow-sm">
      <CardContent className="p-4 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
             <Input
                placeholder="Rechercher par nom..."
                className="pl-10 h-11 text-base bg-white dark:bg-slate-800"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
          </div>
          <Select value={courseFilter} onValueChange={setCourseFilter} disabled={isLoading}>
            <SelectTrigger className="w-full sm:w-[250px] h-11 text-base bg-white dark:bg-slate-800"><SelectValue placeholder="Filtrer par cours..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les cours</SelectItem>
              {courses?.map(course => <SelectItem key={course.id} value={course.id}>{course.title}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="border rounded-lg border-slate-200 dark:border-slate-700">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-100 dark:border-slate-700">
                  <TableHead>Étudiant</TableHead>
                  <TableHead>Cours</TableHead>
                  <TableHead>Date d'inscription</TableHead>
                  <TableHead>Progression</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  [...Array(5)].map((_, i) => (
                    <TableRow key={i}><TableCell colSpan={5}><Skeleton className="h-10 w-full" /></TableCell></TableRow>
                  ))
                ) : filteredData.length > 0 ? (
                  filteredData.map(item => (
                    <TableRow key={item.id} className="border-slate-100 dark:border-slate-800">
                      <TableCell>
                         <div className="flex items-center gap-2">
                           <Avatar className="h-8 w-8"><AvatarImage src={item.student?.profilePictureURL}/><AvatarFallback>{item.student?.fullName?.charAt(0)}</AvatarFallback></Avatar>
                           <span className="font-medium text-slate-800 dark:text-white">{item.student?.fullName || 'N/A'}</span>
                        </div>
                      </TableCell>
                       <TableCell className="text-slate-500 dark:text-muted-foreground">{item.course?.title || 'N/A'}</TableCell>
                       <TableCell className="text-slate-500 dark:text-muted-foreground">
                        {/* ✅ Correction robuste du .toDate() */}
                        {item.enrollmentDate && typeof (item.enrollmentDate as any).toDate === 'function' 
                          ? format((item.enrollmentDate as any).toDate(), 'd MMM yyyy', { locale: fr }) 
                          : 'N/A'}
                       </TableCell>
                       <TableCell>
                        <div className="flex items-center gap-2">
                           <Progress value={item.progress} className="w-24 h-2" />
                           <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">{item.progress}%</span>
                        </div>
                       </TableCell>
                       <TableCell className="text-right">
                         <Button variant="outline" size="sm" onClick={() => handleContact(item.studentId || '')} disabled={isContacting === item.studentId}>
                            {isContacting === item.studentId ? <Loader2 className="h-4 w-4 animate-spin"/> : <MessageSquare className="mr-2 h-4 w-4"/>}
                            Contacter
                         </Button>
                       </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow><TableCell colSpan={5} className="h-48 text-center text-slate-500 dark:text-muted-foreground">
                     <div className="flex flex-col items-center gap-2">
                        <Users className="h-8 w-8" />
                        <p className="font-semibold">Aucun étudiant inscrit pour le moment</p>
                        <p className="text-sm">Partagez vos cours pour attirer de nouveaux apprenants.</p>
                      </div>
                  </TableCell></TableRow>
                )}
              </TableBody>
            </Table>
        </div>
      </CardContent>
    </Card>
  );
}