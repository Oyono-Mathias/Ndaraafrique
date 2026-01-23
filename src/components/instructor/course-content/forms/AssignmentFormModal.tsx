
'use client';

import { useState, useEffect, useTransition } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { useRole } from '@/context/RoleContext';
import { useToast } from '@/hooks/use-toast';
import { createAssignment, updateAssignment } from '@/actions/assignmentActions';
import type { Assignment } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Loader2, CalendarIcon, FileUp, X } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const formSchema = z.object({
  title: z.string().min(3, "Le titre est requis."),
  description: z.string().optional(),
  correctionGuide: z.string().optional(),
  dueDate: z.date().optional(),
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
    const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
    });

    useEffect(() => {
        if (assignment) {
            form.reset({
                title: assignment.title || '',
                description: assignment.description || '',
                correctionGuide: assignment.correctionGuide || '',
                dueDate: assignment.dueDate?.toDate(),
                attachments: assignment.attachments || [],
            });
        } else {
            form.reset({ title: '', description: '', correctionGuide: '', attachments: [] });
        }
    }, [assignment, form, isOpen]);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files || !currentUser) return;

        Array.from(files).forEach(file => {
            const storage = getStorage();
            const storageRef = ref(storage, `assignment_attachments/${currentUser.uid}/${Date.now()}_${file.name}`);
            const uploadTask = uploadBytesResumable(storageRef, file);

            uploadTask.on('state_changed',
                (snapshot) => setUploadProgress(prev => ({ ...prev, [file.name]: (snapshot.bytesTransferred / snapshot.totalBytes) * 100 })),
                (error) => toast({ variant: 'destructive', title: `Erreur d'upload: ${file.name}`, description: error.message }),
                () => {
                    getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
                        const currentAttachments = form.getValues('attachments') || [];
                        form.setValue('attachments', [...currentAttachments, { name: file.name, url: downloadURL }]);
                    });
                }
            );
        });
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
                toast({ variant: 'destructive', title: 'Erreur', description: JSON.stringify(result.error) });
            }
        });
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl dark:bg-slate-900 dark:border-slate-800">
                <DialogHeader><DialogTitle>{assignment ? "Modifier" : "Ajouter"} un devoir</DialogTitle></DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField control={form.control} name="title" render={({ field }) => ( <FormItem><FormLabel>Titre du devoir</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                        <FormField control={form.control} name="description" render={({ field }) => ( <FormItem><FormLabel>Description / Consignes</FormLabel><FormControl><Textarea rows={5} {...field}/></FormControl><FormMessage /></FormItem> )}/>
                        <FormField control={form.control} name="correctionGuide" render={({ field }) => ( <FormItem><FormLabel>Guide de correction (pour l'IA)</FormLabel><FormControl><Textarea rows={3} {...field}/></FormControl><FormMessage /></FormItem> )}/>
                        <FormField control={form.control} name="dueDate" render={({ field }) => (
                           <FormItem className="flex flex-col"><FormLabel>Date limite (optionnel)</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant="outline" className="pl-3 text-left font-normal">{field.value ? format(field.value, "PPP", { locale: fr }) : <span>Choisissez une date</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem>
                        )}/>
                        
                        <div className="space-y-2">
                            <FormLabel>Fichiers joints</FormLabel>
                            <div className="space-y-2">
                                {form.watch('attachments')?.map((att, i) => (
                                    <div key={i} className="flex items-center justify-between p-2 bg-slate-800 rounded-md text-sm">
                                        <span>{att.name}</span>
                                        <Button variant="ghost" size="icon" type="button" onClick={() => removeAttachment(att.url)}><X className="h-4 w-4"/></Button>
                                    </div>
                                ))}
                            </div>
                            <Button type="button" variant="outline" className="w-full" asChild>
                                <label><FileUp className="h-4 w-4 mr-2"/> Téléverser des fichiers <input type="file" multiple onChange={handleFileChange} className="hidden"/></label>
                            </Button>
                        </div>
                        
                        <DialogFooter><DialogClose asChild><Button type="button" variant="ghost">Annuler</Button></DialogClose><Button type="submit" disabled={isPending}>{isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Enregistrer</Button></DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
