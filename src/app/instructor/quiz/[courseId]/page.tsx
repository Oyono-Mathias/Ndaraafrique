
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useRole } from '@/context/RoleContext';
import { useDoc } from '@/firebase/firestore/use-doc';
import { useCollection } from '@/firebase/firestore/use-collection';
import { useMemoFirebase } from '@/firebase/provider';
import {
  getFirestore,
  collection,
  doc,
  addDoc,
  query,
  orderBy,
  serverTimestamp,
  onSnapshot,
  where,
} from 'firebase/firestore';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { FileQuestion, PlusCircle, ArrowLeft, Loader2, AlertCircle, BadgeInfo } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from '@/components/ui/sheet';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import type { Course, Quiz } from '@/lib/types';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useIsMobile } from '@/hooks/use-mobile';


const quizSchema = z.object({
    title: z.string().min(3, { message: 'Le titre doit contenir au moins 3 caractères.' }),
    description: z.string().optional(),
});


const QuizRow = ({ courseId, quiz }: { courseId: string; quiz: Quiz }) => {
    const db = getFirestore();
    const router = useRouter();
    const [attemptCount, setAttemptCount] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const attemptsRef = collection(db, `quizzes/${quiz.id}/attempts`);
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
        <TableRow 
            onClick={() => router.push(`/instructor/quiz/edit/${quiz.id}`)} 
            className="dark:border-slate-700 dark:hover:bg-slate-800/50 cursor-pointer"
        >
            <TableCell className="font-medium dark:text-slate-100">{quiz.title}</TableCell>
            <TableCell className="hidden sm:table-cell dark:text-slate-400">
                {quiz.createdAt ? format(quiz.createdAt.toDate(), 'dd MMM yyyy', { locale: fr }) : 'N/A'}
            </TableCell>
            <TableCell className="hidden sm:table-cell">
                 <Badge variant="outline" className="dark:border-slate-600 dark:text-slate-300">Ouvert</Badge>
            </TableCell>
            <TableCell>
                 {loading ? <Skeleton className="h-5 w-5 rounded-full dark:bg-slate-700" /> : 
                    <Badge variant={attemptCount > 0 ? "default" : "secondary"} className="bg-primary/20 text-primary border border-primary/30">
                        {attemptCount}
                    </Badge>
                }
            </TableCell>
            <TableCell className="text-right">
                <Button variant="outline" size="sm" asChild className="dark:bg-slate-700 dark:hover:bg-slate-600 dark:border-slate-600">
                    <Link href={`/instructor/quiz/edit/${quiz.id}`} onClick={e => e.stopPropagation()}>
                        Modifier
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
    const { currentUser, isUserLoading } = useRole();
    const isMobile = useIsMobile();

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const courseRef = useMemoFirebase(() => doc(db, 'courses', courseId as string), [db, courseId]);
    const { data: course, isLoading: courseLoading } = useDoc<Course>(courseRef);
    
    const quizzesQuery = useMemoFirebase(
        () => query(collection(db, 'quizzes'), where('courseId', '==', courseId as string), orderBy('createdAt', 'desc')),
        [db, courseId]
    );
    const { data: quizzes, isLoading: quizzesLoading, error: quizzesError } = useCollection<Quiz>(quizzesQuery);

    const form = useForm<z.infer<typeof quizSchema>>({
        resolver: zodResolver(quizSchema),
        defaultValues: { title: '', description: '' },
    });
    
    // Security check
    useEffect(() => {
        if (!courseLoading && course && currentUser && course.instructorId !== currentUser.uid) {
            toast({
                variant: 'destructive',
                title: "Accès refusé",
                description: "Vous n'êtes pas autorisé à gérer les quiz de ce cours.",
            });
            router.push('/instructor/quiz');
        }
    }, [course, currentUser, courseLoading, router, toast]);

    const handleCreateQuiz = async (values: z.infer<typeof quizSchema>) => {
        if (!currentUser) return;
        setIsSubmitting(true);
        
        const quizPayload = {
            ...values,
            courseId: courseId,
            createdAt: serverTimestamp(),
        };

        try {
            const quizzesCollection = collection(db, 'quizzes');
            const docRef = await addDoc(quizzesCollection, quizPayload);
            toast({ title: "Quiz créé !", description: "Vous pouvez maintenant y ajouter des questions." });
            setIsFormOpen(false);
            form.reset();
            router.push(`/instructor/quiz/edit/${docRef.id}`);
        } catch (error) {
            console.error("Error creating quiz:", error);
            errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: 'quizzes',
                operation: 'create',
                requestResourceData: quizPayload,
            }));
        } finally {
            setIsSubmitting(false);
        }
    };

    const isLoading = courseLoading || quizzesLoading || isUserLoading;
    const hasError = quizzesError;
    
    const FormWrapper = isMobile ? Sheet : Dialog;
    const FormContent = isMobile ? SheetContent : DialogContent;
    const FormHeader = isMobile ? SheetHeader : DialogHeader;
    const FormTitle = isMobile ? SheetTitle : DialogTitle;
    const FormDescription = isMobile ? SheetDescription : DialogDescription;


    return (
        <div className="space-y-8">
            <header>
                <Button variant="ghost" size="sm" onClick={() => router.push('/instructor/quiz')} className="mb-2 dark:text-slate-300 dark:hover:bg-slate-800 -ml-4">
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
                        <div className="flex items-center gap-3">
                             <h1 className="text-3xl font-bold text-slate-900 dark:text-white line-clamp-1">{course?.title}</h1>
                             {course && <Badge variant={course.status === 'Published' ? 'default' : 'secondary'}>{course.status}</Badge>}
                        </div>
                        <p className="text-muted-foreground dark:text-slate-400">Créez et gérez les quiz pour ce cours.</p>
                    </>
                )}
            </header>

            {hasError && (
                <div className="p-4 bg-destructive/10 text-destructive border border-destructive/50 rounded-lg flex items-center gap-3">
                    <AlertCircle className="h-5 w-5" />
                    <p>Une erreur est survenue lors du chargement des quiz. Un index Firestore est peut-être manquant.</p>
                </div>
            )}

            <Card className="dark:bg-slate-800 dark:border-slate-700 shadow-sm">
                <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                    <div>
                        <CardTitle className="dark:text-white">Liste des quiz</CardTitle>
                        <CardDescription className="dark:text-slate-400">Modifiez un quiz pour y ajouter des questions.</CardDescription>
                    </div>
                     <FormWrapper open={isFormOpen} onOpenChange={setIsFormOpen}>
                        <SheetTrigger asChild>
                            <Button className="w-full sm:w-auto">
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Créer un quiz
                            </Button>
                        </SheetTrigger>
                        <FormContent side={isMobile ? "bottom" : "right"} className="dark:bg-slate-900 dark:border-slate-800 dark:text-white">
                            <FormHeader>
                                <FormTitle>Créer un nouveau quiz</FormTitle>
                                <FormDescription className="dark:text-slate-400">Renseignez le titre et la description du quiz.</FormDescription>
                            </FormHeader>
                             <Form {...form}>
                                <form onSubmit={form.handleSubmit(handleCreateQuiz)} className="space-y-4">
                                    <FormField
                                        control={form.control}
                                        name="title"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="dark:text-slate-300">Titre du quiz</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="Ex: Quiz de fin de module" {...field} className="dark:bg-slate-800 dark:border-slate-700" />
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
                                                <FormLabel className="dark:text-slate-300">Description (facultatif)</FormLabel>
                                                <FormControl>
                                                    <Textarea placeholder="Décrivez le but de ce quiz..." {...field} rows={3} className="dark:bg-slate-800 dark:border-slate-700" />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <DialogFooter className="pt-4">
                                        <Button type="button" variant="ghost" onClick={() => setIsFormOpen(false)} className="dark:text-slate-300 dark:hover:bg-slate-800">Annuler</Button>
                                        <Button type="submit" disabled={isSubmitting}>
                                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                            Créer et modifier
                                        </Button>
                                    </DialogFooter>
                                </form>
                            </Form>
                        </FormContent>
                    </FormWrapper>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow className="dark:border-slate-700">
                                <TableHead className="dark:text-slate-300">Titre</TableHead>
                                <TableHead className="hidden sm:table-cell dark:text-slate-300">Date de création</TableHead>
                                <TableHead className="hidden sm:table-cell dark:text-slate-300">Statut</TableHead>
                                <TableHead className="dark:text-slate-300">Soumissions</TableHead>
                                <TableHead className="text-right dark:text-slate-300">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                [...Array(3)].map((_, i) => (
                                    <TableRow key={i} className="dark:border-slate-700">
                                        <TableCell><Skeleton className="h-5 w-48 dark:bg-slate-700" /></TableCell>
                                        <TableCell className="hidden sm:table-cell"><Skeleton className="h-5 w-24 dark:bg-slate-700" /></TableCell>
                                        <TableCell className="hidden sm:table-cell"><Skeleton className="h-6 w-16 rounded-full dark:bg-slate-700" /></TableCell>
                                        <TableCell><Skeleton className="h-5 w-5 rounded-full dark:bg-slate-700" /></TableCell>
                                        <TableCell className="text-right"><Skeleton className="h-8 w-28 dark:bg-slate-700" /></TableCell>
                                    </TableRow>
                                ))
                            ) : quizzes && quizzes.length > 0 ? (
                                quizzes.map((quiz) => (
                                    <QuizRow key={quiz.id} courseId={courseId as string} quiz={quiz} />
                                ))
                            ) : (
                                <TableRow className="dark:border-slate-700">
                                    <TableCell colSpan={5} className="h-48 text-center">
                                        <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground dark:text-slate-400">
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
