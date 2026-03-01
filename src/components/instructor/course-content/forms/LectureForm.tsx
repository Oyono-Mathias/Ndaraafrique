'use client';

import { useState, useEffect, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { useRole } from '@/context/RoleContext';
import { useToast } from '@/hooks/use-toast';
import { createLecture, updateLecture } from '@/actions/lectureActions';
import { createBunnyVideo } from '@/actions/bunnyActions';
import type { Lecture } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import { Loader2, CheckCircle2, UploadCloud, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';

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
    const [uploadProgress, setUploadProgress] = useState<number | null>(null);
    const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
    const [isUploadingToBunny, setIsUploadingToBunny] = useState(false);

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

    const handleBunnyUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !currentUser) return;

        const videoTitle = form.getValues('title') || "Nouvelle Leçon Ndara";
        
        setIsUploadingToBunny(true);
        setUploadProgress(0);
        setUploadedFileName(file.name);
        
        toast({ title: "Connexion à Bunny Stream...", description: "Préparation du transfert sécurisé." });

        try {
            const prep = await createBunnyVideo(videoTitle, currentUser.uid);
            
            if (!prep.success || !prep.guid || !prep.uploadKey) {
                throw new Error(prep.error || "Impossible de joindre Bunny.net");
            }

            const { guid, libraryId, uploadKey } = prep;
            const uploadUrl = `https://video.bunnycdn.com/library/${libraryId}/videos/${guid}`;

            const xhr = new XMLHttpRequest();
            
            xhr.upload.addEventListener("progress", (evt) => {
                if (evt.lengthComputable) {
                    setUploadProgress((evt.loaded / evt.total) * 100);
                }
            }, false);

            xhr.onreadystatechange = () => {
                if (xhr.readyState === 4) {
                    if (xhr.status === 200 || xhr.status === 201) {
                        form.setValue('contentUrl', guid);
                        setUploadProgress(null);
                        setIsUploadingToBunny(false);
                        toast({ title: "Vidéo transmise !", description: "Le fichier est en cours d'encodage." });
                    } else {
                        toast({ variant: 'destructive', title: "Échec Bunny", description: `Erreur serveur : ${xhr.status}` });
                        setIsUploadingToBunny(false);
                        setUploadProgress(null);
                    }
                }
            };

            xhr.onerror = () => {
                toast({ variant: 'destructive', title: "Erreur réseau", description: "Vérifiez votre connexion et l'autorisation CORS sur Bunny.net." });
                setIsUploadingToBunny(false);
                setUploadProgress(null);
            };

            xhr.open("PUT", uploadUrl, true);
            xhr.setRequestHeader("AccessKey", uploadKey);
            xhr.setRequestHeader("Accept", "application/json");
            xhr.setRequestHeader("Content-Type", "application/octet-stream");
            xhr.send(file);

        } catch (error: any) {
            toast({ variant: 'destructive', title: "Erreur d'importation", description: error.message });
            setIsUploadingToBunny(false);
            setUploadProgress(null);
            setUploadedFileName(null);
        }
    };

    const handlePdfUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !currentUser) return;
        
        setUploadedFileName(file.name);
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
                    form.setValue('contentUrl', downloadURL);
                    setUploadProgress(null);
                    toast({ title: 'PDF prêt !' });
                });
            }
        );
    };

    const onSubmit = (values: z.infer<typeof formSchema>) => {
        startTransition(async () => {
            const result = await (lecture
                ? updateLecture({ courseId, sectionId, lectureId: lecture.id, formData: values })
                : createLecture({ courseId, sectionId, formData: values }));
            
            if(result.success){
                toast({ title: 'Leçon enregistrée !' });
                onOpenChange(false);
            } else {
                const errorMsg = typeof result.error === 'string' ? result.error : "Erreur de validation.";
                toast({ variant: 'destructive', title: 'Erreur', description: errorMsg });
            }
        });
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl bg-slate-900 border-slate-800 rounded-[2.5rem] overflow-hidden">
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
                                <FormControl><Input placeholder="Ex: Introduction aux fondamentaux" {...field} className="h-12 bg-slate-950 border-slate-800 rounded-xl" /></FormControl>
                                <FormMessage />
                            </FormItem> 
                        )}/>
                        
                        <FormField control={form.control} name="type" render={({ field }) => ( 
                            <FormItem>
                                <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Format</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                        <SelectTrigger className="h-12 bg-slate-950 border-slate-800 rounded-xl">
                                            <SelectValue />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent className="bg-slate-900 border-slate-800 text-white">
                                        <SelectItem value="video" className="py-3">🎥 Vidéo Premium (Bunny)</SelectItem>
                                        <SelectItem value="text" className="py-3">✍️ Texte / Article</SelectItem>
                                        <SelectItem value="pdf" className="py-3">📄 Document PDF</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem> 
                        )}/>
                        
                        {selectedType === 'text' ? (
                            <FormField control={form.control} name="textContent" render={({ field }) => ( 
                                <FormItem>
                                    <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Contenu</FormLabel>
                                    <FormControl><Textarea rows={10} placeholder="Rédigez ici..." {...field} className="bg-slate-950 border-slate-800 rounded-xl resize-none p-4" /></FormControl>
                                    <FormMessage />
                                </FormItem> 
                            )}/>
                        ) : (
                            <div className="space-y-4">
                                <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">
                                    Fichier {selectedType === 'video' ? 'Vidéo' : 'PDF'}
                                </Label>
                                <div className="relative">
                                    <Input 
                                        type="file" 
                                        accept={selectedType === 'video' ? "video/*" : ".pdf"} 
                                        onChange={selectedType === 'video' ? handleBunnyUpload : handlePdfUpload} 
                                        className="sr-only" 
                                        id="lecture-file-upload"
                                        disabled={isUploadingToBunny || uploadProgress !== null}
                                    />
                                    <label 
                                        htmlFor="lecture-file-upload"
                                        className={cn(
                                            "flex flex-col items-center justify-center py-12 border-2 border-dashed border-slate-800 rounded-[2rem] bg-slate-950/50 cursor-pointer hover:border-primary/50 transition-all",
                                            (isUploadingToBunny || uploadProgress !== null) && "pointer-events-none opacity-50"
                                        )}
                                    >
                                        {isUploadingToBunny || uploadProgress !== null ? (
                                            <div className="w-full max-w-[250px] text-center space-y-4 px-4">
                                                <div className="flex items-center justify-center gap-2 text-primary font-bold">
                                                    <Loader2 className="h-5 w-5 animate-spin" />
                                                    <span className="text-[10px] uppercase tracking-widest">Envoi en cours...</span>
                                                </div>
                                                <Progress value={uploadProgress || 0} className="h-1.5" />
                                                <p className="text-[10px] font-black text-white uppercase tracking-[0.3em]">{Math.round(uploadProgress || 0)}%</p>
                                            </div>
                                        ) : uploadedFileName ? (
                                            <div className="flex flex-col items-center gap-2">
                                                <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                                                <p className="text-xs font-bold text-white truncate max-w-[200px]">{uploadedFileName}</p>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center gap-3">
                                                <UploadCloud className="h-8 w-8 text-slate-700" />
                                                <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Sélectionner le fichier</span>
                                            </div>
                                        )}
                                    </label>
                                </div>
                                
                                <FormField control={form.control} name="contentUrl" render={({ field }) => ( 
                                    <FormItem>
                                        <FormControl>
                                            <Input readOnly placeholder="ID Vidéo Bunny..." {...field} className="h-10 bg-slate-950/50 border-slate-800 rounded-xl text-[10px] font-mono opacity-50" />
                                        </FormControl>
                                        <FormDescription className="text-[10px] italic">Identifiant technique pour votre bibliothèque Bunny Stream (ID: 382715).</FormDescription>
                                        <FormMessage />
                                    </FormItem> 
                                )}/>
                            </div>
                        )}

                        <FormField control={form.control} name="duration" render={({ field }) => ( 
                            <FormItem>
                                <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Durée (min)</FormLabel>
                                <FormControl><Input type="number" {...field} className="h-12 bg-slate-950 border-slate-800 rounded-xl" /></FormControl>
                                <FormMessage />
                            </FormItem> 
                        )}/>

                        <DialogFooter className="pt-6 border-t border-white/5">
                            <DialogClose asChild><Button type="button" variant="ghost" className="font-bold text-slate-500">Annuler</Button></DialogClose>
                            <Button type="submit" disabled={isPending || isUploadingToBunny || uploadProgress !== null} className="h-14 px-10 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black uppercase text-xs tracking-widest shadow-xl transition-all active:scale-95">
                                {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2"/> : <CheckCircle2 className="h-4 w-4 mr-2"/>} 
                                {lecture ? "Mettre à jour" : "Créer la leçon"}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
