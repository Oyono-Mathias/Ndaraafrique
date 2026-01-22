'use client';

import { useState } from 'react';
import { useRole } from '@/context/RoleContext';
import { useToast } from '@/hooks/use-toast';
import { moderateCourse } from '@/actions/supportActions';
import type { Course, NdaraUser } from '@/lib/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import Image from 'next/image';

interface ModerationDetailsModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  course: (Course & { instructor?: Partial<NdaraUser> }) | null;
  onActionComplete: () => void;
}

const DetailRow = ({ label, value }: { label: string; value?: string | number; }) => {
  if (!value) return null;
  return (
    <div>
      <p className="text-sm font-semibold text-slate-400">{label}</p>
      <p className="text-sm text-slate-200 break-words">{value}</p>
    </div>
  );
};

export function ModerationDetailsModal({ isOpen, onOpenChange, course, onActionComplete }: ModerationDetailsModalProps) {
  const { currentUser: adminUser } = useRole();
  const { toast } = useToast();
  const [rejectionFeedback, setRejectionFeedback] = useState("Après examen de votre cours, nous avons identifié des points qui nécessitent votre attention avant publication. Veuillez consulter nos directives et soumettre à nouveau votre cours après modification.");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!course) return null;

  const handleDecision = async (decision: 'approve' | 'reject') => {
    if (!adminUser) return;
    setIsSubmitting(true);

    const result = await moderateCourse(course.id, decision, adminUser.uid, decision === 'reject' ? rejectionFeedback : undefined);

    if (result.success) {
      toast({
        title: `Cours ${decision === 'approve' ? 'approuvé' : 'rejeté'}`,
        description: `L'instructeur sera notifié.`,
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
  
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl dark:bg-slate-800 dark:border-slate-700">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            Examen du cours : {course.title}
          </DialogTitle>
          <DialogDescription>
            Examinez les détails du cours et prenez une décision.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
            <div className="relative aspect-video w-full rounded-lg overflow-hidden my-4 bg-slate-700">
                <Image src={course.imageUrl || `https://picsum.photos/seed/${course.id}/600/338`} alt={course.title} fill className="object-cover"/>
            </div>
            <div className="space-y-4 py-4">
              <DetailRow label="Titre" value={course.title} />
              <DetailRow label="Instructeur" value={course.instructor?.fullName} />
              <DetailRow label="Catégorie" value={course.category} />
              <DetailRow label="Prix" value={`${course.price.toLocaleString('fr-FR')} XOF`} />
              <DetailRow label="Description" value={course.description} />
              <DetailRow label="Objectifs d'apprentissage" value={course.learningObjectives?.join(', ')} />
              
              <div className="pt-4 border-t border-slate-700">
                  <p className="text-sm font-semibold text-slate-400">Feedback pour le refus (modifiable)</p>
                   <Textarea
                    value={rejectionFeedback}
                    onChange={(e) => setRejectionFeedback(e.target.value)}
                    rows={4}
                    className="mt-2"
                  />
              </div>
            </div>
        </ScrollArea>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="destructive" onClick={() => handleDecision('reject')} disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <XCircle className="mr-2 h-4 w-4" />}
            Rejeter
          </Button>
          <Button onClick={() => handleDecision('approve')} disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
            Approuver & Publier
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
