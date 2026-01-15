

'use client';

import { useMemo } from 'react';
import { useRole } from '@/context/RoleContext';
import { useCollection, useMemoFirebase } from '@/firebase';
import { getFirestore, collection, query, where } from 'firebase/firestore';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, Folder } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import type { Course } from '@/lib/types';

export default function ResourcesDashboardPage() {
    const { ndaraUser, isUserLoading } = useRole();
    const db = getFirestore();

    const coursesQuery = useMemoFirebase(
        () => ndaraUser?.uid
            ? query(
                collection(db, 'courses'),
                where('instructorId', '==', ndaraUser.uid),
              )
            : null,
        [db, ndaraUser?.uid]
    );

    const { data: courses, isLoading: coursesLoading, error } = useCollection<Course>(coursesQuery);
    const isLoading = isUserLoading || coursesLoading;
    
    return (
        <div className="space-y-8">
            <header>
                <h1 className="text-3xl font-bold text-white">Gestion des Ressources</h1>
                <p className="text-slate-400">Sélectionnez un cours pour y ajouter des fichiers et des liens.</p>
            </header>

             {error && (
                <div className="p-4 bg-red-900/50 text-red-300 border border-red-700 rounded-lg flex items-center gap-3">
                    <AlertCircle className="h-5 w-5" />
                    <p>
                        Une erreur est survenue lors du chargement des cours. 
                        Un index Firestore est peut-être manquant.
                    </p>
                </div>
            )}

            <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                    <CardTitle className="text-white">Liste de vos cours</CardTitle>
                </CardHeader>
                <CardContent>
                     <Table>
                        <TableHeader>
                            <TableRow className="border-slate-700 hover:bg-slate-700/50">
                                <TableHead className="text-slate-300">Titre du cours</TableHead>
                                <TableHead className="text-slate-300">Statut</TableHead>
                                <TableHead className="text-right text-slate-300">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                             {isLoading ? (
                                [...Array(3)].map((_, i) => (
                                     <TableRow key={i} className="border-slate-700">
                                        <TableCell><Skeleton className="h-5 w-48 bg-slate-700" /></TableCell>
                                        <TableCell><Skeleton className="h-6 w-20 rounded-full bg-slate-700" /></TableCell>
                                        <TableCell className="text-right"><Skeleton className="h-8 w-36 bg-slate-700" /></TableCell>
                                    </TableRow>
                                ))
                            ) : courses && courses.length > 0 ? (
                                courses.map((course) => (
                                    <TableRow key={course.id} className="border-slate-700 hover:bg-slate-700/50">
                                        <TableCell className="font-medium text-slate-100">{course.title}</TableCell>
                                        <TableCell>
                                            <Badge variant={course.status === 'Published' ? 'default' : 'secondary'} 
                                                className={course.status === 'Published' ? 'bg-green-600 text-white' : 'bg-slate-600 text-slate-200'}>
                                                {course.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Link href={`/instructor/ressources/${course.id}`} className="text-sm font-semibold text-primary hover:underline">
                                                Gérer les ressources
                                            </Link>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow className="border-slate-700">
                                    <TableCell colSpan={3} className="h-32 text-center">
                                        <div className="flex flex-col items-center justify-center gap-2 text-slate-400">
                                            <Folder className="h-10 w-10" />
                                            <span className="font-medium">Aucun cours trouvé</span>
                                            <span className="text-sm">Créez un cours pour pouvoir y ajouter des ressources.</span>
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
