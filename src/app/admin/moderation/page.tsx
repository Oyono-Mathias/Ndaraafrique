
'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRole } from '@/context/RoleContext';
import { useCollection, useMemoFirebase } from '@/firebase';
import {
  getFirestore,
  collection,
  query,
  orderBy,
  where,
  doc,
  updateDoc,
} from 'firebase/firestore';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Eye, CheckCircle, Clock, ShieldAlert, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Course } from '@/lib/types';


export default function AdminModerationPage() {
  const { formaAfriqueUser: adminUser, isUserLoading } = useRole();
  const db = getFirestore();
  const { toast } = useToast();
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const coursesQuery = useMemoFirebase(
    () => query(collection(db, 'courses'), where('status', '==', 'Pending Review'), orderBy('updatedAt', 'desc')),
    [db]
  );
  const { data: courses, isLoading: coursesLoading } = useCollection<Course>(coursesQuery);

  const isLoading = isUserLoading || coursesLoading;
  
  const handleApprove = async (courseId: string) => {
    setUpdatingId(courseId);
    const courseRef = doc(db, 'courses', courseId);
    try {
        await updateDoc(courseRef, {
            status: 'Published',
            publishedAt: new Date(),
        });
        toast({ title: 'Cours Approuvé', description: 'Le cours est maintenant publié et visible sur la plateforme.' });
    } catch (error) {
        console.error("Error approving course:", error);
        toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible d\'approuver le cours.' });
    } finally {
        setUpdatingId(null);
    }
  };


  if (adminUser?.role !== 'admin') {
    return <div className="p-8 text-center">Accès non autorisé.</div>;
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold dark:text-white">Modération de Contenu</h1>
        <p className="text-muted-foreground dark:text-slate-400">Examinez et approuvez les nouveaux cours soumis par les instructeurs.</p>
      </header>

      <Card className="dark:bg-slate-800 dark:border-slate-700">
        <CardHeader>
          <CardTitle className="dark:text-white">Cours en attente de validation</CardTitle>
          <CardDescription className="dark:text-slate-400">
            Ces cours ont été soumis par des instructeurs et nécessitent votre approbation avant d'être publiés.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="dark:hover:bg-slate-700/50 dark:border-slate-700">
                  <TableHead className="dark:text-slate-400">Titre du Cours</TableHead>
                  <TableHead className="hidden md:table-cell dark:text-slate-400">Soumis le</TableHead>
                  <TableHead className="hidden lg:table-cell dark:text-slate-400">Statut</TableHead>
                  <TableHead className="text-right dark:text-slate-400">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  [...Array(3)].map((_, i) => (
                    <TableRow key={i} className="dark:border-slate-700">
                      <TableCell><Skeleton className="h-5 w-48 dark:bg-slate-700" /></TableCell>
                      <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-24 dark:bg-slate-700" /></TableCell>
                      <TableCell className="hidden lg:table-cell"><Skeleton className="h-6 w-24 rounded-full dark:bg-slate-700" /></TableCell>
                      <TableCell className="text-right"><div className="flex justify-end gap-2"><Skeleton className="h-8 w-20 dark:bg-slate-700" /><Skeleton className="h-8 w-20 dark:bg-slate-700" /></div></TableCell>
                    </TableRow>
                  ))
                ) : courses && courses.length > 0 ? (
                  courses.map((course) => (
                    <TableRow key={course.id} className="dark:hover:bg-slate-700/50 dark:border-slate-700">
                      <TableCell className="font-medium dark:text-slate-100">{course.title}</TableCell>
                      <TableCell className="text-muted-foreground hidden md:table-cell dark:text-slate-400">
                          {course.updatedAt ? formatDistanceToNow(course.updatedAt.toDate(), { addSuffix: true, locale: fr }) : 'N/A'}
                      </TableCell>
                       <TableCell className="hidden lg:table-cell">
                          <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300">
                            <Clock className="mr-1.5 h-3 w-3"/>
                            En attente
                          </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                         <div className="flex justify-end gap-2">
                            <Button asChild variant="outline" size="sm" className="dark:bg-slate-700 dark:border-slate-600 dark:hover:bg-slate-600">
                                <Link href={`/course/${course.id}`} target="_blank"><Eye className="mr-2 h-4 w-4"/>Aperçu</Link>
                            </Button>
                             <Button onClick={() => handleApprove(course.id)} size="sm" variant="default" disabled={updatingId === course.id}>
                                {updatingId === course.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <CheckCircle className="mr-2 h-4 w-4"/>}
                                Approuver
                            </Button>
                         </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow className="dark:border-slate-700">
                    <TableCell colSpan={4} className="h-48 text-center">
                       <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground dark:text-slate-400">
                          <ShieldAlert className="h-12 w-12" />
                          <p className="font-medium">Aucun cours en attente</p>
                          <p className="text-sm">Tous les cours soumis ont été traités.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
