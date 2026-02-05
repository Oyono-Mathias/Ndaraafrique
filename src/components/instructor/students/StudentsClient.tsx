'use client';

import { useState, useMemo, useEffect } from 'react';
import { useCollection } from '@/firebase';
import { getFirestore, collection, query, where, getDocs, documentId, orderBy } from 'firebase/firestore';
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
import { Search, Users, MessageSquare, Loader2, BookOpen, Clock } from 'lucide-react';
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

  // 1. Récupérer les cours de l'instructeur
  const coursesQuery = useMemo(
    () => currentUser ? query(collection(db, 'courses'), where('instructorId', '==', currentUser.uid)) : null,
    [db, currentUser]
  );
  const { data: courses, isLoading: coursesLoading } = useCollection<Course>(coursesQuery);

  // 2. Récupérer les inscriptions
  const enrollmentsQuery = useMemo(
    () => currentUser ? query(collection(db, 'enrollments'), where('instructorId', '==', currentUser.uid), orderBy('enrollmentDate', 'desc')) : null,
    [db, currentUser]
  );
  const { data: enrollments, isLoading: enrollmentsLoading } = useCollection<Enrollment>(enrollmentsQuery);

  const [enrichedEnrollments, setEnrichedEnrollments] = useState<EnrichedEnrollment[]>([]);
  const [relatedDataLoading, setRelatedDataLoading] = useState(true);

  useEffect(() => {
    if (!enrollments || enrollments.length === 0) {
        setEnrichedEnrollments([]);
        setRelatedDataLoading(false);
        return;
    };

    const enrichData = async () => {
        setRelatedDataLoading(true);
        const studentIds = [...new Set(enrollments.map(e => e.studentId))];
        const courseIds = [...new Set(enrollments.map(e => e.courseId))];

        const studentsMap = new Map<string, Partial<NdaraUser>>();
        const coursesMap = new Map<string, Partial<Course>>();

        // Fetch students
        if (studentIds.length > 0) {
            const studentsSnap = await getDocs(query(collection(db, 'users'), where('uid', 'in', studentIds.slice(0, 30))));
            studentsSnap.forEach(doc => studentsMap.set(doc.id, doc.data() as NdaraUser));
        }
        
        // Fetch courses details
        if (courseIds.length > 0) {
            const coursesSnap = await getDocs(query(collection(db, 'courses'), where(documentId(), 'in', courseIds.slice(0, 30))));
            coursesSnap.forEach(doc => coursesMap.set(doc.id, { id: doc.id, ...doc.data() } as Course));
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
        toast({ variant: 'destructive', title: 'Erreur', description: "Impossible de démarrer la conversation." });
    } finally {
        setIsContacting(null);
    }
  };

  const isLoading = isUserLoading || coursesLoading || enrollmentsLoading || relatedDataLoading;

  return (
    <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl rounded-2xl overflow-hidden">
      <CardContent className="p-6 space-y-6">
        
        {/* --- FILTRES --- */}
        <div className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="relative flex-1 w-full">
             <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Rechercher</label>
             <div className="relative mt-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                    placeholder="Nom de l'étudiant..."
                    className="pl-10 h-12 bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 rounded-xl"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
             </div>
          </div>
          <div className="w-full sm:w-[250px]">
            <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Par Formation</label>
            <Select value={courseFilter} onValueChange={setCourseFilter} disabled={isLoading}>
                <SelectTrigger className="h-12 bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 rounded-xl mt-1">
                    <SelectValue placeholder="Choisir un cours..." />
                </SelectTrigger>
                <SelectContent>
                <SelectItem value="all">Toutes mes formations</SelectItem>
                {courses?.map(course => <SelectItem key={course.id} value={course.id}>{course.title}</SelectItem>)}
                </SelectContent>
            </Select>
          </div>
        </div>

        {/* --- TABLE DES ÉTUDIANTS --- */}
        <div className="border rounded-2xl border-slate-200 dark:border-slate-800 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-800/50">
                  <TableHead className="font-black uppercase text-[10px] tracking-widest">Apprenant</TableHead>
                  <TableHead className="font-black uppercase text-[10px] tracking-widest hidden lg:table-cell">Cours suivi</TableHead>
                  <TableHead className="font-black uppercase text-[10px] tracking-widest hidden md:table-cell">Inscription</TableHead>
                  <TableHead className="font-black uppercase text-[10px] tracking-widest">Progression</TableHead>
                  <TableHead className="text-right font-black uppercase text-[10px] tracking-widest">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  [...Array(5)].map((_, i) => (
                    <TableRow key={i}><TableCell colSpan={5}><Skeleton className="h-10 w-full bg-slate-200 dark:bg-slate-800" /></TableCell></TableRow>
                  ))
                ) : filteredData.length > 0 ? (
                  filteredData.map(item => (
                    <TableRow key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 border-slate-200 dark:border-slate-800">
                      <TableCell>
                         <div className="flex items-center gap-3">
                           <Avatar className="h-10 w-10 border border-slate-200 dark:border-slate-700 shadow-sm">
                               <AvatarImage src={item.student?.profilePictureURL}/>
                               <AvatarFallback className="bg-slate-200 dark:bg-slate-800 font-bold">{item.student?.fullName?.charAt(0)}</AvatarFallback>
                           </Avatar>
                           <div className="flex flex-col">
                               <span className="font-bold text-sm text-slate-900 dark:text-white">{item.student?.fullName || 'Utilisateur'}</span>
                               <span className="text-[10px] text-slate-500 font-medium">@{item.student?.username}</span>
                           </div>
                        </div>
                      </TableCell>
                       <TableCell className="text-slate-600 dark:text-slate-400 text-xs hidden lg:table-cell font-medium">
                           <div className="flex items-center gap-2">
                               <BookOpen className="h-3 w-3 text-primary" />
                               <span className="truncate max-w-[200px]">{item.course?.title}</span>
                           </div>
                       </TableCell>
                       <TableCell className="text-slate-500 dark:text-slate-500 text-xs hidden md:table-cell">
                        <div className="flex items-center gap-1.5">
                            <Clock className="h-3 w-3" />
                            {item.enrollmentDate ? format((item.enrollmentDate as any).toDate(), 'd MMM yyyy', { locale: fr }) : 'N/A'}
                        </div>
                       </TableCell>
                       <TableCell>
                        <div className="space-y-1.5 w-32">
                           <div className="flex justify-between items-center text-[9px] font-black text-slate-500 uppercase tracking-tighter">
                               <span>{item.progress}%</span>
                               {item.progress === 100 && <span className="text-green-500">Terminé</span>}
                           </div>
                           <Progress value={item.progress} className="h-1.5 bg-slate-200 dark:bg-slate-800" indicatorClassName={cn(item.progress === 100 ? "bg-green-500" : "bg-primary")} />
                        </div>
                       </TableCell>
                       <TableCell className="text-right">
                         <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleContact(item.studentId || '')} 
                            disabled={isContacting === item.studentId}
                            className="h-9 px-4 rounded-xl font-bold text-primary hover:bg-primary/10"
                         >
                            {isContacting === item.studentId ? <Loader2 className="h-4 w-4 animate-spin"/> : <MessageSquare className="mr-2 h-4 w-4"/>}
                            Contacter
                         </Button>
                       </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow><TableCell colSpan={5} className="h-64 text-center">
                     <div className="flex flex-col items-center justify-center gap-3 opacity-30">
                        <Users className="h-16 w-16 text-slate-400" />
                        <p className="font-black uppercase text-xs tracking-widest">Aucun étudiant trouvé</p>
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
