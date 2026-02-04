
'use client';

/**
 * @fileOverview Gestion des devoirs pour les étudiants (Android-First).
 * Liste filtrable des tâches à accomplir et historique des soumissions.
 */

import { useState, useMemo, useEffect } from 'react';
import { useRole } from '@/context/RoleContext';
import { getFirestore, collection, query, where, getDocs, collectionGroup, orderBy } from 'firebase/firestore';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ClipboardCheck, Clock, AlertCircle, CheckCircle2, ChevronRight, Bot, BookOpen } from 'lucide-react';
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

  useEffect(() => {
    if (!currentUser?.uid) return;

    const fetchData = async () => {
      setIsLoading(true);
      try {
        // 1. Récupérer les inscriptions pour savoir quels cours l'étudiant suit
        const enrollQuery = query(collection(db, 'enrollments'), where('studentId', '==', currentUser.uid));
        const enrollSnap = await getDocs(enrollQuery);
        const enrolledCourseIds = enrollSnap.docs.map(d => d.data().courseId);

        if (enrolledCourseIds.length === 0) {
          setIsLoading(false);
          return;
        }

        // 2. Récupérer tous les devoirs (via Collection Group pour simplifier le prototype)
        const assignmentsQuery = query(collectionGroup(db, 'assignments'), orderBy('createdAt', 'desc'));
        const assignmentsSnap = await getDocs(assignmentsQuery);
        
        // Filtrer les devoirs appartenant aux cours de l'étudiant
        const filteredAssignments = assignmentsSnap.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter((a: any) => enrolledCourseIds.includes(a.courseId));

        // 3. Récupérer les soumissions de l'étudiant
        const submissionsQuery = query(collection(db, 'devoirs'), where('studentId', '==', currentUser.uid));
        const submissionsSnap = await getDocs(submissionsQuery);
        const subMap: Record<string, any> = {};
        submissionsSnap.forEach(doc => {
          const data = doc.data();
          subMap[data.assignmentId] = data;
        });

        setAssignments(filteredAssignments);
        setSubmissions(subMap);
      } catch (error) {
        console.error("Error fetching assignments:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [currentUser?.uid, db]);

  const { toDo, completed } = useMemo(() => {
    return {
      toDo: assignments.filter(a => !submissions[a.id]),
      completed: assignments.filter(a => !!submissions[a.id])
    };
  }, [assignments, submissions]);

  return (
    <div className="flex flex-col gap-6 pb-24 bg-slate-950 min-h-screen bg-grainy">
      <header className="px-4 pt-8">
        <h1 className="text-3xl font-black text-white">Mes Devoirs</h1>
        <p className="text-slate-500 text-sm mt-1 font-medium italic">"Tonga na ndara" — Progressez par l'exercice.</p>
      </header>

      <Tabs defaultValue="todo" className="w-full">
        <TabsList className="w-full bg-transparent border-b border-slate-800 rounded-none h-12 p-0 px-4 justify-start gap-8">
          <TabsTrigger 
            value="todo" 
            className="data-[state=active]:bg-transparent data-[state=active]:text-[#CC7722] border-b-2 border-transparent data-[state=active]:border-[#CC7722] rounded-none h-full px-0 font-black text-[10px] uppercase tracking-[0.2em] text-slate-500"
          >
            À faire ({toDo.length})
          </TabsTrigger>
          <TabsTrigger 
            value="completed" 
            className="data-[state=active]:bg-transparent data-[state=active]:text-[#CC7722] border-b-2 border-transparent data-[state=active]:border-[#CC7722] rounded-none h-full px-0 font-black text-[10px] uppercase tracking-[0.2em] text-slate-500"
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
                Vous n'avez pas encore terminé de devoirs.
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
    <Card className="bg-slate-900/50 border-slate-800 shadow-xl overflow-hidden group">
      <CardContent className="p-5">
        <div className="flex justify-between items-start gap-4 mb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-[10px] font-black text-[#CC7722] uppercase tracking-widest">
              <BookOpen className="h-3 w-3" />
              <span className="truncate max-w-[150px]">{assignment.courseTitle || 'Formation Ndara'}</span>
            </div>
            <h3 className="text-lg font-bold text-white leading-tight group-hover:text-[#CC7722] transition-colors">
              {assignment.title}
            </h3>
          </div>
          
          {submission ? (
            <Badge className="bg-green-500/10 text-green-400 border-none text-[9px] font-black uppercase">
              Rendu
            </Badge>
          ) : isOverdue ? (
            <Badge className="bg-red-500/10 text-red-400 border-none text-[9px] font-black uppercase">
              En retard
            </Badge>
          ) : (
            <Badge className="bg-[#CC7722]/10 text-[#CC7722] border-none text-[9px] font-black uppercase">
              À faire
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-4 text-xs text-slate-500 font-medium">
          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            <span>Échéance : {dueDate ? format(dueDate, 'dd MMM yyyy', { locale: fr }) : 'Aucune'}</span>
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="px-5 pb-5 pt-0">
        <Button 
          asChild 
          className={cn(
            "w-full h-12 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all active:scale-95",
            submission ? "bg-slate-800 text-slate-400" : "bg-[#CC7722] text-white shadow-lg shadow-[#CC7722]/20"
          )}
        >
          <Link href={submission ? `/student/devoirs/${assignment.id}` : `/student/courses/${assignment.courseId}`}>
            {submission ? "Voir ma soumission" : "Commencer le devoir"}
            <ChevronRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-8 text-center bg-slate-900/20 rounded-[2.5rem] border-2 border-dashed border-slate-800/50">
      <div className="p-6 bg-[#CC7722]/10 rounded-full mb-6">
        <Bot className="h-16 w-16 text-[#CC7722] opacity-80" />
      </div>
      <h3 className="text-xl font-black text-white leading-tight">Bravo ! Aucun devoir <br/>pour le moment.</h3>
      <p className="text-slate-500 text-sm mt-3 leading-relaxed max-w-[200px] mx-auto font-medium">
        Profitez de ce temps libre pour discuter avec <span className="text-[#CC7722] font-bold">Mathias</span> et approfondir vos cours.
      </p>
      <Button asChild variant="outline" className="mt-8 border-slate-700 text-slate-300 rounded-xl h-12 px-8 font-black uppercase text-[10px] tracking-widest">
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
