'use client';

import { useState, useMemo } from 'react';
import { useRole } from '@/context/RoleContext';
import { useCollection, useMemoFirebase } from '@/firebase';
import {
  getFirestore,
  collection,
  query,
  where,
  doc,
  updateDoc,
  orderBy
} from 'firebase/firestore';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, Check, X, UserCheck, UserX, FileText, Bot, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { FormaAfriqueUser } from '@/context/RoleContext';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Application extends FormaAfriqueUser {
    instructorApplication?: {
        motivation?: string;
        verificationDocUrl?: string;
        submittedAt: any;
    }
}

type Decision = 'accepted' | 'rejected' | null;

const DecisionModal = ({ 
    application, 
    isOpen, 
    onClose,
    onConfirm
}: { 
    application: Application | null; 
    isOpen: boolean; 
    onClose: () => void;
    onConfirm: (userId: string, approve: boolean, message: string) => Promise<void>;
}) => {
    const [decision, setDecision] = useState<Decision>(null);
    const [rejectionReason, setRejectionReason] = useState('');
    const [message, setMessage] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    const rejectionTemplates = {
        quality: "Bonjour, merci pour votre intérêt. Après examen, nous avons constaté que la qualité audio/vidéo de votre présentation n'atteint pas nos standards actuels. Nous vous encourageons à améliorer ce point et à postuler de nouveau.",
        topic: "Bonjour, merci pour votre candidature. Votre profil est intéressant, mais le sujet de cours proposé ne correspond pas à nos priorités actuelles. Nous conservons votre dossier pour de futures opportunités.",
        incomplete: "Bonjour, merci d'avoir postulé. Votre dossier est malheureusement incomplet. Veuillez vous assurer de fournir toutes les informations demandées avant de soumettre à nouveau votre candidature."
    };

    const acceptanceTemplate = `Félicitations ! Votre candidature pour devenir formateur sur FormaAfrique a été acceptée.
    
Nous sommes ravis de vous accueillir dans notre communauté d'experts. Vous avez maintenant accès à toutes les fonctionnalités de création de cours.

Bienvenue à bord !`;

    React.useEffect(() => {
        if (application) {
            setDecision(null);
            setMessage('');
            setRejectionReason('');
        }
    }, [application]);

    React.useEffect(() => {
        if (decision === 'accepted') {
            setMessage(acceptanceTemplate);
        } else if (decision === 'rejected') {
            const template = rejectionTemplates[rejectionReason as keyof typeof rejectionTemplates] || "Bonjour, après un examen attentif de votre dossier, nous avons le regret de vous informer que votre candidature n'a pas été retenue pour le moment.";
            setMessage(template);
        } else {
            setMessage('');
        }
    }, [decision, rejectionReason, acceptanceTemplate]);

    if (!application) return null;
    
    const handleConfirm = async () => {
        setIsProcessing(true);
        await onConfirm(application.uid, decision === 'accepted', message);
        setIsProcessing(false);
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-2xl dark:bg-slate-900 dark:border-slate-800">
                <DialogHeader>
                    <div className="flex items-center gap-4 mb-4">
                        <Avatar className="h-16 w-16">
                            <AvatarImage src={application.profilePictureURL} />
                            <AvatarFallback>{application.fullName?.charAt(0) || 'U'}</AvatarFallback>
                        </Avatar>
                        <div>
                            <DialogTitle className="text-2xl dark:text-white">{application.fullName}</DialogTitle>
                            <DialogDescription className="dark:text-slate-400">
                                Candidature en attente - {application.instructorApplication?.specialty || 'Spécialité non définie'}
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="py-4 space-y-6">
                    <div>
                        <h4 className="font-semibold mb-2 dark:text-slate-300">1. Prendre une décision</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Button 
                                variant={decision === 'accepted' ? 'default' : 'outline'} 
                                onClick={() => setDecision('accepted')}
                                className={cn("h-20 text-lg", decision === 'accepted' && 'bg-green-600 hover:bg-green-700 border-green-600 ring-4 ring-green-500/20')}
                            >
                                <Check className="mr-2 h-6 w-6"/> Accepter
                            </Button>
                             <Button 
                                variant={decision === 'rejected' ? 'destructive' : 'outline'} 
                                onClick={() => setDecision('rejected')}
                                className={cn("h-20 text-lg", decision === 'rejected' && 'ring-4 ring-red-500/20')}
                            >
                                <X className="mr-2 h-6 w-6"/> Refuser
                            </Button>
                        </div>
                    </div>

                    {decision && (
                        <div className="animate-in fade-in-50 duration-500 space-y-4">
                             {decision === 'rejected' && (
                                <div>
                                    <Label htmlFor="rejection-reason" className="dark:text-slate-300">2. Motif du refus</Label>
                                    <Select onValueChange={setRejectionReason}>
                                        <SelectTrigger id="rejection-reason" className="w-full mt-1 dark:bg-slate-800 dark:border-slate-700">
                                            <SelectValue placeholder="Choisir un motif..." />
                                        </SelectTrigger>
                                        <SelectContent className="dark:bg-slate-900 dark:border-slate-700">
                                            <SelectItem value="quality">Qualité audio/vidéo</SelectItem>
                                            <SelectItem value="topic">Sujet non pertinent</SelectItem>
                                            <SelectItem value="incomplete">Dossier incomplet</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                             )}
                             <div>
                                <h4 className="font-semibold mb-2 dark:text-slate-300">
                                    {decision === 'accepted' ? '2. Message de bienvenue' : '3. Message de refus'}
                                </h4>
                                <Textarea 
                                    value={message} 
                                    onChange={(e) => setMessage(e.target.value)} 
                                    rows={8}
                                    className="dark:bg-slate-800 dark:border-slate-700"
                                />
                             </div>
                        </div>
                    )}
                </div>
                
                <DialogFooter>
                    <Button variant="ghost" onClick={onClose}>Annuler</Button>
                    <Button onClick={handleConfirm} disabled={!decision || isProcessing}>
                        {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        <Send className="mr-2 h-4 w-4"/> Confirmer et Envoyer
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default function InstructorApplicationsPage() {
  const { formaAfriqueUser: adminUser, isUserLoading } = useRole();
  const db = getFirestore();
  const { toast } = useToast();
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);

  const applicationsQuery = useMemoFirebase(
    () => query(
        collection(db, 'users'), 
        where('role', '==', 'instructor'), 
        where('isInstructorApproved', '==', false),
        orderBy('createdAt', 'desc')
    ),
    [db]
  );
  const { data: applications, isLoading: applicationsLoading } = useCollection<Application>(applicationsQuery);

  const isLoading = isUserLoading || applicationsLoading;

  const handleConfirmDecision = async (userId: string, approve: boolean, message: string) => {
    const userRef = doc(db, 'users', userId);
    try {
        if (approve) {
            await updateDoc(userRef, { isInstructorApproved: true });
            toast({ title: 'Candidature Approuvée', description: 'L\'instructeur a maintenant accès à toutes les fonctionnalités.' });
        } else {
            await updateDoc(userRef, { role: 'student', isInstructorApproved: false });
            toast({ title: 'Candidature Rejetée', description: 'Le rôle de l\'utilisateur a été réinitialisé à étudiant.' });
        }
        // TODO: Send email with `message` content
    } catch (error) {
        console.error("Error updating application:", error);
        toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de mettre à jour la candidature.' });
    }
  };


  if (adminUser?.role !== 'admin') {
    return <div className="p-8 text-center">Accès non autorisé.</div>;
  }

  return (
    <>
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold dark:text-white">Candidatures Instructeurs</h1>
        <p className="text-muted-foreground dark:text-slate-400">Examinez, approuvez ou rejetez les nouvelles demandes.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {isLoading ? (
            [...Array(3)].map((_, i) => <Skeleton key={i} className="h-64 w-full dark:bg-slate-700"/>)
        ) : applications && applications.length > 0 ? (
            applications.map((app) => (
                <Card 
                    key={app.uid} 
                    className="dark:bg-slate-800 dark:border-slate-700 flex flex-col cursor-pointer hover:ring-2 hover:ring-primary transition-all"
                    onClick={() => setSelectedApp(app)}
                >
                    <CardHeader className="flex-row items-center gap-4 space-y-0">
                         <Avatar className="h-12 w-12">
                            <AvatarImage src={app.profilePictureURL} alt={app.fullName} />
                            <AvatarFallback>{app.fullName?.charAt(0) || 'U'}</AvatarFallback>
                          </Avatar>
                          <div>
                            <CardTitle className="dark:text-slate-100">{app.fullName}</CardTitle>
                            <CardDescription className="dark:text-slate-400">{app.instructorApplication?.specialty || 'Spécialité non précisée'}</CardDescription>
                          </div>
                    </CardHeader>
                     <CardContent className="flex-grow">
                        <p className="text-sm text-muted-foreground dark:text-slate-400 line-clamp-3">
                            {app.instructorApplication?.motivation || "Aucune motivation fournie."}
                        </p>
                         <div className="flex gap-2 mt-4">
                          {app.instructorApplication?.verificationDocUrl && (
                            <Button asChild variant="outline" size="sm">
                                <a href={app.instructorApplication.verificationDocUrl} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}>
                                    <FileText className="mr-2 h-4 w-4"/> CV/Doc
                                </a>
                            </Button>
                          )}
                           {app.instructorApplication?.presentationVideoUrl && (
                            <Button asChild variant="outline" size="sm">
                                <a href={app.instructorApplication.presentationVideoUrl} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}>
                                    <Bot className="mr-2 h-4 w-4"/> Vidéo
                                </a>
                            </Button>
                          )}
                        </div>
                    </CardContent>
                     <CardContent className="text-xs text-muted-foreground">
                        Reçu {app.instructorApplication?.submittedAt ? formatDistanceToNow(app.instructorApplication.submittedAt.toDate(), { addSuffix: true, locale: fr }) : 'récemment'}
                    </CardContent>
                </Card>
            ))
        ) : (
             <div className="md:col-span-2 xl:col-span-3 h-64 flex flex-col items-center justify-center gap-2 text-muted-foreground dark:text-slate-400 border-2 border-dashed dark:border-slate-700 rounded-xl">
                <UserCheck className="h-12 w-12" />
                <p className="font-medium">Aucune nouvelle candidature</p>
                <p className="text-sm">Toutes les demandes ont été traitées.</p>
            </div>
        )}
      </div>
    </div>
    
    <DecisionModal 
        application={selectedApp} 
        isOpen={!!selectedApp} 
        onClose={() => setSelectedApp(null)}
        onConfirm={handleConfirmDecision}
    />
    </>
  );
}
