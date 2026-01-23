'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { useRole } from '@/context/RoleContext';
import { useToast } from '@/hooks/use-toast';
import { createResourceAction } from '@/actions/resourceActions';
import type { Resource, Course } from '@/lib/types';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

const resourceFormSchema = z.object({
  title: z.string().min(3, "Le titre doit faire au moins 3 caractères."),
  courseId: z.string().min(1, "Veuillez sélectionner un cours."),
  url: z.string().url("L'URL de la ressource est invalide."),
});
type ResourceFormValues = z.infer<typeof resourceFormSchema>;

const getFileType = (fileName: string): Resource['type'] => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    if (!extension) return 'file';
    if (['pdf'].includes(extension)) return 'pdf';
    if (['mp4', 'mov', 'avi'].includes(extension)) return 'video';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension)) return 'image';
    return 'file';
}

export function ResourceFormModal({ isOpen, onOpenChange, courses, onFormSubmit }: { isOpen: boolean, onOpenChange: (open: boolean) => void, courses: Course[], onFormSubmit: () => void }) {
    const { currentUser } = useRole();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<number | null>(null);

    const form = useForm<ResourceFormValues>({
        resolver: zodResolver(resourceFormSchema),
        defaultValues: { title: '', courseId: '', url: '' },
    });

    useEffect(() => {
        if (!isOpen) {
            form.reset();
            setUploadProgress(null);
        }
    }, [isOpen, form]);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !currentUser) return;

        setUploadProgress(0);
        const storage = getStorage();
        const storageRef = ref(storage, `course_resources/${currentUser.uid}/${Date.now()}_${file.name}`);
        const uploadTask = uploadBytesResumable(storageRef, file);

        uploadTask.on('state_changed',
            (snapshot) => setUploadProgress((snapshot.bytesTransferred / snapshot.totalBytes) * 100),
            (error) => {
                toast({ variant: 'destructive', title: 'Erreur d\'upload', description: error.message });
                setUploadProgress(null);
            },
            () => {
                getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
                    form.setValue('url', downloadURL);
                    toast({ title: 'Upload terminé !', description: 'Le fichier est prêt à être sauvegardé.' });
                });
            }
        );
    };

    const onSubmit = async (values: ResourceFormValues) => {
        if (!currentUser) return;
        setIsSubmitting(true);
        
        const isFileUpload = form.getValues('url').includes('firebasestorage.googleapis.com');
        const type = isFileUpload ? getFileType(values.url) : 'link';

        const result = await createResourceAction({
            formData: { ...values, type },
            instructorId: currentUser.uid
        });

        if (result.success) {
            toast({ title: 'Ressource ajoutée !' });
            onFormSubmit();
            onOpenChange(false);
        } else {
            toast({ variant: 'destructive', title: 'Erreur', description: JSON.stringify(result.error) });
        }
        setIsSubmitting(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="dark:bg-slate-900 dark:border-slate-800">
                <DialogHeader><DialogTitle>Ajouter une ressource</DialogTitle><DialogDescription>Partagez un fichier ou un lien avec vos étudiants.</DialogDescription></DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField control={form.control} name="title" render={({ field }) => ( <FormItem><FormLabel>Titre</FormLabel><FormControl><Input placeholder="Ex: Diapositives du chapitre 1" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                        <FormField control={form.control} name="courseId" render={({ field }) => ( <FormItem><FormLabel>Cours associé</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Sélectionnez un cours" /></SelectTrigger></FormControl><SelectContent>{courses.map(c => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem> )}/>
                        
                        <div className="space-y-2">
                            <Label>Fichier ou Lien</Label>
                            <Input type="file" onChange={handleFileChange} disabled={uploadProgress !== null}/>
                            {uploadProgress !== null && <Progress value={uploadProgress} className="h-2"/>}
                            <p className="text-xs text-center text-muted-foreground">OU</p>
                             <FormField control={form.control} name="url" render={({ field }) => ( <FormItem><FormControl><Input placeholder="Collez une URL directe ici" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                        </div>

                        <DialogFooter><DialogClose asChild><Button type="button" variant="ghost">Annuler</Button></DialogClose><Button type="submit" disabled={isSubmitting}>{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Ajouter</Button></DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
