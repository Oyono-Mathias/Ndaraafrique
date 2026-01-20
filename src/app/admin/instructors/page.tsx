
'use client';

import React, { useState, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, Check, X, UserCheck, Bot, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { NdaraUser } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

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

// This is a placeholder for a real onConfirm function
const handleConfirmPlaceholder = async (userId: string, decision: Decision, message: string) => {
    console.log("Confirming decision:", { userId, decision, message });
    await new Promise(res => setTimeout(res, 1000));
};

const DecisionModal = ({ 
    application, 
    isOpen, 
    onClose
}: { 
    application: Application | null; 
    isOpen: boolean; 
    onClose: () => void;
}) => {
    const [decision, setDecision] = useState<Decision>(null);
    const [rejectionReason, setRejectionReason] = useState('');
    const [message, setMessage] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    const rejectionTemplates = {
        quality: "La qualité de votre vidéo de présentation n'est pas suffisante.",
        topic: "Le sujet que vous proposez n'est pas pertinent pour notre audience.",
        incomplete: "Votre dossier de candidature est incomplet."
    };

    const acceptanceTemplate = "Félicitations ! Votre candidature a été acceptée. Vous pouvez maintenant commencer à créer des cours.";

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
    }, [decision, rejectionReason, acceptanceTemplate, rejectionTemplates]);

    if (!application) return null;
    
    const handleConfirm = async () => {
        if (!decision) return;
        setIsProcessing(true);
        await handleConfirmPlaceholder(application.uid, decision, message);
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
                                Décision sur la candidature - {application.instructorApplication?.specialty || 'Spécialité non spécifiée'}
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
                                <Check className="mr-2 h-6 w-6"/> Approuver
                            </Button>
                             <Button 
                                variant={decision === 'rejected' ? 'destructive' : 'outline'} 
                                onClick={() => setDecision('rejected')}
                                className={cn("h-20 text-lg", decision === 'rejected' && 'ring-4 ring-red-500/20')}
                            >
                                <X className="mr-2 h-6 w-6"/> Rejeter
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
                    <Button variant="ghost" onClick={onClose} disabled={isProcessing}>Annuler</Button>
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
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [applications, setApplications] = useState<Application[]>([]);

  // Simulate data fetching
  useEffect(() => {
    const timer = setTimeout(() => {
        // To test empty state, set the array to []
        setApplications([
            { uid: '1', fullName: 'Amina Diallo', profilePictureURL: '/placeholder-avatars/amina.jpg', instructorApplication: { specialty: 'Ingénierie Pédagogique', motivation: 'Passionnée par la création de contenu éducatif impactant, je souhaite apporter mon expertise pour enrichir le catalogue de Ndara Afrique et former la prochaine génération de leaders.', submittedAt: new Date() } },
            { uid: '2', fullName: 'Kwame Nkrumah', profilePictureURL: '/placeholder-avatars/kwame.jpg', instructorApplication: { specialty: 'Développement Backend', motivation: 'Avec 10 ans d\'expérience en Node.js et architecture système, je veux partager mes connaissances sur la construction d\'applications scalables et robustes.', submittedAt: new Date(Date.now() - 86400000 * 2) } },
        ]);
        setIsLoading(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold dark:text-white">Candidatures Instructeurs</h1>
        <p className="text-muted-foreground dark:text-slate-400">Examinez et approuvez les nouveaux instructeurs.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {isLoading ? (
            [...Array(3)].map((_, i) => <Skeleton key={i} className="h-64 w-full dark:bg-slate-700"/>)
        ) : applications.length > 0 ? (
            applications.map((app) => (
                <Card 
                    key={app.uid} 
                    className="dark:bg-slate-800 dark:border-slate-700 flex flex-col"
                >
                    <CardHeader className="flex-row items-center gap-4 space-y-0">
                         <Avatar className="h-12 w-12">
                            <AvatarImage src={app.profilePictureURL} alt={app.fullName} />
                            <AvatarFallback>{app.fullName?.charAt(0) || 'U'}</AvatarFallback>
                          </Avatar>
                          <div>
                            <CardTitle className="dark:text-slate-100">{app.fullName}</CardTitle>
                            <CardDescription className="dark:text-slate-400">{app.instructorApplication?.specialty || 'Spécialité non spécifiée'}</CardDescription>
                          </div>
                    </CardHeader>
                     <CardContent className="flex-grow">
                        <p className="text-sm text-muted-foreground dark:text-slate-400 line-clamp-3">
                            {app.instructorApplication?.motivation || "Aucune motivation fournie."}
                        </p>
                    </CardContent>
                    <CardFooter className="flex-col items-stretch gap-2">
                         <Button className="w-full" onClick={() => setSelectedApp(app)}>
                            Voir détails & Décider
                        </Button>
                        <p className="text-xs text-center text-muted-foreground">
                            Candidature envoyée {app.instructorApplication?.submittedAt ? formatDistanceToNow(app.instructorApplication.submittedAt, { addSuffix: true, locale: fr }) : "récemment"}
                        </p>
                    </CardFooter>
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
    />
    </>
  );
}
