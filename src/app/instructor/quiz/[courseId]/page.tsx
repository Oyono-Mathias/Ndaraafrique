

'use client';

import { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useRole } from '@/context/RoleContext';
import { useDoc, useCollection, useMemoFirebase } from '@/firebase';
import {
  getFirestore,
  collection,
  doc,
  addDoc,
  query,
  orderBy,
  serverTimestamp,
  getCountFromServer,
  onSnapshot,
} from 'firebase/firestore';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { FileQuestion, PlusCircle, ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import type { Course } from '@/lib/types';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

interface Quiz {
    id: string;
    title: string;
}

const quizSchema = z.object({
    title: z.string().min(3, { message: 'Le titre doit contenir au moins 3 caractères.' }),
    description: z.string().optional(),
});


const QuizRow = ({ courseId, quiz }: { courseId: string; quiz: Quiz }) => {
    const db = getFirestore();
    const [attemptCount, setAttemptCount] = useState(0);
    const [loading, setLoading] = useState(true);

    useMemo(() => {
        const attemptsRef = collection(db, `courses/${courseId}/quizzes/${quiz.id}/attempts`);
        const unsubscribe = onSnapshot(attemptsRef, (snapshot) => {
            setAttemptCount(snapshot.size);
            setLoading(false);
        }, (error) => {
            console.error("Error getting attempt count:", error);
            setLoading(false);
        });
        return () => unsubscribe();
    }, [db, courseId, quiz.id]);

    return (
        <TableRow>
            <TableCell className="font-medium">{quiz.title}</TableCell>
            <TableCell>
                {loading ? <Skeleton className="h-5 w-5" /> : attemptCount}
            </TableCell>
            <TableCell className="text-right">
                <Button variant="outline" size="sm" asChild>
                    <Link href={`/instructor/quiz/edit/${quiz.id}`}>
                        Modifier / Voir les résultats
                    </Link>
                </Button>
            </TableCell>
        </TableRow>
    );
};


export default function CourseQuizzesPage() {
    const { courseId } = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const db = getFirestore();
    const { formaAfriqueUser, isUserLoading } = useRole();

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const courseRef = useMemoFirebase(() => doc(db, 'courses', courseId as string), [db, courseId]);
    const { data: course, isLoading: courseLoading } = useDoc<Course>(courseRef);
    
    const quizzesQuery = useMemoFirebase(
        () => query(collection(db, `courses/${courseId}/quizzes`), orderBy('createdAt', 'desc')),
        [db, courseId]
    );
    const { data: quizzes, isLoading: quizzesLoading, error: quizzesError } = useCollection<Quiz>(quizzesQuery);

    const form = useForm<z.infer<typeof quizSchema>>({
        resolver: zodResolver(quizSchema),
        defaultValues: { title: '', description: '' },
    });

    const handleCreateQuiz = async (values: z.infer<typeof quizSchema>) => {
        if (!formaAfriqueUser) return;
        setIsSubmitting(true);
        
        const quizPayload = {
            ...values,
            courseId: courseId,
            questions: [], // Start with an empty array of questions
            createdAt: serverTimestamp(),
        };

        try {
            const quizzesCollection = collection(db, `courses/${courseId}/quizzes`);
            const docRef = await addDoc(quizzesCollection, quizPayload);
            toast({ title: "Quiz créé !", description: "Vous pouvez maintenant y ajouter des questions." });
            setIsDialogOpen(false);
            form.reset();
            router.push(`/instructor/quiz/edit/${docRef.id}`);
        } catch (error) {
            console.error("Error creating quiz:", error);
            errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: `courses/${courseId}/quizzes`,
                operation: 'create',
                requestResourceData: quizPayload,
            }));
        } finally {
            setIsSubmitting(false);
        }
    };

    const isLoading = courseLoading || quizzesLoading || isUserLoading;

    return (
        <div className="space-y-8">
            <header>
                <Button variant="ghost" size="sm" onClick={() => router.push('/instructor/quiz')} className="mb-2">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Retour à la liste des cours
                </Button>
                {courseLoading ? (
                    <>
                        <Skeleton className="h-8 w-1/2" />
                        <Skeleton className="h-4 w-1/3 mt-2" />
                    </>
                ) : (
                    <>
                        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Quiz pour "{course?.title}"</h1>
                        <p className="text-muted-foreground">Créez et gérez les quiz pour ce cours.</p>
                    </>
                )}
            </header>

            {quizzesError && (
                <div className="p-4 bg-destructive/10 text-destructive border border-destructive/50 rounded-lg flex items-center gap-3">
                    <AlertCircle className="h-5 w-5" />
                    <p>Une erreur est survenue lors du chargement des quiz. Un index Firestore est peut-être manquant.</p>
                </div>
            )}

            <Card className="bg-card shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Liste des quiz</CardTitle>
                        <CardDescription>Modifiez un quiz pour ajouter des questions ou voir les résultats.</CardDescription>
                    </div>
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button>
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Créer un quiz
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Créer un nouveau quiz</DialogTitle>
                                <DialogDescription>Renseignez le titre et la description du quiz.</DialogDescription>
                            </DialogHeader>
                            <Form {...form}>
                                <form onSubmit={form.handleSubmit(handleCreateQuiz)} className="space-y-4">
                                    <FormField
                                        control={form.control}
                                        name="title"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Titre du quiz</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="Ex: Quiz de fin de module" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="description"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Description (facultatif)</FormLabel>
                                                <FormControl>
                                                    <Textarea placeholder="Décrivez le but de ce quiz..." {...field} rows={3} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <DialogFooter>
                                        <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>Annuler</Button>
                                        <Button type="submit" disabled={isSubmitting}>
                                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                            Créer et modifier
                                        </Button>
                                    </DialogFooter>
                                </form>
                            </Form>
                        </DialogContent>
                    </Dialog>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Titre</TableHead>
                                <TableHead>Tentatives</TableHead>
                                <TableHead className="text-right">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                [...Array(3)].map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                                        <TableCell><Skeleton className="h-5 w-5" /></TableCell>
                                        <TableCell className="text-right"><Skeleton className="h-8 w-36" /></TableCell>
                                    </TableRow>
                                ))
                            ) : quizzes && quizzes.length > 0 ? (
                                quizzes.map((quiz) => (
                                    <QuizRow key={quiz.id} courseId={courseId as string} quiz={quiz} />
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={3} className="h-32 text-center">
                                        <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                                            <FileQuestion className="h-10 w-10" />
                                            <span className="font-medium">Aucun quiz pour ce cours</span>
                                            <span className="text-sm">Cliquez sur "Créer un quiz" pour commencer.</span>
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
