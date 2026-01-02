
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
import { ClipboardList, PlusCircle, ArrowLeft, Loader2, AlertCircle, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import type { Course, Assignment } from '@/lib/types';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { assistAssignmentCreation } from '@/ai/flows/assist-assignment-creation';

const assignmentSchema = z.object({
    title: z.string().min(3, { message: 'Le titre doit contenir au moins 3 caractères.' }),
    description: z.string().optional(),
});


const AssignmentRow = ({ courseId, assignment }: { courseId: string; assignment: Assignment }) => {
    const db = getFirestore();
    const [submissionCount, setSubmissionCount] = useState(0);
    const [loading, setLoading] = useState(true);

    useMemo(() => {
        const submissionsRef = collection(db, `courses/${courseId}/assignments/${assignment.id}/submissions`);
        const unsubscribe = onSnapshot(submissionsRef, (snapshot) => {
            setSubmissionCount(snapshot.size);
            setLoading(false);
        }, (error) => {
            console.error("Error getting submission count:", error);
            setLoading(false);
        });
        return () => unsubscribe();
    }, [db, courseId, assignment.id]);

    return (
        <TableRow>
            <TableCell className="font-medium">{assignment.title}</TableCell>
            <TableCell>
                {loading ? <Skeleton className="h-5 w-5" /> : submissionCount}
            </TableCell>
            <TableCell className="text-right">
                <Button variant="outline" size="sm" asChild>
                    <Link href={`/instructor/devoirs/${courseId}/submissions/${assignment.id}`}>
                        Voir les rendus
                    </Link>
                </Button>
            </TableCell>
        </TableRow>
    );
};


export default function CourseAssignmentsPage() {
    const { courseId } = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const db = getFirestore();
    const { formaAfriqueUser, isUserLoading } = useRole();

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isAiLoading, setIsAiLoading] = useState(false);

    const courseRef = useMemoFirebase(() => doc(db, 'courses', courseId as string), [db, courseId]);
    const { data: course, isLoading: courseLoading } = useDoc<Course>(courseRef);
    
    const assignmentsQuery = useMemoFirebase(
        () => query(collection(db, `courses/${courseId}/assignments`), orderBy('createdAt', 'desc')),
        [db, courseId]
    );
    const { data: assignments, isLoading: assignmentsLoading, error: assignmentsError } = useCollection<Assignment>(assignmentsQuery);

    const form = useForm<z.infer<typeof assignmentSchema>>({
        resolver: zodResolver(assignmentSchema),
        defaultValues: { title: '', description: '' },
    });

    const handleCreateAssignment = async (values: z.infer<typeof assignmentSchema>) => {
        if (!formaAfriqueUser) return;
        setIsSubmitting(true);
        
        const assignmentPayload = {
            ...values,
            courseId: courseId,
            createdAt: serverTimestamp(),
        };

        try {
            const assignmentsCollection = collection(db, `courses/${courseId}/assignments`);
            await addDoc(assignmentsCollection, assignmentPayload);
            toast({ title: "Devoir créé !", description: "Le nouveau devoir a été ajouté au cours." });
            setIsDialogOpen(false);
            form.reset();
        } catch (error) {
            console.error("Error creating assignment:", error);
            errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: `courses/${courseId}/assignments`,
                operation: 'create',
                requestResourceData: assignmentPayload,
            }));
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleAiAssist = async () => {
        const title = form.getValues('title');
        if (!title) {
          toast({
            variant: 'destructive',
            title: 'Titre manquant',
            description: "Veuillez d'abord saisir un titre pour le devoir.",
          });
          return;
        }
        setIsAiLoading(true);
        try {
          const result = await assistAssignmentCreation({ assignmentTitle: title });
          form.setValue('description', result.description, { shouldValidate: true });
          toast({
            title: 'Description générée !',
            description: 'La description du devoir a été remplie par l\'IA.',
          });
        } catch (error) {
          toast({
            variant: 'destructive',
            title: 'Erreur IA',
            description: 'La génération de contenu a échoué.',
          });
        } finally {
          setIsAiLoading(false);
        }
    };

    const isLoading = courseLoading || assignmentsLoading || isUserLoading;

    return (
        <div className="space-y-8">
            <header>
                <Button variant="ghost" size="sm" onClick={() => router.push('/instructor/devoirs')} className="mb-2">
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
                        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Devoirs pour "{course?.title}"</h1>
                        <p className="text-muted-foreground">Créez et gérez les devoirs pour ce cours.</p>
                    </>
                )}
            </header>

            {assignmentsError && (
                <div className="p-4 bg-destructive/10 text-destructive border border-destructive/50 rounded-lg flex items-center gap-3">
                    <AlertCircle className="h-5 w-5" />
                    <p>Une erreur est survenue lors du chargement des devoirs. Un index Firestore est peut-être manquant.</p>
                </div>
            )}

            <Card className="bg-card shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Liste des devoirs</CardTitle>
                        <CardDescription>Cliquez sur "Voir les rendus" pour noter les étudiants.</CardDescription>
                    </div>
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button>
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Créer un devoir
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Créer un nouveau devoir</DialogTitle>
                                <DialogDescription>Renseignez les informations du devoir ci-dessous.</DialogDescription>
                            </DialogHeader>
                            <Form {...form}>
                                <form onSubmit={form.handleSubmit(handleCreateAssignment)} className="space-y-4">
                                    <FormField
                                        control={form.control}
                                        name="title"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Titre du devoir</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="Ex: Étude de cas marketing" {...field} />
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
                                                <FormLabel className="flex justify-between items-center">
                                                    <span>Description (facultatif)</span>
                                                    <Button type="button" variant="outline" size="sm" onClick={handleAiAssist} disabled={isAiLoading}>
                                                        {isAiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                                                        Assistance IA
                                                    </Button>
                                                </FormLabel>
                                                <FormControl>
                                                    <Textarea placeholder="Décrivez les consignes du devoir..." {...field} rows={5} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <DialogFooter>
                                        <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>Annuler</Button>
                                        <Button type="submit" disabled={isSubmitting}>
                                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                            Enregistrer
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
                                <TableHead>Soumissions</TableHead>
                                <TableHead className="text-right">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                [...Array(3)].map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                                        <TableCell><Skeleton className="h-5 w-5" /></TableCell>
                                        <TableCell className="text-right"><Skeleton className="h-8 w-28" /></TableCell>
                                    </TableRow>
                                ))
                            ) : assignments && assignments.length > 0 ? (
                                assignments.map((assignment) => (
                                    <AssignmentRow key={assignment.id} courseId={courseId as string} assignment={assignment} />
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={3} className="h-32 text-center">
                                        <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                                            <ClipboardList className="h-10 w-10" />
                                            <span className="font-medium">Aucun devoir pour ce cours</span>
                                            <span className="text-sm">Cliquez sur "Créer un devoir" pour commencer.</span>
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
