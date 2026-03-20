'use client';

/**
 * @fileOverview Panneau Immersif de Validation - Design Qwen.
 * ✅ INTERFACE : Panneau coulissant Android-First.
 * ✅ LOGIQUE : Décision Jury avec feedback personnalisé.
 */

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
import { 
    Loader2, 
    Check, 
    X, 
    User, 
    Briefcase, 
    BookOpen, 
    Linkedin, 
    Youtube, 
    Globe, 
    MessageSquare,
    Quote,
    ArrowDown
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ApplicationDetailsModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  application: NdaraUser | null;
  onActionComplete: () => void;
}

export function ApplicationDetailsModal({ isOpen, onOpenChange, application, onActionComplete }: ApplicationDetailsModalProps) {
  const { currentUser: adminUser } = useRole();
  const { toast } = useToast();
  const [feedback, setFeedback] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!application) return null;

  const handleDecision = async (decision: 'accepted' | 'rejected') => {
    if (!adminUser) return;
    setIsSubmitting(true);

    const result = await approveInstructorApplication({
      userId: application.uid,
      decision,
      message: feedback || (decision === 'accepted' ? 'Félicitations, votre dossier a été validé !' : 'Dossier incomplet.'),
      adminId: adminUser.uid,
    });

    if (result.success) {
      toast({
        title: decision === 'accepted' ? "Expert Certifié !" : "Candidature refusée",
        description: `L'utilisateur a été notifié par email et alerte système.`,
      });
      onActionComplete();
    } else {
      toast({ variant: 'destructive', title: 'Erreur', description: result.error });
    }
    setIsSubmitting(false);
  };
  
  const appData = application.instructorApplication;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md h-[95vh] flex flex-col p-0 bg-slate-900 border-none rounded-t-[2.5rem] overflow-hidden fixed bottom-0 top-auto translate-y-0 sm:relative sm:rounded-[2.5rem]">
        <div className="grain-overlay opacity-[0.03]" />
        
        {/* Modal Header Immersive */}
        <div className="px-6 pt-8 pb-4 border-b border-white/5 flex items-center justify-between relative z-10">
            <button onClick={() => onOpenChange(false)} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-slate-500 active:scale-90 transition">
                <ArrowDown size={20} />
            </button>
            <h2 className="font-black text-white text-[10px] uppercase tracking-[0.3em]">Dossier Candidat</h2>
            <div className="w-10" />
        </div>

        <ScrollArea className="flex-1 z-10">
            <div className="p-6 space-y-8 pb-32">
                
                {/* Profile Identity */}
                <div className="flex flex-col items-center text-center">
                    <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-primary/30 mb-4 shadow-2xl">
                        <Avatar className="h-full w-full">
                            <AvatarImage src={application.profilePictureURL} className="object-cover" />
                            <AvatarFallback className="bg-slate-800 text-3xl font-black text-slate-500 uppercase">
                                {application.fullName?.charAt(0)}
                            </AvatarFallback>
                        </Avatar>
                    </div>
                    <h1 className="font-black text-2xl text-white uppercase tracking-tight leading-none mb-1">{application.fullName}</h1>
                    <p className="text-primary text-[10px] font-black uppercase tracking-widest">{appData?.specialty || 'Spécialiste'}</p>
                    
                    <div className="flex gap-3 mt-6">
                        <SocialBtn icon={Linkedin} href={appData?.linkedinUrl} color="text-blue-400 bg-blue-500/10" />
                        <SocialBtn icon={Youtube} href={appData?.youtubeUrl} color="text-red-400 bg-red-500/10" />
                        <SocialBtn icon={Globe} href={appData?.portfolioUrl} color="text-slate-400 bg-slate-800" />
                    </div>
                </div>

                {/* Experience Bio */}
                <div className="bg-slate-800/40 rounded-[2rem] p-6 border border-white/5 relative overflow-hidden">
                    <Quote className="absolute -left-2 -top-2 size-12 text-white/5" />
                    <h3 className="font-black text-white text-[9px] uppercase tracking-widest mb-4 flex items-center gap-2">
                        <User size={12} className="text-primary" />
                        Bio & Expérience
                    </h3>
                    <p className="text-slate-300 text-sm leading-relaxed font-serif italic relative z-10">
                        "{appData?.professionalExperience || "Aucun détail d'expérience fourni."}"
                    </p>
                </div>

                {/* Proposed Project */}
                <div className="bg-slate-800/40 rounded-[2rem] p-6 border border-white/5">
                    <h3 className="font-black text-white text-[9px] uppercase tracking-widest mb-4 flex items-center gap-2">
                        <BookOpen size={12} className="text-orange-400" />
                        Projet de Formation
                    </h3>
                    <div className="bg-black/30 rounded-2xl p-4 border border-white/5 mb-4">
                        <h4 className="font-bold text-white text-sm uppercase tracking-tight mb-1">{appData?.firstCourseTitle || 'Sans titre'}</h4>
                        <p className="text-slate-500 text-xs leading-relaxed italic line-clamp-3">"{appData?.firstCourseDescription}"</p>
                    </div>
                    <div className="flex items-center gap-2 text-primary font-bold text-[9px] uppercase tracking-widest">
                        <Check size={12} /> Prêt pour publication
                    </div>
                </div>

                {/* Feedback Jury */}
                <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1 flex items-center gap-2">
                        <MessageSquare size={12} /> Feedback Jury
                    </label>
                    <Textarea 
                        placeholder="Rédigez un message de bienvenue ou les raisons du refus..." 
                        rows={4}
                        className="bg-black/30 border-white/10 rounded-2xl text-white text-sm focus-visible:ring-primary/20 resize-none p-4"
                        value={feedback}
                        onChange={(e) => setFeedback(e.target.value)}
                    />
                </div>
            </div>
        </ScrollArea>

        {/* Decision Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-6 bg-slate-900/90 backdrop-blur-xl border-t border-white/5 z-20 safe-area-pb">
            <div className="flex gap-3">
                <button 
                    onClick={() => handleDecision('rejected')} 
                    disabled={isSubmitting}
                    className="flex-1 h-14 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-500 hover:bg-red-500 hover:text-white font-black uppercase text-[10px] tracking-widest transition-all active:scale-95"
                >
                    {isSubmitting ? <Loader2 className="animate-spin" /> : <><X className="mr-2 h-4 w-4" /> Rejeter</>}
                </button>
                <Button 
                    onClick={() => handleDecision('accepted')} 
                    disabled={isSubmitting}
                    className="flex-1 h-14 rounded-2xl bg-primary text-slate-950 hover:bg-emerald-400 font-black uppercase text-[10px] tracking-widest shadow-xl shadow-primary/20 transition-all active:scale-95"
                >
                    {isSubmitting ? <Loader2 className="animate-spin" /> : <><Check className="mr-2 h-4 w-4" /> Approuver</>}
                </Button>
            </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SocialBtn({ icon: Icon, href, color }: any) {
    if (!href) return null;
    return (
        <a href={href} target="_blank" rel="noopener noreferrer" className={cn("w-10 h-10 rounded-xl flex items-center justify-center transition-all active:scale-90", color)}>
            <Icon size={18} />
        </a>
    );
}
