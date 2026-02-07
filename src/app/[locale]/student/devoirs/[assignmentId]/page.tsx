
'use client';

/**
 * @fileOverview Page de détail et de soumission d'un devoir pour l'étudiant.
 * Permet de consulter les consignes, télécharger les ressources et envoyer son travail.
 */

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useRole } from '@/context/RoleContext';
import { getFirestore, doc, collection, query, where, getDocs, setDoc, serverTimestamp, collectionGroup } from 'firebase/firestore';
import { useDoc } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  ArrowLeft, 
  Paperclip, 
  Send, 
  Loader2, 
  FileText, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Download,
  BookOpen
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { cn } from '@/lib/utils';
import type { Assignment, AssignmentSubmission } from '@/lib/types';

export default function StudentAssignmentDetailPage() {
  const { assignmentId } = useParams();
  const router = useRouter();
  const { user, currentUser } = useRole();
  const db = getFirestore();
  const { toast } = useToast();

  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [submission, setSubmission] = useState<AssignmentSubmission | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form state
  const [textWork, setTextWork] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [fileName, setFileName] = useState("");
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  // 1. Récupérer le devoir via collectionGroup car on ne connaît pas forcément le courseId/sectionId
  useEffect(() => {
    if (!assignmentId) return;

    const fetchAssignmentData = async () => {
      setIsLoading(true);
      try {
        const q = query(collectionGroup(db, 'assignments'), where('__name__', '==', assignmentId));
        const snap = await getDocs(q);

        if (snap.empty) {
          toast({ variant: 'destructive', title: "Devoir introuvable" });
          router.push('/student/devoirs');
          return;
        }

        const assignDoc = snap.docs[0];
        const assignData = { id: assignDoc.id, ...assignDoc.data() } as Assignment;
        setAssignment(assignData);

        // 2. Vérifier si une soumission existe déjà
        if (user) {
            const subRef = doc(db, 'devoirs', `${user.uid}_${assignmentId}`);
            const subSnap = await getDocs(query(collection(db, 'devoirs'), where('studentId', '==', user.uid), where('assignmentId', '==', assignmentId)));
            if (!subSnap.empty) {
                setSubmission(subSnap.docs[0].data() as AssignmentSubmission);
            }
        }

      } catch (error) {
        console.error("Error fetching assignment:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAssignmentData();
  }, [assignmentId, db, user, router, toast]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploadProgress(0);
    const storage = getStorage();
    const storageRef = ref(storage, `submissions/${user.uid}/${Date.now()}_${file.name}`);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on('state_changed',
      (snap) => setUploadProgress((snap.bytesTransferred / snap.totalBytes) * 100),
      (err) => {
        toast({ variant: 'destructive', title: "Erreur d'upload" });
        setUploadProgress(null);
      },
      () => {
        getDownloadURL(uploadTask.snapshot.ref).then(url => {
          setFileUrl(url);
          setFileName(file.name);
          setUploadProgress(null);
          toast({ title: "Fichier prêt !" });
        });
      }
    );
  };

  const handleSubmit = async () => {
    if (!user || !assignment || isSubmitting) return;
    if (!textWork.trim() && !fileUrl) {
        toast({ variant: 'destructive', title: "Contenu vide", description: "Veuillez rédiger un texte ou joindre un fichier." });
        return;
    }

    setIsSubmitting(true);
    try {
      const subId = `${user.uid}_${assignmentId}`;
      const subRef = doc(db, 'devoirs', subId);
      
      const payload = {
        id: subId,
        studentId: user.uid,
        studentName: currentUser?.fullName || 'Étudiant Ndara',
        studentAvatarUrl: currentUser?.profilePictureURL || '',
        instructorId: assignment.instructorId || '',
        courseId: assignment.courseId,
        courseTitle: assignment.courseTitle || 'Formation Ndara',
        assignmentId: assignment.id,
        assignmentTitle: assignment.title,
        submissionContent: textWork,
        submissionUrl: fileUrl,
        status: 'submitted',
        submittedAt: serverTimestamp(),
      };

      await setDoc(subRef, payload);
      
      toast({ title: "Devoir envoyé !", description: "Votre formateur va maintenant pouvoir le noter." });
      router.push('/student/devoirs');
    } catch (error) {
      toast({ variant: 'destructive', title: "Erreur lors de l'envoi" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 space-y-6">
        <Skeleton className="h-10 w-3/4 bg-slate-900" />
        <Skeleton className="h-64 w-full bg-slate-900" />
      </div>
    );
  }

  if (!assignment) return null;

  const isGraded = submission?.status === 'graded';
  const dueDate = (assignment.dueDate as any)?.toDate?.();

  return (
    <div className="flex flex-col gap-8 pb-24 bg-slate-950 min-h-screen bg-grainy">
      <header className="px-4 pt-6 space-y-4">
        <Button variant="ghost" className="p-0 h-auto text-slate-500 hover:text-white" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Retour aux devoirs
        </Button>
        <div className="space-y-2">
            <h1 className="text-2xl font-black text-white leading-tight">{assignment.title}</h1>
            <div className="flex items-center gap-2 text-[10px] font-black text-primary uppercase tracking-widest">
                <BookOpen className="h-3 w-3" />
                {assignment.courseTitle}
            </div>
        </div>
      </header>

      <div className="px-4 space-y-6">
        {/* --- CONSIGNES --- */}
        <Card className="bg-slate-900 border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
          <CardHeader className="border-b border-white/5 bg-slate-800/30">
            <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-400">Consignes</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">
                {assignment.description || "Aucune instruction spécifique fournie."}
            </p>

            {assignment.attachments && assignment.attachments.length > 0 && (
                <div className="space-y-3">
                    <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Ressources jointes</p>
                    <div className="grid gap-2">
                        {assignment.attachments.map((att, i) => (
                            <a 
                                key={i} 
                                href={att.url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="flex items-center justify-between p-3 bg-slate-800/50 border border-slate-700 rounded-xl hover:bg-slate-800 transition-colors group"
                            >
                                <div className="flex items-center gap-3">
                                    <FileText className="h-4 w-4 text-primary" />
                                    <span className="text-xs font-bold text-slate-200 truncate max-w-[200px]">{att.name}</span>
                                </div>
                                <Download className="h-4 w-4 text-slate-500 group-hover:text-white" />
                            </a>
                        ))}
                    </div>
                </div>
            )}

            <div className="flex items-center gap-4 pt-4 border-t border-white/5">
                <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-500 uppercase">
                    <Clock className="h-3.5 w-3.5" />
                    Échéance : {dueDate ? format(dueDate, 'dd MMMM yyyy', { locale: fr }) : 'Aucune'}
                </div>
            </div>
          </CardContent>
        </Card>

        {/* --- ÉTAT DE LA SOUMISSION --- */}
        {submission ? (
            <Card className={cn(
                "border-2 rounded-[2rem] overflow-hidden shadow-2xl animate-in fade-in duration-700",
                isGraded ? "border-green-500/20 bg-green-500/5" : "border-primary/20 bg-primary/5"
            )}>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle className="text-lg font-black text-white uppercase tracking-tight">Votre Travail</CardTitle>
                        <Badge className={cn(
                            "border-none font-black text-[9px] uppercase px-3",
                            isGraded ? "bg-green-500 text-white" : "bg-primary text-white"
                        )}>
                            {isGraded ? "Noté" : "En attente de correction"}
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    {isGraded ? (
                        <div className="space-y-6">
                            <div className="flex flex-col items-center py-6 bg-slate-900 rounded-3xl border border-green-500/20">
                                <p className="text-[10px] font-black uppercase text-slate-500 tracking-[0.3em] mb-2">Note obtenue</p>
                                <h2 className="text-6xl font-black text-green-400">{submission.grade}<span className="text-2xl opacity-40">/20</span></h2>
                            </div>
                            <div className="space-y-3">
                                <p className="text-[10px] font-black uppercase text-primary tracking-widest ml-1">Commentaire du formateur</p>
                                <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl italic text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
                                    "{submission.feedback || "Excellent travail, continuez ainsi !"}"
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center gap-4 p-4 bg-slate-900/50 rounded-2xl border border-slate-800">
                            <div className="p-3 bg-primary/10 rounded-xl">
                                <CheckCircle2 className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-white">Travail transmis</p>
                                <p className="text-[10px] text-slate-500 font-medium uppercase tracking-widest">
                                    Le {format((submission.submittedAt as any).toDate(), 'dd MMM à HH:mm', { locale: fr })}
                                </p>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        ) : (
            /* --- FORMULAIRE DE SOUMISSION --- */
            <Card className="bg-slate-900 border-slate-800 rounded-[2.5rem] overflow-hidden shadow-2xl">
                <CardHeader className="p-8 pb-4">
                    <CardTitle className="text-xl font-black text-white uppercase tracking-tight">Rendre mon devoir</CardTitle>
                    <CardDescription>Rédigez votre réponse ou joignez un fichier pour soumission.</CardDescription>
                </CardHeader>
                <CardContent className="p-8 space-y-6">
                    <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Ma réponse (texte)</label>
                        <Textarea 
                            placeholder="Écrivez votre travail ici..."
                            rows={8}
                            className="bg-slate-800/50 border-slate-700 rounded-2xl text-white resize-none p-4"
                            value={textWork}
                            onChange={(e) => setTextWork(e.target.value)}
                        />
                    </div>

                    <div className="space-y-4">
                        <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Pièce jointe (PDF, Image, Archive...)</label>
                        {fileUrl ? (
                            <div className="flex items-center justify-between p-4 bg-primary/10 border border-primary/20 rounded-2xl">
                                <div className="flex items-center gap-3">
                                    <Paperclip className="h-5 w-5 text-primary" />
                                    <span className="text-sm font-bold text-white truncate max-w-[200px]">{fileName}</span>
                                </div>
                                <Button variant="ghost" size="sm" onClick={() => { setFileUrl(""); setFileName(""); }} className="text-[10px] font-black uppercase">Supprimer</Button>
                            </div>
                        ) : (
                            <div className="relative">
                                <Input 
                                    type="file" 
                                    className="hidden" 
                                    id="submission-file" 
                                    onChange={handleFileUpload}
                                    disabled={uploadProgress !== null}
                                />
                                <label 
                                    htmlFor="submission-file"
                                    className={cn(
                                        "flex flex-col items-center justify-center py-8 border-2 border-dashed border-slate-800 rounded-2xl cursor-pointer hover:border-primary/50 transition-colors",
                                        uploadProgress !== null && "opacity-50 pointer-events-none"
                                    )}
                                >
                                    <Paperclip className="h-8 w-8 text-slate-700 mb-2" />
                                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Choisir un fichier</span>
                                </label>
                                {uploadProgress !== null && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-slate-950/80 rounded-2xl">
                                        <div className="text-center space-y-2">
                                            <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" />
                                            <p className="text-[10px] font-black text-white uppercase tracking-[0.2em]">{Math.round(uploadProgress)}%</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </CardContent>
                <CardFooter className="p-8 pt-0">
                    <Button 
                        onClick={handleSubmit}
                        disabled={isSubmitting || uploadProgress !== null || (!textWork.trim() && !fileUrl)}
                        className="w-full h-16 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-black uppercase text-xs tracking-[0.2em] shadow-2xl shadow-primary/20 active:scale-[0.98] transition-all"
                    >
                        {isSubmitting ? <Loader2 className="h-6 w-6 animate-spin" /> : <>Soumettre mon travail <Send className="ml-2 h-4 w-4" /></>}
                    </Button>
                </CardFooter>
            </Card>
        )}

        <div className="bg-slate-900/30 border border-slate-800 rounded-2xl p-5 flex items-start gap-4">
            <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-[10px] text-slate-500 leading-relaxed font-medium uppercase tracking-tighter">
                Une fois votre travail soumis, vous ne pourrez plus le modifier. Assurez-vous d'avoir bien répondu à toutes les consignes avant de cliquer sur envoyer.
            </p>
        </div>
      </div>
    </div>
  );
}
