'use client';

import { useState } from 'react';
import { useRole } from '@/context/RoleContext';
import { useToast } from '@/hooks/use-toast';
import { approveInstructorApplication } from '@/actions/userActions';
import type { NdaraUser } from '@/lib/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

interface ApplicationDetailsModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  application: NdaraUser | null;
  onActionComplete: () => void;
}

const DetailRow = ({ label, value, isLink = false }: { label: string; value?: string; isLink?: boolean }) => {
  if (!value) return null;
  return (
    <div>
      <p className="text-sm font-semibold text-slate-400">{label}</p>
      {isLink ? (
        <a href={value} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline break-words">
          {value}
        </a>
      ) : (
        <p className="text-sm text-slate-200 break-words">{value}</p>
      )}
    </div>
  );
};

export function ApplicationDetailsModal({ isOpen, onOpenChange, application, onActionComplete }: ApplicationDetailsModalProps) {
  const { currentUser: adminUser } = useRole();
  const { toast } = useToast();
  const [rejectionMessage, setRejectionMessage] = useState("Après examen de votre profil, nous ne pouvons malheureusement pas donner une suite favorable à votre candidature pour le moment. Nous vous encourageons à enrichir votre expérience et à postuler de nouveau à l'avenir.");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!application) return null;

  const handleDecision = async (decision: 'accepted' | 'rejected') => {
    if (!adminUser) return;
    setIsSubmitting(true);

    const message = decision === 'accepted'
      ? `Félicitations ! Votre candidature d'instructeur a été approuvée. Vous pouvez maintenant commencer à créer des cours.`
      : rejectionMessage;

    const result = await approveInstructorApplication({
      userId: application.uid,
      decision,
      message,
      adminId: adminUser.uid,
    });

    if (result.success) {
      toast({
        title: `Candidature ${decision === 'accepted' ? 'approuvée' : 'rejetée'}`,
        description: `L'utilisateur a été notifié.`,
      });
      onActionComplete();
      onOpenChange(false);
    } else {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: result.error || "Une erreur est survenue.",
      });
    }

    setIsSubmitting(false);
  };
  
  const appData = application.instructorApplication;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl dark:bg-slate-800 dark:border-slate-700">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Avatar>
              <AvatarImage src={application.profilePictureURL} />
              <AvatarFallback>{application.fullName?.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              Candidature de {application.fullName}
              <p className="text-sm font-normal text-muted-foreground">{application.email}</p>
            </div>
          </DialogTitle>
          <DialogDescription>
            Examinez les informations fournies pour prendre une décision.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[50vh] pr-4">
            <div className="space-y-4 py-4">
              <DetailRow label="Spécialité proposée" value={appData?.specialty} />
              <DetailRow label="Expérience professionnelle" value={appData?.professionalExperience} />
              <DetailRow label="Titre du premier cours proposé" value={appData?.firstCourseTitle} />
              <DetailRow label="Description du premier cours" value={appData?.firstCourseDescription} />
              
              <h4 className="font-semibold text-slate-300 pt-4 border-t border-slate-700">Liens & Contact</h4>
              <DetailRow label="Vidéo de présentation" value={appData?.presentationVideoUrl} isLink />
              <DetailRow label="Portfolio / Site web" value={appData?.portfolioUrl} isLink />
              <DetailRow label="Profil LinkedIn" value={appData?.linkedinUrl} isLink />
              <DetailRow label="Page Facebook" value={appData?.facebookUrl} isLink />
              <DetailRow label="Chaîne YouTube" value={appData?.youtubeUrl} isLink />
              <DetailRow label="N° WhatsApp" value={appData?.whatsappNumber} />
              
              <div className="pt-4 border-t border-slate-700">
                  <p className="text-sm font-semibold text-slate-400">Message pour le refus (modifiable)</p>
                   <Textarea
                    value={rejectionMessage}
                    onChange={(e) => setRejectionMessage(e.target.value)}
                    rows={4}
                    className="mt-2"
                  />
              </div>
            </div>
        </ScrollArea>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="destructive" onClick={() => handleDecision('rejected')} disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <XCircle className="mr-2 h-4 w-4" />}
            Rejeter
          </Button>
          <Button onClick={() => handleDecision('accepted')} disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
            Approuver
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
