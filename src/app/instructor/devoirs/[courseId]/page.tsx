
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
import { ClipboardList, PlusCircle, ArrowLeft, Loader2, AlertCircle, Sparkles, Bot } from 'lucide-react';
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
import type { Course, Assignment } from '@/lib/types';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { assistAssignmentCreation } from '@/ai/flows/assist-assignment-creation';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useIsMobile } from '@/hooks/use-mobile';


const assignmentSchema = z.object({
    title: z.string().min(3, { message: 'Le titre doit contenir au moins 3 caractères.' }),
    description: z.string().optional(),
    correctionGuide: z.string().optional(),
});


const AssignmentRow = ({ courseId, assignment }: { courseId: string; assignment: Assignment }) => {
    const db = getFirestore();
    const router = useRouter();
    const [submissionCount, setSubmissionCount] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
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
        <TableRow 
            onClick={() => router.push(`/instructor/devoirs/${courseId}/submissions/${assignment.id}`)} 
            className="dark:border-slate-700 dark:hover:bg-slate-800/50 cursor-pointer"
        >
            <TableCell className="font-medium dark:text-slate-100">{assignment.title}</TableCell>
            <TableCell className="hidden sm:table-cell dark:text-slate-400">
                {assignment.createdAt ? format(assignment.createdAt.toDate(), 'dd MMM yyyy', { locale: fr }) : 'N/A'}
            </TableCell>
            <TableCell>
                 {loading ? <Skeleton className="h-5 w-5 rounded-full dark:bg-slate-700" /> : 
                    <Badge variant={submissionCount > 0 ? "default" : "secondary"} className={cn(submissionCount > 0 && "bg-primary/20 text-primary border border-primary/30")}>
                        {submissionCount}
                    </Badge>
                }
            </TableCell>
            <TableCell className="hidden sm:table-cell">
                 <Badge variant="outline" className="dark:border-slate-600 dark:text-slate-300">Ouvert</Badge>
            </TableCell>
            <TableCell className="text-right">
                <Button variant="outline" size="sm" asChild className="dark:bg-slate-700 dark:hover:bg-slate-600 dark:border-slate-600">
                    <Link href={`/instructor/devoirs/${courseId}/submissions/${assignment.id}`} onClick={e => e.stopPropagation()}>
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
    const { currentUser, isUserLoading } = useRole();
    const isMobile = useIsMobile();

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isAiLoading, setIsAiLoading] = useState(false);

    const courseRef = useMemoFirebase(() => doc(db, 'courses', courseId as string), [db, courseId]);
    const { data: course, isLoading: courseLoading, error: courseError } = useDoc<Course>(courseRef);
    
    const assignmentsQuery = useMemoFirebase(
        () => query(collection(db, `courses/${courseId}/assignments`), orderBy('createdAt', 'desc')),
        [db, courseId]
    );
    const { data: assignments, isLoading: assignmentsLoading, error: assignmentsError } = useCollection<Assignment>(assignmentsQuery);

    const form = useForm<z.infer<typeof assignmentSchema>>({
        resolver: zodResolver(assignmentSchema),
        defaultValues: { title: '', description: '', correctionGuide: '' },
    });
    
    // Security check
    useEffect(() => {
        if (!courseLoading && course && currentUser && course.instructorId !== currentUser.uid) {
            toast({
                variant: 'destructive',
                title: "Accès refusé",
                description: "Vous n'êtes pas autorisé à gérer les devoirs de ce cours.",
            });
            router.push('/instructor/devoirs');
        }
    }, [course, currentUser, courseLoading, router, toast]);

    const handleCreateAssignment = async (values: z.infer<typeof assignmentSchema>) => {
        if (!currentUser) return;
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
            setIsFormOpen(false);
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
    const hasError = courseError || assignmentsError;
    
    const FormWrapper = isMobile ? Sheet : Dialog;
    const FormContent = isMobile ? SheetContent : DialogContent;
    const FormHeader = isMobile ? SheetHeader : DialogHeader;
    const FormTitle = isMobile ? SheetTitle : DialogTitle;
    const FormDescription = isMobile ? SheetDescription : DialogDescription;


    return (
        <div className="space-y-8">
            <header>
                <Button variant="ghost" size="sm" onClick={() => router.push('/instructor/devoirs')} className="mb-2 dark:text-slate-300 dark:hover:bg-slate-800 -ml-4">
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
                        <p className="text-muted-foreground dark:text-slate-400">Créez et gérez les devoirs pour ce cours.</p>
                    </>
                )}
            </header>

            {hasError && (
                <div className="p-4 bg-destructive/10 text-destructive border border-destructive/50 rounded-lg flex items-center gap-3">
                    <AlertCircle className="h-5 w-5" />
                    <p>Une erreur est survenue lors du chargement des données. Un index Firestore est peut-être manquant.</p>
                </div>
            )}

            <Card className="dark:bg-slate-800 dark:border-slate-700 shadow-sm">
                <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                    <div>
                        <CardTitle className="dark:text-white">Liste des devoirs</CardTitle>
                        <CardDescription className="dark:text-slate-400">Cliquez sur un devoir pour voir les soumissions.</CardDescription>
                    </div>
                     <FormWrapper open={isFormOpen} onOpenChange={setIsFormOpen}>
                        <SheetTrigger asChild>
                            <Button className="w-full sm:w-auto">
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Créer un devoir
                            </Button>
                        </SheetTrigger>
                        <FormContent side={isMobile ? "bottom" : "right"} className="dark:bg-slate-900 dark:border-slate-800 dark:text-white">
                            <FormHeader>
                                <FormTitle>Créer un nouveau devoir</FormTitle>
                                <FormDescription className="dark:text-slate-400">Renseignez les informations du devoir ci-dessous.</FormDescription>
                            </FormHeader>
                             <Form {...form}>
                                <form onSubmit={form.handleSubmit(handleCreateAssignment)} className="space-y-4">
                                    <FormField control={form.control} name="title" render={({ field }) => (
                                        <FormItem><FormLabel className="dark:text-slate-300">Titre du devoir</FormLabel><FormControl><Input placeholder="Ex: Étude de cas marketing" {...field} className="dark:bg-slate-800 dark:border-slate-700" /></FormControl><FormMessage /></FormItem>
                                    )}/>
                                    <FormField control={form.control} name="description" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="flex justify-between items-center dark:text-slate-300">
                                                <span>Consignes pour l'étudiant</span>
                                                <Button type="button" variant="outline" size="sm" onClick={handleAiAssist} disabled={isAiLoading} className="dark:bg-slate-800 dark:border-slate-700 text-xs h-8">
                                                    {isAiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />} Assistance IA
                                                </Button>
                                            </FormLabel>
                                            <FormControl><Textarea placeholder="Décrivez les consignes du devoir..." {...field} rows={5} className="dark:bg-slate-800 dark:border-slate-700" /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}/>
                                     <FormField control={form.control} name="correctionGuide" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="flex items-center gap-2 dark:text-slate-300"><Bot className="h-4 w-4 text-primary" />Instructions pour MATHIAS (Correction IA)</FormLabel>
                                            <FormControl><Textarea placeholder="Ex: L'étudiant doit citer au moins 3 avantages. Vérifier la présence des mots-clés 'ROI'..." {...field} rows={4} className="dark:bg-slate-800 dark:border-slate-700" /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}/>
                                    <DialogFooter>
                                        <Button type="button" variant="ghost" onClick={() => setIsFormOpen(false)} className="dark:text-slate-300 dark:hover:bg-slate-800">Annuler</Button>
                                        <Button type="submit" disabled={isSubmitting}>
                                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Enregistrer
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
                                <TableHead className="dark:text-slate-300">Soumissions</TableHead>
                                <TableHead className="hidden sm:table-cell dark:text-slate-300">Statut</TableHead>
                                <TableHead className="text-right dark:text-slate-300">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                [...Array(3)].map((_, i) => (
                                    <TableRow key={i} className="dark:border-slate-700">
                                        <TableCell><Skeleton className="h-5 w-48 dark:bg-slate-700" /></TableCell>
                                        <TableCell className="hidden sm:table-cell"><Skeleton className="h-5 w-24 dark:bg-slate-700" /></TableCell>
                                        <TableCell><Skeleton className="h-5 w-5 rounded-full dark:bg-slate-700" /></TableCell>
                                        <TableCell className="hidden sm:table-cell"><Skeleton className="h-6 w-16 rounded-full dark:bg-slate-700" /></TableCell>
                                        <TableCell className="text-right"><Skeleton className="h-8 w-32 dark:bg-slate-700" /></TableCell>
                                    </TableRow>
                                ))
                            ) : assignments && assignments.length > 0 ? (
                                assignments.map((assignment) => (
                                    <AssignmentRow key={assignment.id} courseId={courseId as string} assignment={assignment} />
                                ))
                            ) : (
                                <TableRow className="dark:border-slate-700">
                                    <TableCell colSpan={5} className="h-48 text-center">
                                        <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground dark:text-slate-400">
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
