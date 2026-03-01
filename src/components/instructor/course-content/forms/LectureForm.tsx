'use client';

/**
 * @fileOverview Formulaire de création de leçon Ndara Afrique (Optimisé Bunny/YouTube).
 */

import { useEffect, useTransition, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { useRole } from '@/context/RoleContext';
import { useToast } from '@/hooks/use-toast';
import { createLecture, updateLecture } from '@/actions/lectureActions';
import type { Lecture, Settings } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Loader2, CheckCircle2, UploadCloud, Youtube, Info, PlaySquare, FileText, MessageSquareText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getFirestore, doc, onSnapshot } from 'firebase/firestore';

const formSchema = z.object({
  title: z.string().min(3, "Le titre est requis."),
  type: z.enum(['video', 'youtube', 'text', 'pdf']),
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
    const [uploadProgress, setUploadProgress] = useState<number | null>(null);
    const db = getFirestore();

    const [adminSettings, setAdminSettings] = useState({
        allowYoutube: true,
        allowBunny: true,
        isLoading: true
    });

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            title: '',
            type: 'video',
            contentUrl: '',
            textContent: '',
            duration: 0,
        },
    });

    const selectedType = form.watch('type');
    
    useEffect(() => {
        const unsub = onSnapshot(doc(db, 'settings', 'global'), (snap) => {
            if (snap.exists()) {
                const data = snap.data() as Settings;
                setAdminSettings({
                    allowYoutube: data.platform?.allowYoutube ?? true,
                    allowBunny: data.platform?.allowBunny ?? true,
                    isLoading: false
                });
            }
        });
        return () => unsub();
    }, [db]);

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
        setUploadProgress(null);
    }, [lecture, form, isOpen]);

    const handlePdfUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !currentUser) return;
        
        setUploadProgress(0);
        
        const storage = getStorage();
        const storageRef = ref(storage, `course_resources/${currentUser.uid}/${Date.now()}_${file.name}`);
        const uploadTask = uploadBytesResumable(storageRef, file);

        uploadTask.on('state_changed',
            (snapshot) => setUploadProgress((snapshot.bytesTransferred / snapshot.totalBytes) * 100),
            (error) => {
                toast({ variant: 'destructive', title: 'Erreur PDF', description: error.message });
                setUploadProgress(null);
            },
            () => {
                getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
                    form.setValue('contentUrl', downloadURL, { shouldValidate: true });
                    setUploadProgress(null);
                    toast({ title: 'PDF importé avec succès !' });
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
                
                if (result.success) {
                    toast({ title: 'Leçon enregistrée !' });
                    onOpenChange(false);
                } else {
                    const errorMsg = typeof result.error === 'string' ? result.error : "Erreur lors de l'enregistrement.";
                    toast({ variant: 'destructive', title: 'Erreur', description: errorMsg });
                }
            } catch (err: any) {
                toast({ variant: 'destructive', title: 'Erreur Critique', description: "Impossible de contacter le serveur." });
            }
        });
    };

    const handleInvalid = () => {
        toast({ 
            variant: 'destructive', 
            title: 'Formulaire incomplet', 
            description: 'Veuillez remplir tous les champs obligatoires avant de publier.' 
        });
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl bg-slate-900 border-slate-800 rounded-[2.5rem] overflow-hidden z-[10000]">
                <DialogHeader className="p-8 pb-0">
                    <DialogTitle className="text-2xl font-black text-white uppercase tracking-tight">
                        {lecture ? "Modifier" : "Ajouter"} une leçon
                    </DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit, handleInvalid)} className="space-y-6 p-8">
                        <FormField control={form.control} name="title" render={({ field }) => ( 
                            <FormItem>
                                <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Titre de la leçon</FormLabel>
                                <FormControl><Input placeholder="Ex: Introduction aux fondamentaux" {...field} className="h-12 bg-slate-950 border-slate-800 rounded-xl text-white" /></FormControl>
                                <FormMessage />
                            </FormItem> 
                        )}/>
                        
                        <FormField control={form.control} name="type" render={({ field }) => ( 
                            <FormItem>
                                <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Format de contenu</FormLabel>
                                <Select 
                                    onValueChange={(val) => { field.onChange(val); form.setValue('contentUrl', ''); }} 
                                    defaultValue={field.value} 
                                    value={field.value}
                                >
                                    <FormControl>
                                        <SelectTrigger className="h-12 bg-slate-950 border-slate-800 rounded-xl text-white">
                                            <SelectValue placeholder="Choisir un format" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent className="bg-slate-900 border-slate-800 text-white z-[10001]">
                                        {adminSettings.allowBunny && (
                                            <SelectItem value="video" className="py-3">
                                                <div className="flex items-center gap-2">
                                                    <PlaySquare className="h-4 w-4 text-primary" />
                                                    <span>Vidéo Premium (Bunny)</span>
                                                </div>
                                            </SelectItem>
                                        )}
                                        {adminSettings.allowYoutube && (
                                            <SelectItem value="youtube" className="py-3">
                                                <div className="flex items-center gap-2">
                                                    <Youtube className="h-4 w-4 text-red-500" />
                                                    <span>Vidéo YouTube</span>
                                                </div>
                                            </SelectItem>
                                        )}
                                        <SelectItem value="text" className="py-3">
                                            <div className="flex items-center gap-2">
                                                <MessageSquareText className="h-4 w-4 text-emerald-500" />
                                                <span>Texte / Article</span>
                                            </div>
                                        </SelectItem>
                                        <SelectItem value="pdf" className="py-3">
                                            <div className="flex items-center gap-2">
                                                <FileText className="h-4 w-4 text-amber-500" />
                                                <span>Document PDF</span>
                                            </div>
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem> 
                        )}/>
                        
                        {selectedType === 'text' && (
                            <FormField control={form.control} name="textContent" render={({ field }) => ( 
                                <FormItem>
                                    <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Contenu de l'article</FormLabel>
                                    <FormControl><Textarea rows={10} placeholder="Rédigez votre texte ici..." {...field} className="bg-slate-950 border-slate-800 rounded-xl resize-none p-4 text-white" /></FormControl>
                                    <FormMessage />
                                </FormItem> 
                            )}/>
                        )}

                        {selectedType === 'video' && adminSettings.allowBunny && (
                            <FormField control={form.control} name="contentUrl" render={({ field }) => ( 
                                <FormItem>
                                    <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">ID Vidéo Bunny Stream (GUID)</FormLabel>
                                    <FormControl>
                                        <div className="flex items-center gap-3 bg-slate-950 border border-slate-800 rounded-xl p-1 pr-4">
                                            <div className="p-3 bg-slate-800 rounded-xl text-primary"><Info className="h-5 w-5"/></div>
                                            <Input placeholder="Ex: 8a7b6c..." {...field} className="border-none bg-transparent focus-visible:ring-0 h-12 text-white" />
                                        </div>
                                    </FormControl>
                                    <FormDescription className="text-[10px] text-slate-500 mt-2">Copiez l'ID technique depuis votre console Bunny.net.</FormDescription>
                                    <FormMessage />
                                </FormItem> 
                            )}/>
                        )}

                        {selectedType === 'youtube' && adminSettings.allowYoutube && (
                            <FormField control={form.control} name="contentUrl" render={({ field }) => ( 
                                <FormItem>
                                    <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Lien de la vidéo YouTube</FormLabel>
                                    <FormControl>
                                        <div className="flex items-center gap-3 bg-slate-950 border border-slate-800 rounded-xl p-1 pr-4">
                                            <div className="p-3 bg-slate-800 rounded-xl text-red-500"><Youtube className="h-5 w-5"/></div>
                                            <Input placeholder="https://www.youtube.com/watch?v=..." {...field} className="border-none bg-transparent focus-visible:ring-0 h-12 text-white" />
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem> 
                            )}/>
                        )}

                        {selectedType === 'pdf' && (
                            <div className="space-y-4">
                                <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Document PDF</FormLabel>
                                <div className="relative">
                                    <Input 
                                        type="file" 
                                        accept=".pdf" 
                                        onChange={handlePdfUpload} 
                                        className="sr-only" 
                                        id="lecture-pdf-upload"
                                        disabled={uploadProgress !== null}
                                    />
                                    <label 
                                        htmlFor="lecture-pdf-upload"
                                        className={cn(
                                            "flex flex-col items-center justify-center py-10 border-2 border-dashed border-slate-800 rounded-[2rem] bg-slate-950/50 cursor-pointer hover:border-primary/50 transition-all active:scale-[0.98]",
                                            uploadProgress !== null && "pointer-events-none opacity-50"
                                        )}
                                    >
                                        {uploadProgress !== null ? (
                                            <div className="w-full max-w-[200px] text-center space-y-3">
                                                <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                                                <Progress value={uploadProgress} className="h-1.5" />
                                                <p className="text-[10px] font-black text-white uppercase">{Math.round(uploadProgress)}%</p>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center gap-2">
                                                <UploadCloud className="h-10 w-10 text-slate-700" />
                                                <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Téléverser le PDF</span>
                                            </div>
                                        )}
                                    </label>
                                </div>
                                <FormField control={form.control} name="contentUrl" render={({ field }) => ( 
                                    <FormItem>
                                        <FormControl>
                                            <Input readOnly placeholder="Lien du fichier..." {...field} className="h-10 bg-slate-950 border-slate-800 rounded-xl text-[10px] text-slate-500" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem> 
                                )}/>
                            </div>
                        )}

                        <FormField control={form.control} name="duration" render={({ field }) => ( 
                            <FormItem>
                                <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Durée estimée (minutes)</FormLabel>
                                <FormControl><Input type="number" {...field} className="h-12 bg-slate-950 border-slate-800 rounded-xl text-white font-bold" /></FormControl>
                                <FormMessage />
                            </FormItem> 
                        )}/>

                        <DialogFooter className="pt-6 border-t border-white/5">
                            <DialogClose asChild><Button type="button" variant="ghost" className="font-bold text-slate-500 uppercase text-[10px] tracking-widest">Annuler</Button></DialogClose>
                            <Button 
                                type="submit" 
                                disabled={isPending || uploadProgress !== null} 
                                className="h-14 px-10 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black uppercase text-xs tracking-widest shadow-xl transition-all active:scale-95"
                            >
                                {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2"/> : <CheckCircle2 className="h-4 w-4 mr-2"/>} 
                                {lecture ? "Mettre à jour" : "Publier la leçon"}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
