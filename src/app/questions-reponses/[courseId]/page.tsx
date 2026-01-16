
'use client';

import { useParams, useRouter } from 'next/navigation';
import { useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { doc, collection, query, where, getFirestore, orderBy } from 'firebase/firestore';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, ArrowLeft, MessageSquare, BadgeInfo, BadgeCheck } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import type { Course, CourseQuestion, NdaraUser } from '@/lib/types';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import React from 'react';

const QuestionCard = ({ question, courseId }: { question: CourseQuestion & { student?: NdaraUser }, courseId: string }) => {
    return (
        <Card className="dark:bg-slate-800/50 dark:border-slate-700/80 hover:border-primary/50 transition-all">
            <CardContent className="p-4">
                <div className="flex justify-between items-start gap-4">
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                             {question.status === 'unanswered' ? (
                                <Badge variant="destructive">Non répondue</Badge>
                             ) : (
                                <Badge variant="outline" className="bg-green-500/10 border-green-500/30 text-green-400">
                                    <BadgeCheck className="h-3 w-3 mr-1"/>
                                    Répondue
                                </Badge>
                             )}
                        </div>
                        <Link href={`/questions-reponses/${courseId}/${question.id}`} className="block">
                            <h3 className="font-bold text-base text-white hover:text-primary transition-colors">{question.title}</h3>
                        </Link>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                        <Link href={`/questions-reponses/${courseId}/${question.id}`}>Voir & Répondre</Link>
                    </Button>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-400 mt-3 pt-3 border-t dark:border-slate-700/80">
                     <Avatar className="h-6 w-6">
                        <AvatarImage src={question.student?.profilePictureURL} />
                        <AvatarFallback>{question.student?.fullName.charAt(0) || '?'}</AvatarFallback>
                    </Avatar>
                    <span>{question.student?.fullName || 'Étudiant'}</span>
                    <span>•</span>
                    <span>{question.createdAt ? formatDistanceToNow(question.createdAt.toDate(), { locale: fr, addSuffix: true }) : ''}</span>
                    <span>•</span>
                    <span>{question.answerCount || 0} réponses</span>
                </div>
            </CardContent>
        </Card>
    );
};

export default function CourseQuestionsPage() {
    const { courseId } = useParams();
    const db = getFirestore();
    const router = useRouter();

    const courseRef = useMemoFirebase(() => doc(db, 'courses', courseId as string), [db, courseId]);
    const { data: course, isLoading: courseLoading } = useDoc<Course>(courseRef);
    
    const questionsQuery = useMemoFirebase(() => 
        query(collection(db, `courses/${courseId}/questions`), orderBy('createdAt', 'desc')),
        [db, courseId]
    );
    const { data: questions, isLoading: questionsLoading, error } = useCollection<CourseQuestion>(questionsQuery);
    
    const [enrichedQuestions, setEnrichedQuestions] = React.useState<(CourseQuestion & { student?: NdaraUser })[]>([]);
    const [studentsLoading, setStudentsLoading] = React.useState(true);
    
    React.useEffect(() => {
        if (!questions) return;
        
        const fetchStudents = async () => {
            setStudentsLoading(true);
            const studentIds = [...new Set(questions.map(q => q.studentId))];
            if (studentIds.length === 0) {
                setEnrichedQuestions(questions);
                setStudentsLoading(false);
                return;
            }

            const usersMap = new Map<string, NdaraUser>();
            const q = query(collection(db, 'users'), where('uid', 'in', studentIds.slice(0, 30)));
            const usersSnap = await getDocs(q);
            usersSnap.forEach(doc => usersMap.set(doc.id, doc.data() as NdaraUser));

            setEnrichedQuestions(questions.map(q => ({
                ...q,
                student: usersMap.get(q.studentId)
            })));
            setStudentsLoading(false);
        };

        fetchStudents();
    }, [questions, db]);

    const isLoading = courseLoading || questionsLoading || studentsLoading;
    
    return (
        <div className="space-y-6">
            <header>
                 <Button variant="ghost" size="sm" onClick={() => router.push('/questions-reponses')} className="mb-2 dark:text-slate-300 dark:hover:bg-slate-800 -ml-4">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Retour à la liste des cours
                </Button>
                {courseLoading ? (
                    <>
                        <Skeleton className="h-8 w-1/2 dark:bg-slate-700" />
                        <Skeleton className="h-4 w-1/3 mt-2 dark:bg-slate-700" />
                    </>
                ) : (
                    <>
                        <h1 className="text-3xl font-bold dark:text-white">{course?.title}</h1>
                        <p className="text-muted-foreground dark:text-slate-400">Questions des étudiants pour ce cours.</p>
                    </>
                )}
            </header>

            {error && (
                <div className="p-4 bg-destructive/10 text-destructive border border-destructive/50 rounded-lg flex items-center gap-3">
                    <AlertCircle className="h-5 w-5" />
                    <p>Erreur de chargement des questions.</p>
                </div>
            )}
            
            <div className="space-y-4">
                {isLoading ? (
                    [...Array(3)].map((_, i) => <Skeleton key={i} className="h-32 w-full dark:bg-slate-700" />)
                ) : enrichedQuestions.length > 0 ? (
                    enrichedQuestions.map(q => <QuestionCard key={q.id} question={q} courseId={courseId as string} />)
                ) : (
                    <div className="text-center py-20 border-2 border-dashed rounded-xl dark:border-slate-700 text-slate-400">
                        <MessageSquare className="mx-auto h-12 w-12" />
                        <h3 className="mt-4 font-semibold text-lg text-slate-300">Aucune question pour ce cours</h3>
                        <p className="text-sm">Les questions des étudiants apparaîtront ici.</p>
                    </div>
                )}
            </div>
        </div>
    );
}

