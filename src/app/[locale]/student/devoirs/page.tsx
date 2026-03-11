
'use client';

/**
 * @fileOverview Gestion des devoirs pour les étudiants (Android-First).
 * Liste filtrable des tâches à accomplir et historique des soumissions.
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
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Clock, ChevronRight, ClipboardCheck, BookOpen, Search } from 'lucide-react';
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

    // 1. Écouter les inscriptions pour savoir quels cours l'étudiant suit
    const enrollQuery = query(collection(db, 'enrollments'), where('studentId', '==', currentUser.uid));
    
    const unsubEnroll = onSnapshot(enrollQuery, (enrollSnap) => {
      const enrolledCourseIds = enrollSnap.docs.map(d => d.data().courseId);

      if (enrolledCourseIds.length === 0) {
        setAssignments([]);
        setIsLoading(false);
        return;
      }

      // 2. Écouter tous les devoirs et filtrer ceux des cours inscrits
      const assignmentsQuery = query(collectionGroup(db, 'assignments'), orderBy('createdAt', 'desc'));
      const unsubAssignments = onSnapshot(assignmentsQuery, (assignSnap) => {
        const filtered = assignSnap.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter((a: any) => enrolledCourseIds.includes(a.courseId));
        
        setAssignments(filtered);
      });

      // 3. Écouter les soumissions existantes de l'étudiant
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
    <div className="flex flex-col gap-8 pb-24 bg-slate-950 min-h-screen bg-grainy">
      <header className="px-4 pt-8 space-y-6">
        <div className="space-y-1">
            <div className="flex items-center gap-2 text-primary mb-2">
                <ClipboardCheck className="h-5 w-5" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">Pédagogie & Exercices</span>
            </div>
            <h1 className="text-3xl font-black text-white uppercase tracking-tight">Mes Devoirs</h1>
        </div>
        
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-600" />
          <Input 
            placeholder="Chercher un devoir ou une formation..." 
            className="h-14 pl-12 bg-slate-900 border-slate-800 rounded-2xl text-white placeholder:text-slate-600 focus-visible:ring-primary/30"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </header>

      <Tabs defaultValue="todo" className="w-full">
        <TabsList className="w-full bg-transparent border-b border-slate-800 rounded-none h-12 p-0 px-4 justify-start gap-8">
          <TabsTrigger 
            value="todo" 
            className="data-[state=active]:bg-transparent data-[state=active]:text-primary border-b-2 border-transparent data-[state=active]:border-primary rounded-none h-full px-0 font-black text-[10px] uppercase tracking-widest text-slate-500"
          >
            À FAIRE ({toDo.length})
          </TabsTrigger>
          <TabsTrigger 
            value="completed" 
            className="data-[state=active]:bg-transparent data-[state=active]:text-primary border-b-2 border-transparent data-[state=active]:border-primary rounded-none h-full px-0 font-black text-[10px] uppercase tracking-widest text-slate-500"
          >
            RENDUS ({completed.length})
          </TabsTrigger>
        </TabsList>

        <div className="px-4 mt-8">
          <TabsContent value="todo" className="m-0 space-y-4">
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(2)].map((_, i) => <Skeleton key={i} className="h-48 w-full rounded-[2.5rem] bg-slate-900 border border-slate-800" />)}
              </div>
            ) : toDo.length > 0 ? (
              toDo.map(a => <AssignmentCard key={a.id} assignment={a} />)
            ) : (
              <div className="flex flex-col items-center justify-center py-20 px-8 text-center bg-slate-900/20 rounded-[3rem] border-2 border-dashed border-slate-800/50 animate-in zoom-in duration-500">
                <div className="p-6 bg-slate-800/50 rounded-full mb-6">
                    <ClipboardCheck className="h-16 w-16 text-slate-700" />
                </div>
                <h3 className="text-xl font-black text-white uppercase tracking-tight">Tout est à jour !</h3>
                <p className="text-slate-500 text-sm mt-3 leading-relaxed max-w-[220px] mx-auto font-medium">
                    Vous n'avez aucun devoir en attente pour le moment.
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="completed" className="m-0 space-y-4">
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(2)].map((_, i) => <Skeleton key={i} className="h-48 w-full rounded-[2.5rem] bg-slate-900 border border-slate-800" />)}
              </div>
            ) : completed.length > 0 ? (
              completed.map(a => <AssignmentCard key={a.id} assignment={a} submission={submissions[a.id]} />)
            ) : (
              <div className="text-center py-24 text-slate-600 font-bold uppercase text-[10px] tracking-widest opacity-30">
                Aucun devoir rendu pour l'instant.
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
  const isGraded = submission?.status === 'graded';
  
  return (
    <Card className="bg-slate-900 border-slate-800 shadow-2xl rounded-[2.5rem] overflow-hidden group active:scale-[0.98] transition-all duration-300">
      <CardContent className="p-6">
        <div className="flex justify-between items-start gap-4 mb-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-[10px] font-black text-primary uppercase tracking-widest">
              <BookOpen className="h-3.5 w-3.5" />
              <span className="truncate max-w-[180px]">{assignment.courseTitle || 'Formation Ndara'}</span>
            </div>
            <h3 className="text-lg font-bold text-white leading-tight group-hover:text-primary transition-colors uppercase tracking-tight">
              {assignment.title}
            </h3>
          </div>
          
          {submission ? (
            <Badge className={cn(
                "border-none text-[9px] font-black uppercase px-3 py-1",
                isGraded ? "bg-green-500 text-white" : "bg-primary text-white"
            )}>
                {isGraded ? "Noté" : "En attente"}
            </Badge>
          ) : isOverdue ? (
            <Badge className="bg-red-500 text-white border-none text-[9px] font-black uppercase px-3 py-1 shadow-lg shadow-red-500/20">Retard</Badge>
          ) : (
            <Badge variant="secondary" className="bg-slate-800 text-slate-400 border-none text-[9px] font-black uppercase px-3 py-1">À faire</Badge>
          )}
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold uppercase tracking-widest">
            <Clock className="h-4 w-4 text-slate-700" />
            <span>Limite : {dueDate ? format(dueDate, 'dd MMM yyyy', { locale: fr }) : 'Aucune'}</span>
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="px-6 pb-6 pt-0">
        <Button 
          asChild 
          className={cn(
            "w-full h-14 rounded-2xl font-black uppercase text-xs tracking-widest transition-all",
            submission ? "bg-slate-800 text-slate-400 hover:bg-slate-750" : "bg-primary text-white shadow-xl shadow-primary/20"
          )}
        >
          <Link href={`/student/devoirs/${assignment.id}`}>
            {isGraded ? "Consulter ma note" : submission ? "Voir ma soumission" : "Ouvrir l'exercice"}
            <ChevronRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
