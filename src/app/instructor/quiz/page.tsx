
'use client';

import { useMemo } from 'react';
import { useRole } from '@/context/RoleContext';
import { useCollection, useMemoFirebase } from '@/firebase';
import { getFirestore, collection, query, where, orderBy } from 'firebase/firestore';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, FileQuestion } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import type { Course } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export default function QuizzesDashboardPage() {
    const { currentUser, isUserLoading } = useRole();
    const db = getFirestore();

    const coursesQuery = useMemoFirebase(
        () => currentUser?.uid
            ? query(
                collection(db, 'courses'),
                where('instructorId', '==', currentUser.uid),
              )
            : null,
        [db, currentUser?.uid]
    );

    const { data: courses, isLoading: coursesLoading, error } = useCollection<Course>(coursesQuery);
    const isLoading = isUserLoading || coursesLoading;
    
    return (
        <div className="space-y-8">
            <header>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Gestion des Quiz</h1>
                <p className="text-muted-foreground">Sélectionnez un cours pour créer et gérer ses quiz.</p>
            </header>

             {error && (
                <div className="p-4 bg-destructive/10 text-destructive border border-destructive/50 rounded-lg flex items-center gap-3">
                    <AlertCircle className="h-5 w-5" />
                    <p>
                        Une erreur est survenue lors du chargement des cours. 
                        Un index Firestore est peut-être manquant.
                    </p>
                </div>
            )}

            <Card className="bg-card shadow-sm">
                <CardHeader>
                    <CardTitle>Liste de vos cours</CardTitle>
                </CardHeader>
                <CardContent>
                     <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Titre du cours</TableHead>
                                <TableHead>Statut</TableHead>
                                <TableHead className="text-right">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                             {isLoading ? (
                                [...Array(3)].map((_, i) => (
                                     <TableRow key={i}>
                                        <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                                        <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                                        <TableCell className="text-right"><Skeleton className="h-8 w-24" /></TableCell>
                                    </TableRow>
                                ))
                            ) : courses && courses.length > 0 ? (
                                courses.map((course) => (
                                    <TableRow key={course.id} className="hover:bg-muted/50">
                                        <TableCell className="font-medium">{course.title}</TableCell>
                                        <TableCell>
                                            <Badge variant={course.status === 'Published' ? 'default' : 'secondary'}>
                                                {course.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Link href={`/instructor/quiz/${course.id}`} className="text-sm font-semibold text-primary hover:underline">
                                                Gérer les quiz
                                            </Link>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={3} className="h-32 text-center">
                                        <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                                            <FileQuestion className="h-10 w-10" />
                                            <span className="font-medium">Aucun cours trouvé</span>
                                            <span className="text-sm">Créez un cours pour pouvoir y ajouter des quiz.</span>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
