'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRole } from '@/context/RoleContext';
import { useToast } from '@/hooks/use-toast';
import { createResourceAction } from '@/actions/resourceActions';
import type { Resource, Course } from '@/lib/types';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Loader2, FileUp, Globe } from 'lucide-react';

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
    const [isUploading, setIsUploading] = useState(false);

    const form = useForm<ResourceFormValues>({
        resolver: zodResolver(resourceFormSchema),
        defaultValues: { title: '', courseId: '', url: '' },
    });

    useEffect(() => {
        if (!isOpen) {
            form.reset();
            setIsUploading(false);
        }
    }, [isOpen, form]);

    /**
     * Téléversement vers Bunny Storage au lieu de Firebase
     */
    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !currentUser) return;

        setIsUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('userId', currentUser.uid);
            formData.append('folder', 'resources');

            const response = await fetch('/api/storage/upload', {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error);

            form.setValue('url', data.url);
            toast({ title: 'Fichier hébergé sur Bunny !' });
        } catch (error: any) {
            toast({ variant: 'destructive', title: "Erreur d'upload", description: error.message });
        } finally {
            setIsUploading(false);
        }
    };

    const onSubmit = async (values: ResourceFormValues) => {
        if (!currentUser) return;
        setIsSubmitting(true);
        
        // Déterminer le type basé sur l'URL
        const isBunnyUrl = values.url.includes('b-cdn.net');
        const type = isBunnyUrl ? getFileType(values.url) : 'link';

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
            <DialogContent className="dark:bg-slate-900 dark:border-slate-800 rounded-[2rem] overflow-hidden">
                <DialogHeader className="p-6 pb-0">
                    <DialogTitle className="text-xl font-bold text-white uppercase tracking-tight">Ajouter une ressource</DialogTitle>
                    <DialogDescription>Les fichiers seront hébergés sur Bunny CDN pour une rapidité maximale.</DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 p-6">
                        <FormField control={form.control} name="title" render={({ field }) => ( 
                            <FormItem>
                                <FormLabel className="text-[10px] font-black uppercase text-slate-500">Titre de la ressource</FormLabel>
                                <FormControl><Input placeholder="Ex: Diapositives du chapitre 1" {...field} className="h-12 bg-slate-950 border-slate-800 rounded-xl" /></FormControl>
                                <FormMessage />
                            </FormItem> 
                        )}/>
                        <FormField control={form.control} name="courseId" render={({ field }) => ( 
                            <FormItem>
                                <FormLabel className="text-[10px] font-black uppercase text-slate-500">Cours associé</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger className="h-12 bg-slate-950 border-slate-800 rounded-xl">
                                            <SelectValue placeholder="Sélectionnez un cours" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent className="bg-slate-900 border-slate-800">
                                        {courses.map(c => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem> 
                        )}/>
                        
                        <div className="space-y-4">
                            <Label className="text-[10px] font-black uppercase text-slate-500">Fichier ou Lien Web</Label>
                            <div className="relative">
                                <Input type="file" onChange={handleFileChange} className="hidden" id="resource-file-input" disabled={isUploading}/>
                                <label htmlFor="resource-file-input" className="flex flex-col items-center justify-center py-8 border-2 border-dashed border-slate-800 rounded-2xl cursor-pointer hover:bg-slate-950/50 transition-colors">
                                    {isUploading ? <Loader2 className="h-8 w-8 animate-spin text-primary" /> : <FileUp className="h-8 w-8 text-slate-600" />}
                                    <span className="text-[10px] font-black uppercase mt-2">Choisir un fichier</span>
                                </label>
                            </div>
                            <div className="flex items-center gap-4 text-slate-700">
                                <div className="h-px bg-slate-800 flex-1" />
                                <span className="text-[10px] font-black uppercase">OU</span>
                                <div className="h-px bg-slate-800 flex-1" />
                            </div>
                             <FormField control={form.control} name="url" render={({ field }) => ( 
                                <FormItem>
                                    <FormControl>
                                        <div className="flex items-center gap-3 bg-slate-950 border border-slate-800 rounded-xl p-1 pr-4">
                                            <div className="p-2 bg-slate-800 rounded-lg text-slate-500"><Globe className="h-4 w-4"/></div>
                                            <Input placeholder="URL externe (ex: Drive, GitHub...)" {...field} className="border-none bg-transparent focus-visible:ring-0 h-10" />
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem> 
                            )}/>
                        </div>

                        <DialogFooter className="pt-4 border-t border-white/5">
                            <DialogClose asChild><Button type="button" variant="ghost" className="font-bold text-slate-500 uppercase text-[10px]">Annuler</Button></DialogClose>
                            <Button type="submit" disabled={isSubmitting || isUploading} className="h-12 px-8 rounded-xl bg-primary hover:bg-primary/90 font-black uppercase text-[10px]">
                                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null} 
                                Ajouter la ressource
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
