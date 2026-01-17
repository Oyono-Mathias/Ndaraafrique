
'use client';

import React, { useState, useMemo } from 'react';
import { useRole } from '@/context/RoleContext';
import { useCollection } from '@/firebase/firestore/use-collection';
import { useMemoFirebase } from '@/firebase/provider';
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, Check, X, UserCheck, UserX, Bot, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { NdaraUser } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTranslations } from 'next-intl';
import { Label } from '@/components/ui/label';
import { approveInstructorApplication } from '@/actions/userActions';


interface Application extends NdaraUser {
    instructorApplication?: {
        motivation?: string;
        verificationDocUrl?: string;
        submittedAt: any;
        specialty?: string;
        presentationVideoUrl?: string;
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
    onConfirm: (userId: string, decision: Decision, message: string) => Promise<void>;
}) => {
    const t = useTranslations();
    const [decision, setDecision] = useState<Decision>(null);
    const [rejectionReason, setRejectionReason] = useState('');
    const [message, setMessage] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    const rejectionTemplates = {
        quality: t('rejectionTemplateQuality'),
        topic: t('rejectionTemplateTopic'),
        incomplete: t('rejectionTemplateIncomplete')
    };

    const acceptanceTemplate = t('acceptanceTemplate');

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
            const template = rejectionTemplates[rejectionReason as keyof typeof rejectionTemplates] || "Raison générique de rejet";
            setMessage(template);
        } else {
            setMessage('');
        }
    }, [decision, rejectionReason, acceptanceTemplate, rejectionTemplates, t]);

    if (!application) return null;
    
    const handleConfirm = async () => {
        if (!decision) return;
        setIsProcessing(true);
        await onConfirm(application.uid, decision, message);
        setIsProcessing(false);
        onClose(); // Close the modal automatically on success
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
                                {t('decisionModalTitle')} - {application.instructorApplication?.specialty || t('unspecifiedSpecialty')}
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="py-4 space-y-6">
                    <div>
                        <h4 className="font-semibold mb-2 dark:text-slate-300">Étape 1 : Prendre une décision</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Button 
                                variant={decision === 'accepted' ? 'default' : 'outline'} 
                                onClick={() => setDecision('accepted')}
                                className={cn("h-20 text-lg", decision === 'accepted' && 'bg-green-600 hover:bg-green-700 border-green-600 ring-4 ring-green-500/20')}
                            >
                                <Check className="mr-2 h-6 w-6"/> {t('approve')}
                            </Button>
                             <Button 
                                variant={decision === 'rejected' ? 'destructive' : 'outline'} 
                                onClick={() => setDecision('rejected')}
                                className={cn("h-20 text-lg", decision === 'rejected' && 'ring-4 ring-red-500/20')}
                            >
                                <X className="mr-2 h-6 w-6"/> {t('reject')}
                            </Button>
                        </div>
                    </div>

                    {decision && (
                        <div className="animate-in fade-in-50 duration-500 space-y-4">
                             {decision === 'rejected' && (
                                <div>
                                    <Label htmlFor="rejection-reason" className="dark:text-slate-300">Étape 2 (Optionnel) : Choisir un modèle de refus</Label>
                                    <Select onValueChange={setRejectionReason}>
                                        <SelectTrigger id="rejection-reason" className="w-full mt-1 dark:bg-slate-800 dark:border-slate-700">
                                            <SelectValue placeholder="Choisir une raison" />
                                        </SelectTrigger>
                                        <SelectContent className="dark:bg-slate-900 dark:border-slate-700">
                                            <SelectItem value="quality">Qualité de la vidéo</SelectItem>
                                            <SelectItem value="topic">Sujet non pertinent</SelectItem>
                                            <SelectItem value="incomplete">Dossier incomplet</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                             )}
                             <div>
                                <h4 className="font-semibold mb-2 dark:text-slate-300">
                                    {decision === 'accepted' ? "Étape 2 : Message de bienvenue" : "Étape 3 : Message de refus"}
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
                    <Button variant="ghost" onClick={onClose} disabled={isProcessing}>{t('cancelButton')}</Button>
                    <Button onClick={handleConfirm} disabled={!decision || isProcessing}>
                        {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        <Send className="mr-2 h-4 w-4"/> Confirmer et envoyer
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default function InstructorApplicationsPage() {
  const { currentUser: adminUser, isUserLoading } = useRole();
  const db = getFirestore();
  const { toast } = useToast();
  const t = useTranslations();
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

  const handleConfirmDecision = async (userId: string, decision: Decision, message: string) => {
    if (!adminUser || !decision) return;

    const result = await approveInstructorApplication({ userId, decision, message, adminId: adminUser.uid });

    if (result.success) {
      const toastMessage = decision === 'accepted' 
        ? { title: "Candidature approuvée", description: "L'instructeur a été notifié et son compte est activé." }
        : { title: "Candidature rejetée", description: "L'instructeur a été notifié de la décision." };
      toast(toastMessage);
    } else {
      toast({ variant: 'destructive', title: "Erreur", description: result.error || "Impossible de mettre à jour le statut de la candidature." });
    }
  };


  if (adminUser?.role !== 'admin') {
    return <div className="p-8 text-center">Accès non autorisé à cette page.</div>;
  }

  return (
    <>
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold dark:text-white">{t('navApplications')}</h1>
        <p className="text-muted-foreground dark:text-slate-400">Examinez et approuvez les nouveaux instructeurs.</p>
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
                            <CardDescription className="dark:text-slate-400">{app.instructorApplication?.specialty || t('unspecifiedSpecialty')}</CardDescription>
                          </div>
                    </CardHeader>
                     <CardContent className="flex-grow">
                        <p className="text-sm text-muted-foreground dark:text-slate-400 line-clamp-3">
                            {app.instructorApplication?.motivation || "Aucune motivation fournie."}
                        </p>
                         <div className="flex gap-2 mt-4">
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
                        Candidature envoyée {app.instructorApplication?.submittedAt ? formatDistanceToNow(app.instructorApplication.submittedAt.toDate(), { addSuffix: true, locale: fr }) : "récemment"}
                    </CardContent>
                </Card>
            ))
        ) : (
             <div className="md:col-span-2 xl:col-span-3 h-64 flex flex-col items-center justify-center gap-2 text-muted-foreground dark:text-slate-400 border-2 border-dashed dark:border-slate-700 rounded-xl">
                <UserCheck className="h-12 w-12" />
                <p className="font-medium">Aucune nouvelle candidature</p>
                <p className="text-sm">Toutes les candidatures ont été traitées.</p>
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
