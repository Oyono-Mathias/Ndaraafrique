'use client';

/**
 * @fileOverview Formulaire de création de devoirs.
 * Optimisé : Pièces jointes hébergées sur Bunny Storage.
 */

import { useState, useEffect, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRole } from '@/context/RoleContext';
import { useToast } from '@/hooks/use-toast';
import { createAssignment, updateAssignment } from '@/actions/assignmentActions';
import type { Assignment } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle, 
    DialogFooter, 
    DialogClose 
} from '@/components/ui/dialog';
import { 
    Form, 
    FormControl, 
    FormField, 
    FormItem, 
    FormLabel, 
    FormMessage 
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, FileUp, X, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

const formSchema = z.object({
  title: z.string().min(3, "Le titre est requis."),
  description: z.string().optional(),
  correctionGuide: z.string().optional(),
  attachments: z.array(z.object({ name: z.string(), url: z.string().url() })).optional(),
});

interface AssignmentFormModalProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    courseId: string;
    sectionId: string;
    assignment?: Assignment;
}

export function AssignmentFormModal({ isOpen, onOpenChange, courseId, sectionId, assignment }: AssignmentFormModalProps) {
    const { currentUser } = useRole();
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();
    const [isUploading, setIsUploading] = useState(false);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
    });

    useEffect(() => {
        if (assignment && isOpen) {
            form.reset({
                title: assignment.title || '',
                description: assignment.description || '',
                correctionGuide: assignment.correctionGuide || '',
                attachments: assignment.attachments || [],
            });
        } else if (isOpen) {
            form.reset({ title: '', description: '', correctionGuide: '', attachments: [] });
        }
    }, [assignment, form, isOpen]);

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files || !currentUser) return;

        setIsUploading(true);
        try {
            const uploadPromises = Array.from(files).map(async (file) => {
                const formData = new FormData();
                formData.append('file', file);
                formData.append('userId', currentUser.uid);
                formData.append('folder', 'assignments');

                const response = await fetch('/api/storage/upload', {
                    method: 'POST',
                    body: formData,
                });

                const data = await response.json();
                if (!response.ok) throw new Error(data.error);
                return { name: file.name, url: data.url };
            });

            const results = await Promise.all(uploadPromises);
            const currentAttachments = form.getValues('attachments') || [];
            form.setValue('attachments', [...currentAttachments, ...results]);
            toast({ title: `${results.length} fichier(s) prêt(s) sur Bunny !` });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Erreur d\'upload', description: error.message });
        } finally {
            setIsUploading(false);
        }
    };
    
    const removeAttachment = (urlToRemove: string) => {
        const currentAttachments = form.getValues('attachments') || [];
        form.setValue('attachments', currentAttachments.filter(att => att.url !== urlToRemove));
    };

    const onSubmit = (values: z.infer<typeof formSchema>) => {
        startTransition(async () => {
            const result = assignment
                ? await updateAssignment({ courseId, sectionId, assignmentId: assignment.id, formData: values })
                : await createAssignment({ courseId, sectionId, formData: values });
            
            if(result.success){
                toast({ title: assignment ? 'Devoir modifié' : 'Devoir créé' });
                onOpenChange(false);
            } else {
                toast({ variant: 'destructive', title: 'Erreur', description: 'Échec de la sauvegarde.' });
            }
        });
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl bg-slate-900 border-slate-800 rounded-[2rem] overflow-hidden z-[10000]">
                <DialogHeader className="p-8 pb-0">
                    <DialogTitle className="text-2xl font-black text-white uppercase tracking-tight">{assignment ? "Modifier" : "Ajouter"} un devoir</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 p-8">
                        <FormField control={form.control} name="title" render={({ field }) => ( 
                            <FormItem><FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Titre du devoir</FormLabel><FormControl><Input {...field} className="h-12 bg-slate-950 border-slate-800 rounded-xl text-white" /></FormControl><FormMessage /></FormItem> 
                        )}/>
                        <FormField control={form.control} name="description" render={({ field }) => ( 
                            <FormItem><FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Consignes</FormLabel><FormControl><Textarea rows={5} {...field} className="bg-slate-950 border-slate-800 rounded-xl text-white" /></FormControl><FormMessage /></FormItem> 
                        )}/>
                        <FormField control={form.control} name="correctionGuide" render={({ field }) => ( 
                            <FormItem><FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Guide IA</FormLabel><FormControl><Textarea rows={3} {...field} className="bg-slate-950 border-slate-800 rounded-xl text-white" /></FormControl><FormMessage /></FormItem> 
                        )}/>
                        
                        <div className="space-y-3">
                            <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Fichiers joints (Bunny CDN)</FormLabel>
                            <div className="grid gap-2">
                                {form.watch('attachments')?.map((att, i) => (
                                    <div key={i} className="flex items-center justify-between p-3 bg-slate-800 rounded-xl border border-white/5 text-sm text-white">
                                        <span className="truncate flex-1">{att.name}</span>
                                        <Button variant="ghost" size="icon" type="button" onClick={() => removeAttachment(att.url)} className="text-slate-400 hover:text-red-500 h-8 w-8"><X className="h-4 w-4"/></Button>
                                    </div>
                                ))}
                            </div>
                            <Button type="button" variant="outline" className="w-full h-12 bg-slate-950 border-slate-800 rounded-xl" asChild disabled={isUploading}>
                                <label className="cursor-pointer">
                                    {isUploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin"/> : <FileUp className="h-4 w-4 mr-2"/>}
                                    Ajouter des fichiers
                                    <input type="file" multiple onChange={handleFileChange} className="hidden" disabled={isUploading}/>
                                </label>
                            </Button>
                        </div>
                        
                        <DialogFooter className="pt-6 border-t border-white/5">
                            <DialogClose asChild><Button type="button" variant="ghost" className="font-bold text-slate-500 uppercase text-[10px]">Annuler</Button></DialogClose>
                            <Button type="submit" disabled={isPending || isUploading} className="h-14 px-10 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black uppercase text-xs tracking-widest shadow-xl shadow-primary/20">
                                {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Sparkles className="mr-2 h-4 w-4"/>} 
                                Enregistrer
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
