'use client';

/**
 * @fileOverview Formulaire de création de leçon Ndara Afrique.
 * Optimisé : Téléversement des PDF vers Bunny Storage via API Proxy.
 */

import { useEffect, useTransition, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRole } from '@/context/RoleContext';
import { useToast } from '@/hooks/use-toast';
import { createLecture, updateLecture } from '@/actions/lectureActions';
import { getBunnyVideoMetadata } from '@/actions/bunnyActions';
import type { Lecture, Settings } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, CheckCircle2, Youtube, PlaySquare, FileText, MessageSquareText, FileVideo, RefreshCw, Clock } from 'lucide-react';
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
    const [isUploading, setIsUploading] = useState(false);
    const [isSyncingDuration, setIsSyncingDuration] = useState(false);
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
        setIsUploading(false);
    }, [lecture, form, isOpen]);

    const syncDuration = async (videoId: string) => {
        if (!videoId) return;
        setIsSyncingDuration(true);
        try {
            const result = await getBunnyVideoMetadata(videoId);
            if (result.success && result.length > 0) {
                const durationMinutes = Math.ceil(result.length / 60);
                form.setValue('duration', durationMinutes);
                toast({ title: "Durée synchronisée", description: `${durationMinutes} min détectées.` });
            }
        } catch (e) {
            console.error("Sync Duration Error:", e);
        } finally {
            setIsSyncingDuration(false);
        }
    };

    const handleVideoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        const lectureTitle = form.getValues('title');

        if (!lectureTitle || lectureTitle.length < 3) {
            toast({ variant: 'destructive', title: "Titre requis", description: "Veuillez saisir un titre avant l'upload." });
            return;
        }

        if (!file || !currentUser) return;

        setIsUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('instructorId', currentUser.uid);
            formData.append('title', lectureTitle);

            const response = await fetch('/api/video/upload', {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error);

            form.setValue('contentUrl', data.videoId, { shouldValidate: true });
            toast({ title: "Vidéo transmise !", description: "Optimisation en cours chez Bunny.net." });
            setTimeout(() => syncDuration(data.videoId), 8000);
        } catch (error: any) {
            toast({ variant: 'destructive', title: "Échec", description: error.message });
        } finally {
            setIsUploading(false);
        }
    };

    const handlePdfUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !currentUser) return;
        
        setIsUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('userId', currentUser.uid);
            formData.append('folder', 'lectures_pdf');

            const response = await fetch('/api/storage/upload', {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error);

            form.setValue('contentUrl', data.url, { shouldValidate: true });
            toast({ title: 'PDF hébergé sur Bunny !' });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Erreur PDF', description: error.message });
        } finally {
            setIsUploading(false);
        }
    };

    const onSubmit = (values: z.infer<typeof formSchema>) => {
        startTransition(async () => {
            const result = await (lecture
                ? updateLecture({ courseId, sectionId, lectureId: lecture.id, formData: values })
                : createLecture({ courseId, sectionId, formData: values }));
            
            if (result.success) {
                toast({ title: 'Leçon enregistrée !' });
                onOpenChange(false);
            } else {
                toast({ variant: 'destructive', title: 'Échec', description: result.error as string });
            }
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
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 p-8">
                        <FormField control={form.control} name="title" render={({ field }) => ( 
                            <FormItem>
                                <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Titre de la leçon</FormLabel>
                                <FormControl><Input placeholder="Ex: Introduction aux fondamentaux" {...field} className="h-12 bg-slate-950 border-slate-800 rounded-xl text-white font-bold" /></FormControl>
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
                                    <SelectContent className="bg-slate-900 border-slate-800 text-white z-[10006]">
                                        {adminSettings.allowBunny && (
                                            <SelectItem value="video" className="py-3">
                                                <div className="flex items-center gap-2">
                                                    <PlaySquare className="h-4 w-4 text-primary" />
                                                    <span>Vidéo Premium (Bunny Stream)</span>
                                                </div>
                                            </SelectItem>
                                        )}
                                        {adminSettings.allowYoutube && (
                                            <SelectItem value="youtube" className="py-3">
                                                <div className="flex items-center gap-2">
                                                    <Youtube className="h-4 w-4 text-red-500" />
                                                    <span>Lien YouTube</span>
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
                                                <span>Document PDF (Bunny CDN)</span>
                                            </div>
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem> 
                        )}/>
                        
                        {selectedType === 'video' && (
                            <div className="space-y-4">
                                <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Fichier Vidéo</label>
                                <div className="relative">
                                    <Input type="file" accept="video/*" onChange={handleVideoUpload} className="sr-only" id="video-upload-input" disabled={isUploading} />
                                    <label htmlFor="video-upload-input" className={cn("flex flex-col items-center justify-center py-10 border-2 border-dashed border-slate-800 rounded-[2.5rem] bg-slate-950/50 cursor-pointer hover:border-primary/50 transition-all", isUploading && "opacity-50")}>
                                        {isUploading ? <Loader2 className="h-8 w-8 animate-spin text-primary" /> : <FileVideo className="h-10 w-10 text-slate-700" />}
                                        <span className="text-[10px] font-black uppercase mt-2">Choisir la vidéo</span>
                                    </label>
                                </div>
                                <FormField control={form.control} name="contentUrl" render={({ field }) => ( 
                                    <FormItem><FormControl><Input {...field} readOnly className="h-10 bg-slate-950 border-slate-800 rounded-xl text-xs text-slate-500 font-mono" /></FormControl></FormItem> 
                                )}/>
                            </div>
                        )}

                        {selectedType === 'pdf' && (
                            <div className="space-y-4">
                                <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Fichier PDF (Bunny CDN)</FormLabel>
                                <div className="relative">
                                    <Input type="file" accept=".pdf" onChange={handlePdfUpload} className="sr-only" id="pdf-upload-input" disabled={isUploading} />
                                    <label htmlFor="pdf-upload-input" className={cn("flex flex-col items-center justify-center py-10 border-2 border-dashed border-slate-800 rounded-xl bg-slate-950/50 cursor-pointer", isUploading && "opacity-50")}>
                                        {isUploading ? <Loader2 className="h-8 w-8 animate-spin text-primary" /> : <FileText className="h-8 w-8 text-amber-500" />}
                                        <span className="text-[10px] font-black uppercase mt-2">Téléverser le PDF</span>
                                    </label>
                                </div>
                                <FormField control={form.control} name="contentUrl" render={({ field }) => ( 
                                    <FormItem><FormControl><Input readOnly {...field} className="h-10 bg-slate-950 border-slate-800 rounded-xl text-[10px] text-slate-500" /></FormControl></FormItem> 
                                )}/>
                            </div>
                        )}

                        {selectedType === 'youtube' && (
                            <FormField control={form.control} name="contentUrl" render={({ field }) => ( 
                                <FormItem><FormLabel className="text-[10px] font-black uppercase text-slate-500">Lien Vidéo</FormLabel><FormControl><Input {...field} className="h-12 bg-slate-950 border-slate-800 rounded-xl text-white" /></FormControl><FormMessage /></FormItem> 
                            )}/>
                        )}

                        {selectedType === 'text' && (
                            <FormField control={form.control} name="textContent" render={({ field }) => ( 
                                <FormItem><FormLabel className="text-[10px] font-black uppercase text-slate-500">Contenu</FormLabel><FormControl><Textarea rows={10} {...field} className="bg-slate-950 border-slate-800 rounded-xl resize-none text-white" /></FormControl><FormMessage /></FormItem> 
                            )}/>
                        )}

                        <FormField control={form.control} name="duration" render={({ field }) => ( 
                            <FormItem>
                                <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-2"><Clock className="h-3 w-3" />Durée (minutes)</FormLabel>
                                <FormControl><Input type="number" {...field} className="h-12 bg-slate-950 border-slate-800 rounded-xl text-white font-black text-lg" /></FormControl>
                                <FormMessage />
                            </FormItem> 
                        )}/>

                        <DialogFooter className="pt-6 border-t border-white/5">
                            <DialogClose asChild><Button type="button" variant="ghost" className="font-bold text-slate-500 uppercase text-[10px]">Annuler</Button></DialogClose>
                            <Button type="submit" disabled={isPending || isUploading} className="h-14 px-10 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black uppercase text-xs tracking-widest shadow-xl transition-all">
                                {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2"/> : <CheckCircle2 className="h-4 w-4 mr-2"/>} 
                                Enregistrer
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
