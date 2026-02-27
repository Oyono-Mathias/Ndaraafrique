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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import { Loader2, Bot, Sparkles, FileVideo, CheckCircle2, ShieldCheck } from 'lucide-react';

const formSchema = z.object({
  title: z.string().min(3, "Le titre est requis."),
  type: z.enum(['video', 'text', 'pdf']),
  contentUrl: z.string().min(1, "L'identifiant ou l'URL est requis."),
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
    const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);

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
            setUploadedFileName(null);
        } else if (isOpen) {
            form.reset({ title: '', type: 'video', contentUrl: '', textContent: '', duration: 0 });
            setUploadedFileName(null);
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
        
        setUploadedFileName(file.name);
        setUploadProgress(0);
        
        const storage = getStorage();
        const storageRef = ref(storage, `course_resources/${currentUser.uid}/${Date.now()}_${file.name}`);
        const uploadTask = uploadBytesResumable(storageRef, file);

        uploadTask.on('state_changed',
            (snapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                setUploadProgress(progress);
            },
            (error) => {
                toast({ variant: 'destructive', title: 'Erreur d\'upload', description: error.message });
                setUploadProgress(null);
                setUploadedFileName(null);
            },
            () => {
                getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
                    form.setValue('contentUrl', downloadURL);
                    setUploadProgress(null);
                    toast({ title: 'Fichier importé avec succès !' });
                });
            }
        );
    };

    const onSubmit = (values: z.infer<typeof formSchema>) => {
        startTransition(async () => {
            try {
                const result = await (lecture
                    ? updateLecture({ courseId, sectionId, lectureId: lecture.id, formData: values })
                    : createLecture({ courseId, sectionId, formData: values }));
                
                if(result && result.success){
                    toast({ title: lecture ? 'Leçon modifiée' : 'Leçon créée' });
                    onOpenChange(false);
                } else {
                    const errorMsg = typeof result?.error === 'string' 
                        ? result.error 
                        : "Une erreur est survenue lors de la validation.";
                    
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
                    description: "Impossible de contacter le serveur." 
                });
            }
        });
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl bg-slate-900 border-slate-800 rounded-[2.5rem] overflow-hidden">
                <DialogHeader className="p-8 pb-0">
                    <div className="flex justify-between items-center pr-8">
                        <DialogTitle className="text-2xl font-black text-white uppercase tracking-tight">
                            {lecture ? "Modifier" : "Ajouter"} une leçon
                        </DialogTitle>
                        <Button 
                            type="button" 
                            variant="outline" 
                            size="sm" 
                            onClick={handleMathiasHelp} 
                            disabled={isAiLoading}
                            className="bg-primary/5 border-primary/20 text-primary h-10 px-4 rounded-xl font-bold uppercase text-[10px] tracking-widest"
                        >
                            {isAiLoading ? <Loader2 className="h-3 w-3 animate-spin mr-2"/> : <Bot className="h-4 w-4 mr-2" />}
                            Mathias IA
                        </Button>
                    </div>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 p-8">
                        <FormField control={form.control} name="title" render={({ field }) => ( 
                            <FormItem>
                                <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Titre de la leçon</FormLabel>
                                <FormControl><Input placeholder="Ex: Maîtriser les bases du sujet" {...field} className="h-12 bg-slate-950 border-slate-800 rounded-xl" /></FormControl>
                                <FormMessage />
                            </FormItem> 
                        )}/>
                        
                        <FormField control={form.control} name="type" render={({ field }) => ( 
                            <FormItem>
                                <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Format du contenu</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger className="h-12 bg-slate-950 border-slate-800 rounded-xl">
                                            <SelectValue />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent className="bg-slate-900 border-slate-800 text-white">
                                        <SelectItem value="video" className="py-3">🎥 Vidéo Sécurisée (Bunny.net)</SelectItem>
                                        <SelectItem value="text" className="py-3">✍️ Texte (Article/Guide)</SelectItem>
                                        <SelectItem value="pdf" className="py-3">📄 PDF (Support de cours)</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem> 
                        )}/>
                        
                        {selectedType === 'text' ? (
                            <FormField control={form.control} name="textContent" render={({ field }) => ( 
                                <FormItem>
                                    <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Contenu de la leçon</FormLabel>
                                    <FormControl><Textarea rows={10} placeholder="Rédigez votre leçon ici..." {...field} className="bg-slate-950 border-slate-800 rounded-xl resize-none p-4" /></FormControl>
                                    <FormMessage />
                                </FormItem> 
                            )}/>
                        ) : selectedType === 'video' ? (
                            <div className="space-y-4 p-6 bg-slate-950/50 rounded-3xl border border-slate-800">
                                <div className="flex items-center gap-3 text-primary mb-2">
                                    <ShieldCheck className="h-5 w-5" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">Flux Bunny.net Stream</span>
                                </div>
                                <FormField control={form.control} name="contentUrl" render={({ field }) => ( 
                                    <FormItem>
                                        <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">ID Vidéo Bunny</FormLabel>
                                        <FormControl>
                                            <Input 
                                                placeholder="Ex: 8a2b3c4d-5e6f-..." 
                                                {...field} 
                                                className="h-12 bg-slate-950 border-slate-800 rounded-xl font-mono text-sm"
                                            />
                                        </FormControl>
                                        <FormDescription className="text-[10px] italic">Copiez l'ID depuis votre bibliothèque Bunny Stream (ID: 382715).</FormDescription>
                                        <FormMessage />
                                    </FormItem> 
                                )}/>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Support PDF</Label>
                                <div className="relative">
                                    <Input 
                                        type="file" 
                                        accept=".pdf" 
                                        onChange={handleFileChange} 
                                        className="hidden" 
                                        id="lecture-pdf-upload"
                                        disabled={uploadProgress !== null}
                                    />
                                    <label 
                                        htmlFor="lecture-pdf-upload"
                                        className="flex flex-col items-center justify-center py-10 border-2 border-dashed border-slate-800 rounded-[2rem] bg-slate-950/50 cursor-pointer hover:border-primary/50 transition-all"
                                    >
                                        {uploadProgress !== null ? (
                                            <div className="w-full max-w-[200px] text-center space-y-3">
                                                <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                                                <Progress value={uploadProgress} className="h-1.5" />
                                                <p className="text-[10px] font-black text-white uppercase tracking-widest">{Math.round(uploadProgress)}%</p>
                                            </div>
                                        ) : uploadedFileName ? (
                                            <div className="flex flex-col items-center gap-2">
                                                <CheckCircle2 className="h-10 w-10 text-emerald-500" />
                                                <span className="text-xs font-bold text-white truncate max-w-[250px]">{uploadedFileName}</span>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center gap-2">
                                                <FileVideo className="h-10 w-10 text-slate-700" />
                                                <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Choisir un PDF</span>
                                            </div>
                                        )}
                                    </label>
                                </div>
                                <FormField control={form.control} name="contentUrl" render={({ field }) => ( 
                                    <FormItem>
                                        <FormControl><Input placeholder="Ou URL directe du PDF..." {...field} className="h-10 bg-slate-950 border-slate-800 rounded-xl text-xs" /></FormControl>
                                        <FormMessage />
                                    </FormItem> 
                                )}/>
                            </div>
                        )}

                        <FormField control={form.control} name="duration" render={({ field }) => ( 
                            <FormItem>
                                <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Durée estimée (min)</FormLabel>
                                <FormControl><Input type="number" {...field} className="h-12 bg-slate-950 border-slate-800 rounded-xl" /></FormControl>
                                <FormMessage />
                            </FormItem> 
                        )}/>

                        <DialogFooter className="pt-6 border-t border-white/5 gap-3 sm:gap-0">
                            <DialogClose asChild><Button type="button" variant="ghost" className="rounded-xl font-bold text-slate-500">Annuler</Button></DialogClose>
                            <Button type="submit" disabled={isPending || uploadProgress !== null} className="h-14 px-10 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black uppercase text-xs tracking-widest shadow-xl shadow-primary/20 transition-all active:scale-95">
                                {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Sparkles className="mr-2 h-4 w-4"/>} 
                                Enregistrer la leçon
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}