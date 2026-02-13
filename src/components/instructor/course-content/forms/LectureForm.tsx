'use client';

import { useState, useEffect, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { useRole } from '@/context/RoleContext';
import { useToast } from '@/hooks/use-toast';
import { createLecture, updateLecture } from '@/actions/lectureActions';
import { assistLectureCreation } from '@/ai/flows/assist-lecture-creation';
import type { Lecture } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import { Loader2, Bot, Sparkles } from 'lucide-react';

const formSchema = z.object({
  title: z.string().min(3, "Le titre est requis."),
  type: z.enum(['video', 'text', 'pdf']),
  contentUrl: z.string().url().optional(),
  textContent: z.string().optional(),
  duration: z.coerce.number().min(0).optional(),
});

interface LectureFormModalProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    courseId: string;
    sectionId: string;
    lecture?: Lecture;
}

export function LectureFormModal({ isOpen, onOpenChange, courseId, sectionId, lecture }: LectureFormModalProps) {
    const { currentUser } = useRole();
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();
    const [isAiLoading, setIsAiLoading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<number | null>(null);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            title: lecture?.title || '',
            type: lecture?.type || 'video',
            contentUrl: lecture?.contentUrl || '',
            textContent: lecture?.textContent || '',
            duration: lecture?.duration || 0,
        },
    });

    const selectedType = form.watch('type');
    
    useEffect(() => {
        if(lecture && isOpen) {
            form.reset({
                title: lecture.title,
                type: lecture.type,
                contentUrl: lecture.contentUrl || '',
                textContent: lecture.textContent || '',
                duration: lecture.duration || 0,
            });
        } else if (isOpen) {
            form.reset({ title: '', type: 'video', contentUrl: '', textContent: '', duration: 0 });
        }
    }, [lecture, form, isOpen]);

    const handleMathiasHelp = async () => {
        const title = form.getValues('title');
        if (!title || title.length < 3) {
            toast({ variant: 'destructive', title: "Titre requis", description: "Donnez un titre à la leçon pour que Mathias puisse rédiger." });
            return;
        }

        setIsAiLoading(true);
        try {
            const result = await assistLectureCreation({ lectureTitle: title, courseTitle: "Formation Ndara" });
            form.setValue('textContent', result.description);
            form.setValue('type', 'text');
            toast({ title: "Mathias a rédigé votre leçon !" });
        } catch (error) {
            toast({ variant: 'destructive', title: "Erreur IA", description: "Impossible de joindre Mathias." });
        } finally {
            setIsAiLoading(false);
        }
    };

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
                    form.setValue('contentUrl', downloadURL);
                    toast({ title: 'Upload terminé !' });
                });
            }
        );
    };

    const onSubmit = (values: z.infer<typeof formSchema>) => {
        startTransition(async () => {
            try {
                const result = lecture
                    ? await updateLecture({ courseId, sectionId, lectureId: lecture.id, formData: values })
                    : await createLecture({ courseId, sectionId, formData: values });
                
                if(result && result.success){
                    toast({ title: lecture ? 'Leçon modifiée' : 'Leçon créée' });
                    onOpenChange(false);
                } else {
                    // ✅ Fixed: Robustly convert potential object error to string for toast description
                    const errorMsg = typeof result?.error === 'string' 
                        ? result.error 
                        : 'Certains champs sont invalides. Veuillez vérifier le formulaire.';
                    
                    toast({ 
                        variant: 'destructive', 
                        title: 'Erreur', 
                        description: errorMsg 
                    });
                }
            } catch (e: any) {
                toast({ 
                    variant: 'destructive', 
                    title: 'Erreur système', 
                    description: "Le serveur est indisponible. Vérifiez votre connexion." 
                });
            }
        });
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl dark:bg-slate-900 dark:border-slate-800">
                <DialogHeader>
                    <div className="flex justify-between items-center pr-8">
                        <DialogTitle>{lecture ? "Modifier" : "Ajouter"} une leçon</DialogTitle>
                        <Button 
                            type="button" 
                            variant="outline" 
                            size="sm" 
                            onClick={handleMathiasHelp} 
                            disabled={isAiLoading}
                            className="bg-primary/5 border-primary/20 text-primary h-8"
                        >
                            {isAiLoading ? <Loader2 className="h-3 w-3 animate-spin mr-2"/> : <Bot className="h-3 w-3 mr-2" />}
                            IA Mathias
                        </Button>
                    </div>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField control={form.control} name="title" render={({ field }) => ( <FormItem><FormLabel>Titre</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                        <FormField control={form.control} name="type" render={({ field }) => ( <FormItem><FormLabel>Type</FormLabel><Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent><SelectItem value="video">Vidéo</SelectItem><SelectItem value="text">Texte</SelectItem><SelectItem value="pdf">PDF</SelectItem></SelectContent></Select><FormMessage /></FormItem> )}/>
                        
                        {selectedType === 'text' ? (
                            <FormField control={form.control} name="textContent" render={({ field }) => ( <FormItem><FormLabel>Contenu du texte</FormLabel><FormControl><Textarea rows={8} {...field}/></FormControl><FormMessage /></FormItem> )}/>
                        ) : (
                            <div className="space-y-2">
                                <Label>Fichier ({selectedType === 'video' ? 'Vidéo' : 'PDF'})</Label>
                                <Input type="file" accept={selectedType === 'video' ? 'video/*' : '.pdf'} onChange={handleFileChange} disabled={uploadProgress !== null}/>
                                {uploadProgress !== null && <Progress value={uploadProgress} className="h-1 mt-2"/>}
                                <FormField control={form.control} name="contentUrl" render={({ field }) => ( <FormItem><FormControl><Input placeholder="Ou collez une URL directe" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                            </div>
                        )}

                        <FormField control={form.control} name="duration" render={({ field }) => ( <FormItem><FormLabel>Durée estimée (minutes)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )}/>

                        <DialogFooter><DialogClose asChild><Button type="button" variant="ghost">Annuler</Button></DialogClose><Button type="submit" disabled={isPending}>{isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Enregistrer</Button></DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
