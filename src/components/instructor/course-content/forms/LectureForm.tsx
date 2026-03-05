'use client';

/**
 * @fileOverview Formulaire de création de leçon Ndara Afrique.
 * Amélioré : Synchronisation automatique du titre et de la durée depuis Bunny.net.
 */

import { useEffect, useTransition, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
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
import { Progress } from '@/components/ui/progress';
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
    const [uploadProgress, setUploadProgress] = useState<number | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
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
        setUploadProgress(null);
        setIsUploading(false);
        setErrorMessage(null);
    }, [lecture, form, isOpen]);

    /**
     * Synchronise la durée depuis Bunny.net
     */
    const syncDuration = async (videoId: string) => {
        if (!videoId) return;
        setIsSyncingDuration(true);
        try {
            const result = await getBunnyVideoMetadata(videoId);
            if (result.success && result.length > 0) {
                // Bunny renvoie des secondes, on convertit en minutes (plafond)
                const durationMinutes = Math.ceil(result.length / 60);
                form.setValue('duration', durationMinutes);
                toast({ title: "Durée synchronisée", description: `${durationMinutes} min détectées.` });
            } else if (result.status === 2 || result.status === 3) {
                toast({ title: "Encodage en cours", description: "Réessayez dans quelques secondes pour la durée." });
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
            toast({ variant: 'destructive', title: "Titre requis", description: "Veuillez saisir un titre de leçon avant de téléverser la vidéo." });
            return;
        }

        if (!file || !currentUser) return;

        setIsUploading(true);
        setUploadProgress(0);
        setErrorMessage(null);

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

            if (!response.ok) {
                throw new Error(data.error || "Erreur lors de l'upload sécurisé.");
            }

            form.setValue('contentUrl', data.videoId, { shouldValidate: true });
            toast({ title: "Vidéo transmise !", description: "Optimisation en cours chez Bunny.net." });
            
            // Tentative de récupération de la durée après un court délai pour laisser l'encodage démarrer
            setTimeout(() => syncDuration(data.videoId), 8000);

        } catch (error: any) {
            setErrorMessage(error.message);
            toast({ variant: 'destructive', title: "Échec du téléversement", description: error.message });
        } finally {
            setIsUploading(false);
            setUploadProgress(null);
        }
    };

    const handlePdfUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !currentUser) return;
        
        setUploadProgress(0);
        setErrorMessage(null);
        const storage = getStorage();
        const storageRef = ref(storage, `course_resources/${currentUser.uid}/${Date.now()}_${file.name}`);
        const uploadTask = uploadBytesResumable(storageRef, file);

        uploadTask.on('state_changed',
            (snapshot) => setUploadProgress((snapshot.bytesTransferred / snapshot.totalBytes) * 100),
            (error) => {
                setErrorMessage(error.message);
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
                                    onValueChange={(val) => { field.onChange(val); form.setValue('contentUrl', ''); setErrorMessage(null); }} 
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
                                                <span>Document PDF</span>
                                            </div>
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem> 
                        )}/>
                        
                        {selectedType === 'video' && (
                            <div className="space-y-4">
                                <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Fichier Vidéo (Bunny Stream)</FormLabel>
                                <div className="relative">
                                    <Input 
                                        type="file" 
                                        accept="video/*" 
                                        onChange={handleVideoUpload} 
                                        className="sr-only" 
                                        id="video-upload-input"
                                        disabled={isUploading}
                                    />
                                    <label 
                                        htmlFor="video-upload-input"
                                        className={cn(
                                            "flex flex-col items-center justify-center py-10 border-2 border-dashed border-slate-800 rounded-[2.5rem] bg-slate-950/50 cursor-pointer hover:border-primary/50 transition-all active:scale-[0.98]",
                                            isUploading && "pointer-events-none opacity-50",
                                            errorMessage && "border-red-500/50"
                                        )}
                                    >
                                        {isUploading ? (
                                            <div className="text-center space-y-3">
                                                <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                                                <p className="text-[10px] font-black text-white uppercase tracking-widest">Analyse et transfert...</p>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center gap-2 text-center px-6">
                                                <FileVideo className="h-10 w-10 text-slate-700" />
                                                <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Choisir le fichier vidéo</span>
                                            </div>
                                        )}
                                    </label>
                                </div>

                                <FormField control={form.control} name="contentUrl" render={({ field }) => ( 
                                    <FormItem>
                                        <FormControl>
                                            <div className="flex items-center gap-2">
                                                <Input {...field} readOnly placeholder="ID Vidéo Bunny" className="h-10 bg-slate-950 border-slate-800 rounded-xl text-xs text-slate-500 font-mono flex-1" />
                                                {field.value && (
                                                    <Button 
                                                        type="button" 
                                                        variant="outline" 
                                                        size="sm" 
                                                        onClick={() => syncDuration(field.value)} 
                                                        disabled={isSyncingDuration} 
                                                        className="h-10 rounded-xl border-slate-800 hover:bg-primary/10 hover:text-primary transition-colors"
                                                        title="Actualiser la durée depuis Bunny"
                                                    >
                                                        {isSyncingDuration ? <Loader2 className="h-3.5 w-3.5 animate-spin"/> : <RefreshCw className="h-3.5 w-3.5"/>}
                                                    </Button>
                                                )}
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem> 
                                )}/>
                            </div>
                        )}

                        {selectedType === 'youtube' && (
                            <FormField control={form.control} name="contentUrl" render={({ field }) => ( 
                                <FormItem>
                                    <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Lien Vidéo</FormLabel>
                                    <FormControl>
                                        <Input placeholder="https://www.youtube.com/watch?v=..." {...field} className="h-12 bg-slate-950 border-slate-800 rounded-xl text-white" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem> 
                            )}/>
                        )}

                        {selectedType === 'text' && (
                            <FormField control={form.control} name="textContent" render={({ field }) => ( 
                                <FormItem>
                                    <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Contenu de la leçon</FormLabel>
                                    <FormControl><Textarea rows={10} placeholder="Rédigez votre leçon ici..." {...field} className="bg-slate-950 border-slate-800 rounded-xl resize-none p-4 text-white leading-relaxed" /></FormControl>
                                    <FormMessage />
                                </FormItem> 
                            )}/>
                        )}

                        {selectedType === 'pdf' && (
                            <div className="space-y-4">
                                <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Fichier PDF</FormLabel>
                                <Input type="file" accept=".pdf" onChange={handlePdfUpload} className="h-12 bg-slate-950 border-slate-800 text-white rounded-xl" />
                                <FormField control={form.control} name="contentUrl" render={({ field }) => ( 
                                    <FormItem>
                                        <FormControl><Input readOnly placeholder="URL du document..." {...field} className="h-10 bg-slate-950 border-slate-800 rounded-xl text-[10px] text-slate-500 truncate" /></FormControl>
                                        <FormMessage />
                                    </FormItem> 
                                )}/>
                            </div>
                        )}

                        <FormField control={form.control} name="duration" render={({ field }) => ( 
                            <FormItem>
                                <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1 flex items-center gap-2">
                                    <Clock className="h-3 w-3" />
                                    Durée de la leçon (minutes)
                                </FormLabel>
                                <FormControl>
                                    <div className="relative">
                                        <Input 
                                            type="number" 
                                            {...field} 
                                            className="h-12 bg-slate-950 border-slate-800 rounded-xl text-white font-black text-lg" 
                                            readOnly={selectedType === 'video'}
                                        />
                                        {selectedType === 'video' && (
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 px-2 py-1 bg-primary/10 rounded-lg border border-primary/20">
                                                <span className="text-[8px] font-black text-primary uppercase tracking-tighter">Auto-sync Bunny</span>
                                            </div>
                                        )}
                                    </div>
                                </FormControl>
                                <FormMessage />
                            </FormItem> 
                        )}/>

                        <DialogFooter className="pt-6 border-t border-white/5 bg-slate-900">
                            <DialogClose asChild><Button type="button" variant="ghost" className="font-bold text-slate-500 uppercase text-[10px] tracking-widest">Annuler</Button></DialogClose>
                            <Button 
                                type="submit" 
                                disabled={isPending || isUploading || isSyncingDuration} 
                                className="h-14 px-10 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black uppercase text-xs tracking-widest shadow-xl shadow-primary/20 transition-all active:scale-95"
                            >
                                {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2"/> : <CheckCircle2 className="h-4 w-4 mr-2"/>} 
                                {lecture ? "Enregistrer les modifications" : "Valider la leçon"}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
