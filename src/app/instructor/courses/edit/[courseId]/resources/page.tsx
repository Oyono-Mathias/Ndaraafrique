
'use client';

import { useState } from 'react';
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

export default function ResourcesPage() {
    const { courseId } = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const db = getFirestore();
    const { formaAfriqueUser, isUserLoading } = useRole();

    const [isDialogOpen, setIsDialogOpen] = useState(false);
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

    const isLoading = resourcesLoading || isUserLoading;

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                     <div>
                        <CardTitle className="text-xl flex items-center gap-2">
                            <BookText className="h-5 w-5" />
                            Ressources du cours
                        </CardTitle>
                        <CardDescription>
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
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Nouvelle ressource</DialogTitle>
                                <DialogDescription>Renseignez les informations de la ressource.</DialogDescription>
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
                                                    <Input placeholder="Ex: Slides du chapitre 1" {...field} />
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
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Sélectionnez un type" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
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
                                                        <Input placeholder="https://example.com/ressource" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    }
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
                    {resourcesError && (
                        <div className="p-4 bg-destructive/10 text-destructive border border-destructive/50 rounded-lg flex items-center gap-3">
                            <AlertCircle className="h-5 w-5" />
                            <p>Une erreur est survenue lors du chargement des ressources. Un index Firestore est peut-être manquant.</p>
                        </div>
                    )}
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Titre</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Date d'ajout</TableHead>
                                <TableHead className="text-right">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                [...Array(3)].map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                                        <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                                        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                        <TableCell className="text-right"><Skeleton className="h-8 w-8" /></TableCell>
                                    </TableRow>
                                ))
                            ) : resources && resources.length > 0 ? (
                                resources.map((resource) => (
                                    <TableRow key={resource.id}>
                                        <TableCell className="font-medium flex items-center gap-3">
                                            <ResourceIcon type={resource.type} />
                                            {resource.title}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">{resource.type === 'link' ? 'Lien' : 'Fichier'}</TableCell>
                                        <TableCell className="text-muted-foreground">{resource.createdAt ? format(resource.createdAt.toDate(), 'dd MMM yyyy', { locale: fr }) : 'N/A'}</TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="icon" onClick={() => handleDeleteResource(resource.id)} className="text-destructive">
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-32 text-center">
                                        <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
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
