
'use client';

import { useParams, useRouter } from 'next-intl/navigation';
import { useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { useRole } from '@/context/RoleContext';
import { doc, collection, query, orderBy, addDoc, serverTimestamp, writeBatch, getFirestore, updateDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, Send, ArrowLeft, User, BookOpen, ShieldCheck, BadgeCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Course, CourseQuestion, CourseAnswer, NdaraUser } from '@/lib/types';
import React from 'react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { useToast } from '@/hooks/use-toast';

interface EnrichedAnswer extends CourseAnswer {
    author?: NdaraUser;
}

const AnswerCard = ({ answer }: { answer: EnrichedAnswer }) => {
    return (
        <div className="flex items-start gap-4">
            <Avatar>
                <AvatarImage src={answer.author?.profilePictureURL} />
                <AvatarFallback>{answer.author?.fullName.charAt(0) || '?'}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
                <div className="flex items-center gap-2">
                    <p className="font-semibold text-white">{answer.author?.fullName}</p>
                    {answer.isOfficial && (
                        <Badge variant="secondary" className="bg-green-600/20 text-green-400 border-green-600/30">
                            <BadgeCheck className="h-3 w-3 mr-1" />
                            Réponse du formateur
                        </Badge>
                    )}
                </div>
                 <p className="text-sm text-slate-300 mt-1 whitespace-pre-wrap">{answer.body}</p>
                <p className="text-xs text-slate-500 mt-2">
                    {answer.createdAt ? formatDistanceToNow(answer.createdAt.toDate(), { locale: fr, addSuffix: true }) : ''}
                </p>
            </div>
        </div>
    );
};

export default function QuestionDetailPage() {
    const { courseId, questionId } = useParams();
    const router = useRouter();
    const db = getFirestore();
    const { currentUser } = useRole();
    const { toast } = useToast();

    const [answerText, setAnswerText] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const questionRef = useMemoFirebase(() => doc(db, `courses/${courseId}/questions/${questionId}`), [db, courseId, questionId]);
    const { data: question, isLoading: questionLoading } = useDoc<CourseQuestion>(questionRef);

    const answersQuery = useMemoFirebase(() => query(collection(db, `courses/${courseId}/questions/${questionId}/answers`), orderBy('createdAt', 'asc')), [db, courseId, questionId]);
    const { data: answers, isLoading: answersLoading } = useCollection<CourseAnswer>(answersQuery);
    
    const [enrichedAnswers, setEnrichedAnswers] = React.useState<EnrichedAnswer[]>([]);
    const [authorsLoading, setAuthorsLoading] = React.useState(true);

    React.useEffect(() => {
        if (!answers) return;
        
        const fetchAuthors = async () => {
            setAuthorsLoading(true);
            const userIds = [...new Set(answers.map(a => a.userId))];
            if (question?.studentId) {
                userIds.push(question.studentId);
            }
            if (userIds.length === 0) {
                setEnrichedAnswers(answers);
                setAuthorsLoading(false);
                return;
            }

            const usersMap = new Map<string, NdaraUser>();
            const q = query(collection(db, 'users'), where('uid', 'in', userIds.slice(0, 30)));
            const usersSnap = await getDocs(q);
            usersSnap.forEach(doc => usersMap.set(doc.id, doc.data() as NdaraUser));

            setEnrichedAnswers(answers.map(a => ({
                ...a,
                author: usersMap.get(a.userId)
            })));
            setAuthorsLoading(false);
        };

        fetchAuthors();
    }, [answers, db, question]);

    const handleAnswerSubmit = async () => {
        if (!answerText.trim() || !currentUser || !question) return;
        setIsSubmitting(true);
        try {
            const batch = writeBatch(db);
            
            const answersRef = collection(db, `courses/${courseId}/questions/${questionId}/answers`);
            const newAnswerRef = doc(answersRef);
            
            batch.set(newAnswerRef, {
                questionId: questionId,
                userId: currentUser.uid,
                body: answerText,
                createdAt: serverTimestamp(),
                isOfficial: currentUser.uid === question.instructorId,
            });

            const questionDocRef = doc(db, `courses/${courseId}/questions/${questionId}`);
            batch.update(questionDocRef, {
                status: 'answered',
                answerCount: (question.answerCount || 0) + 1,
            });

            await batch.commit();
            setAnswerText('');
            toast({ title: "Réponse publiée !" });
        } catch (error) {
            errorEmitter.emit('permission-error', {
                path: `courses/${courseId}/questions/${questionId}/answers`,
                operation: 'create',
            });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const isLoading = questionLoading || answersLoading || authorsLoading;
    const questionAuthor = enrichedAnswers.find(a => a.userId === question?.studentId)?.author;

    return (
        <div className="space-y-6">
             <header>
                <Button variant="ghost" size="sm" onClick={() => router.push(`/questions-reponses/${courseId}`)} className="mb-2 dark:text-slate-300 dark:hover:bg-slate-800 -ml-4">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Retour aux questions du cours
                </Button>
            </header>
            
            {isLoading ? (
                <Skeleton className="h-96 w-full dark:bg-slate-800" />
            ) : !question ? (
                 <p>Question non trouvée.</p>
            ) : (
                <div className="space-y-6">
                    <Card className="dark:bg-slate-800 dark:border-slate-700">
                        <CardHeader>
                            <CardTitle className="text-xl text-white">{question.title}</CardTitle>
                            <div className="flex items-center gap-3 text-sm text-slate-400 pt-2">
                                <Avatar className="h-7 w-7">
                                    <AvatarImage src={questionAuthor?.profilePictureURL} />
                                    <AvatarFallback>{questionAuthor?.fullName.charAt(0) || 'E'}</AvatarFallback>
                                </Avatar>
                                <span>{questionAuthor?.fullName || 'Étudiant'}</span>
                                <span>•</span>
                                <span>{question.createdAt ? formatDistanceToNow(question.createdAt.toDate(), { locale: fr, addSuffix: true }) : ''}</span>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <p className="text-slate-300 whitespace-pre-wrap">{question.body}</p>
                        </CardContent>
                    </Card>

                    <div className="space-y-6 pl-4 border-l-2 dark:border-slate-700">
                        {enrichedAnswers.map(answer => <AnswerCard key={answer.id} answer={answer} />)}
                    </div>
                    
                    <Card className="dark:bg-slate-800 dark:border-slate-700">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2 text-white">Votre réponse</CardTitle>
                            <CardDescription className="text-slate-400">Cette réponse sera visible par tous les étudiants inscrits à ce cours.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Textarea 
                                value={answerText}
                                onChange={e => setAnswerText(e.target.value)}
                                placeholder="Partagez votre expertise..."
                                rows={5}
                                className="dark:bg-slate-700/50 dark:border-slate-600"
                            />
                        </CardContent>
                        <CardFooter className="justify-end">
                            <Button onClick={handleAnswerSubmit} disabled={isSubmitting || !answerText.trim()}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Répondre
                            </Button>
                        </CardFooter>
                    </Card>
                </div>
            )}
        </div>
    );
}
