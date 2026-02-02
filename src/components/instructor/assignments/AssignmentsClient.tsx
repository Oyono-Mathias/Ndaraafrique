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
import { Edit, Frown } from 'lucide-react';
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

  const coursesQuery = useMemo(
    () => currentUser ? query(collection(db, 'courses'), where('instructorId', '==', currentUser.uid)) : null,
    [db, currentUser]
  );
  const { data: courses, isLoading: coursesLoading } = useCollection<Course>(coursesQuery);

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
    switch (status) {
        case 'submitted': return 'info';
        case 'graded': return 'success';
        default: return 'default';
    }
  };

  const getStatusLabel = (status: AssignmentSubmission['status']) => {
      return status === 'submitted' ? 'Soumis' : 'Noté';
  }

  const isLoading = coursesLoading || submissionsLoading;

  return (
    <>
      <GradingModal submission={selectedSubmission} isOpen={isModalOpen} onOpenChange={setIsModalOpen} />
      
      <Card className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 shadow-sm">
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <Select value={courseFilter} onValueChange={setCourseFilter}>
              <SelectTrigger className="w-full sm:w-[250px] h-11 text-base bg-white dark:bg-slate-800"><SelectValue placeholder="Filtrer par cours..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les cours</SelectItem>
                {courses?.map(course => <SelectItem key={course.id} value={course.id}>{course.title}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px] h-11 text-base bg-white dark:bg-slate-800"><SelectValue placeholder="Filtrer par statut..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="submitted">Soumis</SelectItem>
                <SelectItem value="graded">Noté</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="border rounded-lg border-slate-200 dark:border-slate-700">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-100 dark:border-slate-700">
                  <TableHead>Étudiant</TableHead>
                  <TableHead>Cours</TableHead>
                  <TableHead>Soumission</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Note</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  [...Array(5)].map((_, i) => (
                    <TableRow key={i}><TableCell colSpan={6}><Skeleton className="h-10 w-full" /></TableCell></TableRow>
                  ))
                ) : filteredSubmissions.length > 0 ? (
                  filteredSubmissions.map(sub => (
                    <TableRow key={sub.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 border-slate-100 dark:border-slate-800">
                      <TableCell>
                        <div className="flex items-center gap-2">
                           <Avatar className="h-7 w-7"><AvatarImage src={sub.studentAvatarUrl}/><AvatarFallback>{sub.studentName.charAt(0)}</AvatarFallback></Avatar>
                           <span className="font-medium text-slate-800 dark:text-white">{sub.studentName}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-500 dark:text-muted-foreground">{sub.courseTitle}</TableCell>
                      <TableCell className="text-slate-500 dark:text-muted-foreground">
                        {/* ✅ Correction robuste du .toDate() */}
                        {sub.submittedAt && typeof (sub.submittedAt as any).toDate === 'function' 
                          ? formatDistanceToNow((sub.submittedAt as any).toDate(), { locale: fr, addSuffix: true }) 
                          : 'Date inconnue'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusVariant(sub.status) as any} className={cn(
                            "capitalize",
                            sub.status === 'submitted' && "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300",
                            sub.status === 'graded' && "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300"
                        )}>{getStatusLabel(sub.status)}</Badge>
                      </TableCell>
                      <TableCell className={cn("font-semibold", sub.grade !== undefined && sub.grade >= 10 ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400')}>
                        {sub.grade !== undefined ? `${sub.grade}/20` : 'N/A'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" onClick={() => handleGradeClick(sub)}>
                          <Edit className="mr-2 h-3.5 w-3.5" />
                          {sub.status === 'graded' ? 'Modifier' : 'Noter'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow><TableCell colSpan={6} className="h-48 text-center text-slate-500 dark:text-muted-foreground">
                     <div className="flex flex-col items-center gap-2">
                        <Frown className="h-8 w-8" />
                        <p>Aucun devoir ne correspond à vos filtres.</p>
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