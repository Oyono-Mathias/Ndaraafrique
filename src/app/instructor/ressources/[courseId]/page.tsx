
'use client';

import { useState } from 'react';
import { useParams, Link } from 'next-intl/navigation';
import { useRole } from '@/context/RoleContext';
import { useCollection, useMemoFirebase } from '@/firebase';
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
import { Folder, PlusCircle, Loader2, AlertCircle, Link2, FileText, Trash2, BookText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useIsMobile } from '@/firebase';
import type { Resource } from '@/lib/types';


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

const ResourceForm = ({ form, onSubmit, isSubmitting }: { form: any, onSubmit: any, isSubmitting: boolean }) => {
    const formType = form.watch('type');
    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="dark:text-slate-300">Titre de la ressource</FormLabel>
                            <FormControl>
                                <Input placeholder="Ex: Slides du chapitre 1" {...field} className="dark:bg-slate-700 dark:border-slate-600" />
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
                            <FormLabel className="dark:text-slate-300">Type</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                    <SelectTrigger className="dark:bg-slate-700 dark:border-slate-600">
                                        <SelectValue placeholder="Sélectionnez un type" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent className="dark:bg-slate-800 dark:border-slate-700 dark:text-white">
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
                                <FormLabel className="dark:text-slate-300">URL</FormLabel>
                                <FormControl>
                                    <Input placeholder="https://example.com/ressource" {...field} className="dark:bg-slate-700 dark:border-slate-600"/>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                }
                <div className="flex justify-end pt-6 gap-2">
                    <Button type="button" variant="ghost" className="dark:hover:bg-slate-700 dark:text-slate-300">Annuler</Button>
                    <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Enregistrer
                    </Button>
                </div>
            </form>
        </Form>
    );
}

export default function ResourcesPage() {
    const { courseId } = useParams();
    const { toast } = useToast();
    const db = getFirestore();
    const { currentUser, isUserLoading } = useRole();
    const isMobile = useIsMobile();

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const resourcesQuery = useMemoFirebase(
        () => query(collection(db, 'resources'), where('courseId', '==', courseId), orderBy('createdAt', 'desc')),
        [db, courseId]
    );
    const { data: resources, isLoading: resourcesLoading, error: resourcesError } = useCollection<Resource>(resourcesQuery);

    const form = useForm<z.infer<typeof resourceSchema>>({
        resolver: zodResolver(resourceSchema),
        defaultValues: { title: '', type: 'link', url: '' },
    });

    const handleCreateResource = async (values: z.infer<typeof resourceSchema>) => {
        if (!currentUser) return;
        setIsSubmitting(true);
        
        const resourcePayload = {
            ...values,
            courseId: courseId,
            instructorId: currentUser.uid,
            createdAt: serverTimestamp(),
        };

        try {
            const resourcesCollection = collection(db, 'resources');
            await addDoc(resourcesCollection, resourcePayload);
            toast({ title: "Ressource ajoutée !", description: "La nouvelle ressource est disponible pour les étudiants." });
            setIsFormOpen(false);
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

    const isLoading = resourcesLoading || isUserLoading;

    const FormWrapper = isMobile ? Sheet : Dialog;
    const FormContent = isMobile ? SheetContent : DialogContent;
    const FormHeader = isMobile ? SheetHeader : DialogHeader;
    const FormTitle = isMobile ? SheetTitle : DialogTitle;
    const FormDescription = isMobile ? SheetDescription : DialogDescription;


    return (
        <div className="space-y-6">
            <Card className="dark:bg-[#1e293b] dark:border-slate-700">
                <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                     <div>
                        <CardTitle className="text-xl flex items-center gap-2 dark:text-white">
                            <BookText className="h-5 w-5" />
                            Ressources du cours
                        </CardTitle>
                        <CardDescription className="dark:text-slate-400">
                            Ajoutez et gérez les documents et liens pour ce cours.
                        </CardDescription>
                    </div>
                     <FormWrapper open={isFormOpen} onOpenChange={setIsFormOpen}>
                        <SheetTrigger asChild>
                             <Button className="w-full sm:w-auto">
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Ajouter
                            </Button>
                        </SheetTrigger>
                        <FormContent side={isMobile ? 'bottom' : 'right'} className="dark:bg-slate-900 dark:border-slate-800 dark:text-white">
                            <FormHeader>
                                <FormTitle>Nouvelle ressource</FormTitle>
                                <FormDescription className="dark:text-slate-400">Renseignez les informations de la ressource.</FormDescription>
                            </FormHeader>
                            <ResourceForm form={form} onSubmit={handleCreateResource} isSubmitting={isSubmitting} />
                        </FormContent>
                    </FormWrapper>
                </CardHeader>
                <CardContent>
                    {resourcesError && (
                        <div className="p-4 bg-destructive/10 text-destructive border border-destructive/50 rounded-lg flex items-center gap-3">
                            <AlertCircle className="h-5 w-5" />
                            <p>Une erreur est survenue lors du chargement des ressources. Un index Firestore est peut-être manquant.</p>
                        </div>
                    )}
                    <Table>
                        <TableHeader>
                            <TableRow className="dark:border-slate-700 hover:bg-slate-800/50">
                                <TableHead className="dark:text-slate-300">Titre</TableHead>
                                <TableHead className="hidden sm:table-cell dark:text-slate-300">Type</TableHead>
                                <TableHead className="hidden sm:table-cell dark:text-slate-300">Date d'ajout</TableHead>
                                <TableHead className="text-right dark:text-slate-300">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                [...Array(3)].map((_, i) => (
                                    <TableRow key={i} className="dark:border-slate-700">
                                        <TableCell><Skeleton className="h-5 w-48 bg-slate-700" /></TableCell>
                                        <TableCell className="hidden sm:table-cell"><Skeleton className="h-5 w-16 bg-slate-700" /></TableCell>
                                        <TableCell className="hidden sm:table-cell"><Skeleton className="h-5 w-24 bg-slate-700" /></TableCell>
                                        <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto bg-slate-700" /></TableCell>
                                    </TableRow>
                                ))
                            ) : resources && resources.length > 0 ? (
                                resources.map((resource) => (
                                    <TableRow key={resource.id} className="dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800/50">
                                        <TableCell className="font-medium flex items-center gap-3 dark:text-slate-100">
                                            <ResourceIcon type={resource.type} />
                                            {resource.title}
                                        </TableCell>
                                        <TableCell className="hidden sm:table-cell">{resource.type === 'link' ? 'Lien' : 'Fichier'}</TableCell>
                                        <TableCell className="hidden sm:table-cell">{resource.createdAt ? format(resource.createdAt.toDate(), 'dd MMM yyyy', { locale: fr }) : 'N/A'}</TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="icon" onClick={() => handleDeleteResource(resource.id)} className="text-red-500 hover:text-red-400">
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow className="dark:border-slate-700">
                                    <TableCell colSpan={4} className="h-32 text-center">
                                        <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground dark:text-slate-400">
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
    )
}
