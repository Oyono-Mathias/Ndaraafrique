'use client';

/**
 * @fileOverview Gestion des devoirs pour les étudiants (Android-First).
 * Liste filtrable des tâches à accomplir et historique des soumissions.
 * Design harmonisé avec "Mes Formations" (Variables Primary).
 */

import { useState, useMemo, useEffect } from 'react';
import { useRole } from '@/context/RoleContext';
import { 
  getFirestore, 
  collection, 
  query, 
  where, 
  onSnapshot, 
  collectionGroup, 
  orderBy 
} from 'firebase/firestore';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Clock, ChevronRight, Bot, BookOpen, Search, ClipboardList } from 'lucide-react';
import { format, isAfter } from 'date-fns';
import { fr } from 'date-fns/locale';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export default function StudentAssignmentsPage() {
  const { currentUser, isUserLoading } = useRole();
  const db = getFirestore();
  const [assignments, setAssignments] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!currentUser?.uid) return;

    setIsLoading(true);

    const enrollQuery = query(collection(db, 'enrollments'), where('studentId', '==', currentUser.uid));
    
    const unsubEnroll = onSnapshot(enrollQuery, (enrollSnap) => {
      const enrolledCourseIds = enrollSnap.docs.map(d => d.data().courseId);

      if (enrolledCourseIds.length === 0) {
        setAssignments([]);
        setIsLoading(false);
        return;
      }

      const assignmentsQuery = query(collectionGroup(db, 'assignments'), orderBy('createdAt', 'desc'));
      const unsubAssignments = onSnapshot(assignmentsQuery, (assignSnap) => {
        const filtered = assignSnap.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter((a: any) => enrolledCourseIds.includes(a.courseId));
        
        setAssignments(filtered);
      });

      const submissionsQuery = query(collection(db, 'devoirs'), where('studentId', '==', currentUser.uid));
      const unsubSubmissions = onSnapshot(submissionsQuery, (subSnap) => {
        const subMap: Record<string, any> = {};
        subSnap.forEach(doc => {
          const data = doc.data();
          subMap[data.assignmentId] = data;
        });
        setSubmissions(subMap);
        setIsLoading(false);
      });

      return () => {
        unsubAssignments();
        unsubSubmissions();
      };
    });

    return () => unsubEnroll();
  }, [currentUser?.uid, db]);

  const filteredAssignments = useMemo(() => {
    return assignments.filter(a => 
      a.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (a.courseTitle && a.courseTitle.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [assignments, searchTerm]);

  const { toDo, completed } = useMemo(() => {
    return {
      toDo: filteredAssignments.filter(a => !submissions[a.id]),
      completed: filteredAssignments.filter(a => !!submissions[a.id])
    };
  }, [filteredAssignments, submissions]);

  return (
    <div className="flex flex-col gap-6 pb-24 bg-slate-950 min-h-screen">
      {/* HEADER : Aligné sur Mes Formations */}
      <header className="px-4 pt-6 space-y-4">
        <h1 className="text-2xl font-black text-white">Mes Devoirs</h1>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <Input 
            placeholder="Rechercher un devoir..." 
            className="pl-10 bg-slate-900 border-slate-800 h-12 rounded-xl text-white"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </header>

      <Tabs defaultValue="todo" className="w-full">
        {/* Navigation : Aligné sur Mes Formations */}
        <TabsList className="w-full bg-transparent border-b border-slate-800 rounded-none h-12 p-0 px-4 justify-start gap-6">
          <TabsTrigger 
            value="todo" 
            className="data-[state=active]:bg-transparent data-[state=active]:text-primary border-b-2 border-transparent data-[state=active]:border-primary rounded-none h-full px-0 font-bold text-xs uppercase tracking-widest text-slate-500"
          >
            À faire ({toDo.length})
          </TabsTrigger>
          <TabsTrigger 
            value="completed" 
            className="data-[state=active]:bg-transparent data-[state=active]:text-primary border-b-2 border-transparent data-[state=active]:border-primary rounded-none h-full px-0 font-bold text-xs uppercase tracking-widest text-slate-500"
          >
            Terminés ({completed.length})
          </TabsTrigger>
        </TabsList>

        <div className="px-4 mt-6">
          <TabsContent value="todo" className="m-0 space-y-4">
            {isLoading ? (
              <LoadingSkeleton />
            ) : toDo.length > 0 ? (
              toDo.map(a => <AssignmentCard key={a.id} assignment={a} />)
            ) : (
              <EmptyState />
            )}
          </TabsContent>

          <TabsContent value="completed" className="m-0 space-y-4">
            {isLoading ? (
              <LoadingSkeleton />
            ) : completed.length > 0 ? (
              completed.map(a => <AssignmentCard key={a.id} assignment={a} submission={submissions[a.id]} />)
            ) : (
              <div className="text-center py-20 text-slate-600 italic text-sm">
                Aucun devoir terminé pour l'instant.
              </div>
            )}
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

function AssignmentCard({ assignment, submission }: { assignment: any, submission?: any }) {
  const dueDate = (assignment.dueDate as any)?.toDate?.() || null;
  const isOverdue = dueDate && isAfter(new Date(), dueDate) && !submission;
  
  return (
    <Card className="bg-slate-900 border-slate-800 shadow-xl overflow-hidden group">
      <CardContent className="p-5">
        <div className="flex justify-between items-start gap-4 mb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-[10px] font-black text-primary uppercase tracking-widest">
              <BookOpen className="h-3 w-3" />
              <span className="truncate max-w-[150px]">{assignment.courseTitle || 'Formation Ndara'}</span>
            </div>
            <h3 className="text-sm font-bold text-white line-clamp-2 leading-tight group-hover:text-primary transition-colors">
              {assignment.title}
            </h3>
          </div>
          
          {submission ? (
            <Badge className="bg-green-500/10 text-green-400 border-none text-[9px] font-black uppercase">
              Rendu
            </Badge>
          ) : isOverdue ? (
            <Badge className="bg-red-500/10 text-red-400 border-none text-[9px] font-black uppercase">
              Retard
            </Badge>
          ) : (
            <Badge variant="secondary" className="border-none text-[9px] font-black uppercase">
              Actif
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-4 text-xs text-slate-500 font-medium">
          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            <span>{dueDate ? format(dueDate, 'dd MMM yyyy', { locale: fr }) : 'Sans limite'}</span>
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="px-5 pb-5 pt-0">
        <Button 
          asChild 
          className={cn(
            "w-full h-12 rounded-xl font-bold uppercase text-[10px] tracking-widest transition-all active:scale-95",
            submission ? "bg-slate-800 text-slate-400" : "bg-primary text-white shadow-lg shadow-primary/20"
          )}
        >
          <Link href={submission ? `/student/devoirs/${assignment.id}` : `/student/courses/${assignment.courseId}`}>
            {submission ? "Consulter ma note" : "Ouvrir l'exercice"}
            <ChevronRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-8 text-center bg-slate-900/20 rounded-[2rem] border-2 border-dashed border-slate-800/50">
      <div className="p-6 bg-slate-800/50 rounded-full mb-6">
        <Bot className="h-16 w-16 text-slate-700" />
      </div>
      <h3 className="text-xl font-black text-white leading-tight">Aucun devoir <br/>en attente.</h3>
      <p className="text-slate-500 text-sm mt-3 leading-relaxed max-w-[200px] mx-auto font-medium">
        C'est le moment idéal pour poser une question à <span className="text-primary font-bold">Mathias</span> sur vos leçons.
      </p>
      <Button asChild variant="outline" className="mt-8 border-slate-700 text-slate-300 rounded-xl h-12 px-8 font-bold uppercase text-[10px] tracking-widest">
        <Link href="/student/tutor">Interroger Mathias</Link>
      </Button>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(2)].map((_, i) => (
        <Skeleton key={i} className="h-48 w-full rounded-2xl bg-slate-900" />
      ))}
    </div>
  );
}