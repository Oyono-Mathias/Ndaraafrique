

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
  where,
  deleteDoc,
} from 'firebase/firestore';
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
import { Folder, PlusCircle, ArrowLeft, Loader2, AlertCircle, Link2, FileText, Trash2, BookText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import type { Course } from '@/lib/types';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Resource {
    id: string;
    title: string;
    type: 'link' | 'file';
    url: string;
    createdAt: any;
}

const resourceSchema = z.object({
    title: z.string().min(3, { message: 'Le titre doit contenir au moins 3 caractères.' }),
    type: z.enum(['link', 'file'], { required_error: "Le type de ressource est requis." }),
    url: z.string().url({ message: "Veuillez entrer une URL valide." }),
});

const ResourceIcon = ({ type }: { type: 'link' | 'file' }) => {
    switch (type) {
        case 'link': return <Link2 className="h-5 w-5 text-slate-500" />;
        case 'file': return <FileText className="h-5 w-5 text-slate-500" />;
        default: return <Folder className="h-5 w-5 text-slate-500" />;
    }
};

export default function CourseResourcesPage() {
    const { courseId } = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const db = getFirestore();
    const { formaAfriqueUser, isUserLoading } = useRole();

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const courseRef = useMemoFirebase(() => doc(db, 'courses', courseId as string), [db, courseId]);
    const { data: course, isLoading: courseLoading } = useDoc<Course>(courseRef);
    
    const resourcesQuery = useMemoFirebase(
        () => query(collection(db, 'resources'), where('courseId', '==', courseId), orderBy('createdAt', 'desc')),
        [db, courseId]
    );
    const { data: resources, isLoading: resourcesLoading, error: resourcesError } = useCollection<Resource>(resourcesQuery);

    const form = useForm<z.infer<typeof resourceSchema>>({
        resolver: zodResolver(resourceSchema),
        defaultValues: { title: '', type: 'link', url: '' },
    });
    
    const formType = form.watch('type');

    const handleCreateResource = async (values: z.infer<typeof resourceSchema>) => {
        if (!formaAfriqueUser) return;
        setIsSubmitting(true);
        
        const resourcePayload = {
            ...values,
            courseId: courseId,
            instructorId: formaAfriqueUser.uid,
            createdAt: serverTimestamp(),
        };

        try {
            const resourcesCollection = collection(db, 'resources');
            await addDoc(resourcesCollection, resourcePayload);
            toast({ title: "Ressource ajoutée !", description: "La nouvelle ressource est disponible pour les étudiants." });
            setIsDialogOpen(false);
            form.reset();
        } catch (error) {
            console.error("Error creating resource:", error);
            errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: 'resources',
                operation: 'create',
                requestResourceData: resourcePayload,
            }));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteResource = async (resourceId: string) => {
        const resourceRef = doc(db, 'resources', resourceId);
        try {
            await deleteDoc(resourceRef);
            toast({ title: 'Ressource supprimée' });
        } catch (error) {
            console.error("Error deleting resource:", error);
            toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de supprimer la ressource.' });
        }
    };

    const isLoading = courseLoading || resourcesLoading || isUserLoading;

    return (
        <div className="space-y-8">
            <header>
                <Button variant="ghost" size="sm" onClick={() => router.push('/instructor/ressources')} className="mb-2">
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
                        <h1 className="text-3xl font-bold text-white">Ressources pour "{course?.title}"</h1>
                        <p className="text-slate-400">Ajoutez et gérez les supports de ce cours.</p>
                    </>
                )}
            </header>

            {resourcesError && (
                <div className="p-4 bg-red-900/50 text-red-300 border border-red-700 rounded-lg flex items-center gap-3">
                    <AlertCircle className="h-5 w-5" />
                    <p>Une erreur est survenue lors du chargement des ressources. Un index Firestore est peut-être manquant.</p>
                </div>
            )}

            <Card className="bg-slate-800 border-slate-700">
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="text-xl flex items-center gap-2 text-white">
                            <BookText className="h-5 w-5" />
                            Ressources du cours
                        </CardTitle>
                        <CardDescription className="text-slate-400">
                            Ajoutez et gérez les documents et liens pour ce cours.
                        </CardDescription>
                    </div>
                     <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button>
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Ajouter
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-slate-800 border-slate-700 text-white">
                            <DialogHeader>
                                <DialogTitle>Nouvelle ressource</DialogTitle>
                                <DialogDescription className="text-slate-400">Renseignez les informations de la ressource.</DialogDescription>
                            </DialogHeader>
                            <Form {...form}>
                                <form onSubmit={form.handleSubmit(handleCreateResource)} className="space-y-4">
                                    <FormField
                                        control={form.control}
                                        name="title"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Titre de la ressource</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="Ex: Slides du chapitre 1" {...field} className="bg-slate-700 border-slate-600" />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                     <FormField
                                        control={form.control}
                                        name="type"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Type</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger className="bg-slate-700 border-slate-600">
                                                            <SelectValue placeholder="Sélectionnez un type" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent className="bg-slate-800 border-slate-700 text-white">
                                                        <SelectItem value="link">Lien externe</SelectItem>
                                                        <SelectItem value="file" disabled>Fichier (bientôt disponible)</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    {formType === 'link' &&
                                        <FormField
                                            control={form.control}
                                            name="url"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>URL</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="https://example.com/ressource" {...field} className="bg-slate-700 border-slate-600"/>
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    }
                                    <DialogFooter>
                                        <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)} className="hover:bg-slate-700">Annuler</Button>
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
                            <TableRow className="border-slate-700 hover:bg-slate-700/50">
                                <TableHead className="text-slate-300">Titre</TableHead>
                                <TableHead className="text-slate-300">Type</TableHead>
                                <TableHead className="text-slate-300">Date d'ajout</TableHead>
                                <TableHead className="text-right text-slate-300">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                [...Array(3)].map((_, i) => (
                                    <TableRow key={i} className="border-slate-700">
                                        <TableCell><Skeleton className="h-5 w-48 bg-slate-700" /></TableCell>
                                        <TableCell><Skeleton className="h-5 w-16 bg-slate-700" /></TableCell>
                                        <TableCell><Skeleton className="h-5 w-24 bg-slate-700" /></TableCell>
                                        <TableCell className="text-right"><Skeleton className="h-8 w-8 bg-slate-700" /></TableCell>
                                    </TableRow>
                                ))
                            ) : resources && resources.length > 0 ? (
                                resources.map((resource) => (
                                    <TableRow key={resource.id} className="border-slate-700 hover:bg-slate-700/50 text-slate-300">
                                        <TableCell className="font-medium flex items-center gap-3 text-slate-100">
                                            <ResourceIcon type={resource.type} />
                                            {resource.title}
                                        </TableCell>
                                        <TableCell>{resource.type === 'link' ? 'Lien' : 'Fichier'}</TableCell>
                                        <TableCell>{resource.createdAt ? format(resource.createdAt.toDate(), 'dd MMM yyyy', { locale: fr }) : 'N/A'}</TableCell>
                                        <TableCell className="text-right">
                                             <Button variant="ghost" asChild className="text-blue-400 hover:text-blue-300 text-sm p-2 h-auto">
                                                <a href={resource.url} target="_blank" rel="noopener noreferrer">
                                                    Ouvrir
                                                </a>
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => handleDeleteResource(resource.id)} className="text-red-400 hover:text-red-300 ml-2">
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow className="border-slate-700">
                                    <TableCell colSpan={4} className="h-32 text-center">
                                        <div className="flex flex-col items-center justify-center gap-2 text-slate-400">
                                            <Folder className="h-10 w-10" />
                                            <span className="font-medium">Aucune ressource pour ce cours</span>
                                            <span className="text-sm">Cliquez sur "Ajouter" pour commencer.</span>
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
