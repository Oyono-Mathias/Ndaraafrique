
'use client';

import { useMemo } from 'react';
import { useRole } from '@/context/RoleContext';
import { useCollection, useMemoFirebase } from '@/firebase';
import { getFirestore, collection, query, where, orderBy } from 'firebase/firestore';
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
import { AlertCircle, ClipboardList } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import type { Course } from '@/lib/types';
import { useTranslation } from 'react-i18next';


export default function AssignmentsDashboardPage() {
    const { formaAfriqueUser, isUserLoading } = useRole();
    const db = getFirestore();
    const { t } = useTranslation();

    const coursesQuery = useMemoFirebase(
        () => formaAfriqueUser?.uid
            ? query(
                collection(db, 'courses'),
                where('instructorId', '==', formaAfriqueUser.uid),
              )
            : null,
        [db, formaAfriqueUser?.uid]
    );

    const { data: courses, isLoading: coursesLoading, error } = useCollection<Course>(coursesQuery);
    const isLoading = isUserLoading || coursesLoading;
    
    return (
        <div className="space-y-8">
            <header>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{t('assignments_tracking')}</h1>
                <p className="text-muted-foreground dark:text-slate-400">{t('assignments_description')}</p>
            </header>

             {error && (
                <div className="p-4 bg-destructive/10 text-destructive border border-destructive/50 rounded-lg flex items-center gap-3">
                    <AlertCircle className="h-5 w-5" />
                    <p>
                       {t('firestoreIndexError')}
                    </p>
                </div>
            )}

            <Card className="bg-card shadow-sm dark:bg-slate-800 dark:border-slate-700">
                <CardHeader>
                    <CardTitle className="dark:text-white">{t('course_list')}</CardTitle>
                </CardHeader>
                <CardContent>
                     <Table>
                        <TableHeader>
                            <TableRow className="dark:border-slate-700">
                                <TableHead className="dark:text-slate-300">{t('courseTitle')}</TableHead>
                                <TableHead className="dark:text-slate-300">{t('status')}</TableHead>
                                <TableHead className="text-right dark:text-slate-300">{t('actions')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                             {isLoading ? (
                                [...Array(3)].map((_, i) => (
                                     <TableRow key={i} className="dark:border-slate-700">
                                        <TableCell><Skeleton className="h-5 w-48 dark:bg-slate-700" /></TableCell>
                                        <TableCell><Skeleton className="h-6 w-20 rounded-full dark:bg-slate-700" /></TableCell>
                                        <TableCell className="text-right"><Skeleton className="h-8 w-32 dark:bg-slate-700" /></TableCell>
                                    </TableRow>
                                ))
                            ) : courses && courses.length > 0 ? (
                                courses.map((course) => (
                                    <TableRow key={course.id} className="hover:bg-muted/50 dark:hover:bg-slate-700/50 dark:border-slate-700">
                                        <TableCell className="font-medium dark:text-slate-100">{course.title}</TableCell>
                                        <TableCell>
                                            <Badge variant={course.status === 'Published' ? 'default' : 'secondary'}>
                                                {course.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Link href={`/instructor/devoirs/${course.id}`} className="text-sm font-semibold text-primary hover:underline">
                                                {t('see_assignments')}
                                            </Link>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow className="dark:border-slate-700">
                                    <TableCell colSpan={3} className="h-32 text-center">
                                        <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground dark:text-slate-400">
                                            <ClipboardList className="h-10 w-10" />
                                            <span className="font-medium">{t('no_courses_found')}</span>
                                            <span className="text-sm">{t('create_course_for_assignments')}</span>
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
