'use client';

import { useState, useMemo } from 'react';
import { useCollection } from '@/firebase';
import { getFirestore, collection, query, where, orderBy } from 'firebase/firestore';
import { useRole } from '@/context/RoleContext';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Edit, Frown, ClipboardCheck } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { GradingModal } from './GradingModal';
import type { AssignmentSubmission, Course } from '@/lib/types';
import { cn } from '@/lib/utils';

export function AssignmentsClient() {
  const db = getFirestore();
  const { currentUser } = useRole();
  const [courseFilter, setCourseFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('submitted');
  const [selectedSubmission, setSelectedSubmission] = useState<AssignmentSubmission | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Récupérer les cours pour le filtre
  const coursesQuery = useMemo(
    () => currentUser ? query(collection(db, 'courses'), where('instructorId', '==', currentUser.uid)) : null,
    [db, currentUser]
  );
  const { data: courses, isLoading: coursesLoading } = useCollection<Course>(coursesQuery);

  // Récupérer toutes les soumissions de devoirs (collection 'devoirs')
  const submissionsQuery = useMemo(
    () => currentUser ? query(collection(db, 'devoirs'), where('instructorId', '==', currentUser.uid), orderBy('submittedAt', 'desc')) : null,
    [db, currentUser]
  );
  const { data: allSubmissions, isLoading: submissionsLoading } = useCollection<AssignmentSubmission>(submissionsQuery);

  const filteredSubmissions = useMemo(() => {
    if (!allSubmissions) return [];
    return allSubmissions.filter(sub => {
      const courseMatch = courseFilter === 'all' || sub.courseId === courseFilter;
      const statusMatch = statusFilter === 'all' || sub.status === statusFilter;
      return courseMatch && statusMatch;
    });
  }, [allSubmissions, courseFilter, statusFilter]);

  const handleGradeClick = (submission: AssignmentSubmission) => {
    setSelectedSubmission(submission);
    setIsModalOpen(true);
  };
  
  const getStatusVariant = (status: AssignmentSubmission['status']) => {
    return status === 'submitted' ? 'warning' : 'success';
  };

  const isLoading = coursesLoading || submissionsLoading;

  return (
    <>
      <GradingModal submission={selectedSubmission} isOpen={isModalOpen} onOpenChange={setIsModalOpen} />
      
      <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl rounded-2xl overflow-hidden">
        <CardContent className="p-6 space-y-6">
          {/* --- FILTRES --- */}
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="space-y-1.5 w-full sm:w-[250px]">
                <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Formation</label>
                <Select value={courseFilter} onValueChange={setCourseFilter}>
                <SelectTrigger className="h-12 bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 rounded-xl">
                    <SelectValue placeholder="Filtrer par cours..." />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">Toutes mes formations</SelectItem>
                    {courses?.map(course => <SelectItem key={course.id} value={course.id}>{course.title}</SelectItem>)}
                </SelectContent>
                </Select>
            </div>
            
            <div className="space-y-1.5 w-full sm:w-[180px]">
                <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">État</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-12 bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 rounded-xl">
                    <SelectValue placeholder="Statut..." />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">Tous les devoirs</SelectItem>
                    <SelectItem value="submitted">À corriger</SelectItem>
                    <SelectItem value="graded">Déjà notés</SelectItem>
                </SelectContent>
                </Select>
            </div>
          </div>
          
          {/* --- TABLE --- */}
          <div className="border rounded-2xl border-slate-200 dark:border-slate-800 overflow-hidden bg-slate-50/30 dark:bg-black/20">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-800/50">
                  <TableHead className="font-black uppercase text-[10px] tracking-widest">Apprenant</TableHead>
                  <TableHead className="font-black uppercase text-[10px] tracking-widest hidden md:table-cell">Cours</TableHead>
                  <TableHead className="font-black uppercase text-[10px] tracking-widest">Soumission</TableHead>
                  <TableHead className="font-black uppercase text-[10px] tracking-widest text-center">Note</TableHead>
                  <TableHead className="text-right font-black uppercase text-[10px] tracking-widest">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  [...Array(5)].map((_, i) => (
                    <TableRow key={i}><TableCell colSpan={5}><Skeleton className="h-10 w-full bg-slate-200 dark:bg-slate-800" /></TableCell></TableRow>
                  ))
                ) : filteredSubmissions.length > 0 ? (
                  filteredSubmissions.map(sub => (
                    <TableRow key={sub.id} className="hover:bg-slate-100/50 dark:hover:bg-slate-800/30 border-slate-200 dark:border-slate-800">
                      <TableCell>
                        <div className="flex items-center gap-3">
                           <Avatar className="h-9 w-9 border border-slate-200 dark:border-slate-700">
                               <AvatarImage src={sub.studentAvatarUrl}/>
                               <AvatarFallback className="bg-slate-200 dark:bg-slate-800 text-slate-500 font-bold">{sub.studentName.charAt(0)}</AvatarFallback>
                           </Avatar>
                           <div className="flex flex-col">
                               <span className="font-bold text-sm text-slate-900 dark:text-white">{sub.studentName}</span>
                               <span className="text-[10px] text-slate-500 md:hidden truncate max-w-[120px]">{sub.courseTitle}</span>
                           </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-500 dark:text-slate-400 text-xs hidden md:table-cell font-medium">
                        {sub.courseTitle}
                      </TableCell>
                      <TableCell className="text-slate-500 dark:text-slate-500 text-xs">
                        {(sub.submittedAt as any)?.toDate?.() 
                          ? formatDistanceToNow((sub.submittedAt as any).toDate(), { locale: fr, addSuffix: true }) 
                          : 'Récemment'}
                      </TableCell>
                      <TableCell className="text-center">
                        {sub.status === 'graded' ? (
                            <Badge className={cn(
                                "font-black text-[10px] border-none",
                                (sub.grade || 0) >= 10 ? "bg-green-500/10 text-green-500" : "bg-amber-500/10 text-amber-500"
                            )}>
                                {sub.grade}/20
                            </Badge>
                        ) : (
                            <Badge variant="outline" className="text-[9px] font-black text-slate-400 border-slate-200 dark:border-slate-700">EN ATTENTE</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleGradeClick(sub)}
                            className="h-9 px-4 rounded-xl font-bold text-primary hover:bg-primary/10"
                        >
                          <Edit className="mr-2 h-3.5 w-3.5" />
                          {sub.status === 'graded' ? 'Réviser' : 'Noter'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow><TableCell colSpan={5} className="h-64 text-center">
                     <div className="flex flex-col items-center justify-center gap-3 opacity-30">
                        <ClipboardCheck className="h-16 w-16 text-slate-400" />
                        <p className="font-black uppercase text-xs tracking-widest">Aucun devoir à traiter</p>
                      </div>
                  </TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
