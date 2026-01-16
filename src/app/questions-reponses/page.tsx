
'use client';

import { useMemo, useState, useEffect } from 'react';
import { useRole } from '@/context/RoleContext';
import { useCollection, useMemoFirebase } from '@/firebase';
import { getFirestore, collection, query, where, orderBy, getCountFromServer } from 'firebase/firestore';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, BookOpen, MessageCircleQuestion } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import type { Course } from '@/lib/types';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import Image from 'next/image';

interface CourseWithQuestionStats extends Course {
  questionCount: number;
  unansweredCount: number;
}

const CourseRow = ({ course }: { course: CourseWithQuestionStats }) => (
    <TableRow className="dark:border-slate-700 hover:bg-slate-800/50 cursor-pointer">
        <TableCell>
            <Link href={`/questions-reponses/${course.id}`} className="flex items-center gap-4 group">
                <Image src={course.imageUrl || '/placeholder.svg'} alt={course.title} width={80} height={45} className="rounded-md aspect-video object-cover" />
                <span className="font-semibold text-white group-hover:text-primary transition-colors">{course.title}</span>
            </Link>
        </TableCell>
        <TableCell className="text-center">
            <span className="font-mono font-semibold text-slate-300">{course.questionCount}</span>
        </TableCell>
        <TableCell className="text-center">
            {course.unansweredCount > 0 ? (
                <Badge variant="destructive">{course.unansweredCount}</Badge>
            ) : (
                <span className="text-sm text-green-500">0</span>
            )}
        </TableCell>
        <TableCell className="text-right">
            <Button asChild variant="outline" size="sm">
                <Link href={`/questions-reponses/${course.id}`}>Voir les questions</Link>
            </Button>
        </TableCell>
    </TableRow>
);


export default function QADashboardPage() {
    const { currentUser, isUserLoading } = useRole();
    const db = getFirestore();
    const { t } = useTranslation();
    const [coursesWithStats, setCoursesWithStats] = useState<CourseWithQuestionStats[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const coursesQuery = useMemoFirebase(
        () => currentUser?.uid
            ? query(collection(db, 'courses'), where('instructorId', '==', currentUser.uid))
            : null,
        [db, currentUser?.uid]
    );
    const { data: courses, isLoading: coursesLoading } = useCollection<Course>(coursesQuery);

    useEffect(() => {
        if (coursesLoading || !courses) {
            if (!coursesLoading) setIsLoading(false);
            return;
        }

        const fetchStats = async () => {
            try {
                const statsPromises = courses.map(async (course) => {
                    const questionsRef = collection(db, `courses/${course.id}/questions`);
                    const totalQuery = query(questionsRef);
                    const unansweredQuery = query(questionsRef, where('status', '==', 'unanswered'));

                    const [totalSnapshot, unansweredSnapshot] = await Promise.all([
                        getCountFromServer(totalQuery),
                        getCountFromServer(unansweredQuery)
                    ]);
                    
                    return {
                        ...course,
                        questionCount: totalSnapshot.data().count,
                        unansweredCount: unansweredSnapshot.data().count,
                    };
                });

                const results = await Promise.all(statsPromises);
                setCoursesWithStats(results);
            } catch (err) {
                console.error("Error fetching question stats:", err);
                setError("Impossible de charger les statistiques des questions. Un index Firestore est peut-être manquant.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchStats();
    }, [courses, coursesLoading, db]);

    const finalLoadingState = isUserLoading || isLoading;

    return (
        <div className="space-y-8">
            <header>
                <h1 className="text-3xl font-bold dark:text-white">Questions & Réponses par cours</h1>
                <p className="text-muted-foreground dark:text-slate-400">
                    Répondez publiquement aux questions des étudiants pour enrichir le savoir collectif de chaque cours.
                </p>
            </header>

            {error && (
                <div className="p-4 bg-destructive/10 text-destructive border border-destructive/50 rounded-lg flex items-center gap-3">
                    <AlertCircle className="h-5 w-5" />
                    <p>{error}</p>
                </div>
            )}

            <Card className="dark:bg-slate-800/50 dark:border-slate-700/80">
                <CardHeader>
                    <CardTitle className="dark:text-white">Vos cours</CardTitle>
                    <CardDescription className="dark:text-slate-400">Sélectionnez un cours pour voir et répondre aux questions.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow className="dark:border-slate-700">
                                <TableHead className="dark:text-slate-300">Cours</TableHead>
                                <TableHead className="text-center dark:text-slate-300">Total Questions</TableHead>
                                <TableHead className="text-center dark:text-slate-300">Non répondues</TableHead>
                                <TableHead className="text-right dark:text-slate-300">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {finalLoadingState ? (
                                [...Array(3)].map((_, i) => (
                                    <TableRow key={i} className="dark:border-slate-700">
                                        <TableCell><Skeleton className="h-12 w-full dark:bg-slate-700" /></TableCell>
                                        <TableCell><Skeleton className="h-6 w-8 mx-auto rounded-full dark:bg-slate-700" /></TableCell>
                                        <TableCell><Skeleton className="h-6 w-8 mx-auto rounded-full dark:bg-slate-700" /></TableCell>
                                        <TableCell className="text-right"><Skeleton className="h-9 w-32 dark:bg-slate-700" /></TableCell>
                                    </TableRow>
                                ))
                            ) : coursesWithStats.length > 0 ? (
                                coursesWithStats.map((course) => <CourseRow key={course.id} course={course} />)
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-48 text-center text-slate-400">
                                        <div className="flex flex-col items-center justify-center gap-2">
                                            <BookOpen className="h-10 w-10" />
                                            <span className="font-medium">Aucun cours avec des questions</span>
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
