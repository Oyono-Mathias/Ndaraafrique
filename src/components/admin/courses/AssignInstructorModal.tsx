'use client';

import { useState, useEffect, useMemo } from 'react';
import { getFirestore, collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { useRole } from '@/context/RoleContext';
import { useToast } from '@/hooks/use-toast';
import { assignInstructorToCourseAction } from '@/actions/courseActions';
import type { NdaraUser, Course } from '@/lib/types';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Search, UserPlus, CheckCircle2, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AssignInstructorModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  course: Course | null;
}

export function AssignInstructorModal({ isOpen, onOpenChange, course }: AssignInstructorModalProps) {
  const { currentUser: adminUser } = useRole();
  const { toast } = useToast();
  const db = getFirestore();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [instructors, setInstructors] = useState<NdaraUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
        setSearchTerm('');
        setInstructors([]);
        return;
    }

    const fetchInstructors = async () => {
        setIsLoading(true);
        try {
            // On récupère tous les utilisateurs ayant le rôle instructor ou admin
            const q = query(
                collection(db, 'users'),
                where('role', 'in', ['instructor', 'admin']),
                orderBy('fullName')
            );
            const snap = await getDocs(q);
            setInstructors(snap.docs.map(doc => ({ uid: doc.id, ...doc.data() } as NdaraUser)));
        } catch (error) {
            console.error("Error fetching instructors:", error);
        } finally {
            setIsLoading(false);
        }
    };

    fetchInstructors();
  }, [isOpen, db]);

  const filteredInstructors = useMemo(() => {
    if (!searchTerm.trim()) return instructors;
    const s = searchTerm.toLowerCase();
    return instructors.filter(i => 
        i.fullName?.toLowerCase().includes(s) || 
        i.email?.toLowerCase().includes(s) ||
        i.username?.toLowerCase().includes(s)
    );
  }, [instructors, searchTerm]);

  const handleAssign = async (instructorId: string) => {
    if (!adminUser || !course) return;
    setIsSubmitting(instructorId);

    try {
      const result = await assignInstructorToCourseAction({
        courseId: course.id,
        newInstructorId: instructorId,
        adminId: adminUser.uid,
      });

      if (result.success) {
        toast({
          title: "Contrôle transféré",
          description: "L'expert sélectionné peut maintenant gérer cette formation.",
        });
        onOpenChange(false);
      } else {
        toast({
          variant: 'destructive',
          title: "Échec",
          description: result.error,
        });
      }
    } catch (error) {
      toast({ variant: 'destructive', title: "Erreur technique" });
    } finally {
      setIsSubmitting(null);
    }
  };

  if (!course) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-slate-900 border-slate-800 p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="flex items-center gap-2 text-white font-black uppercase tracking-tight">
            <UserPlus className="h-5 w-5 text-primary" />
            Assigner un Expert
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Déléguez la gestion de <b>"{course.title}"</b>.
          </DialogDescription>
        </DialogHeader>

        <div className="p-6 space-y-4">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <Input 
                    placeholder="Chercher un formateur..." 
                    className="pl-10 h-12 bg-slate-950 border-slate-800 rounded-xl text-white"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            <ScrollArea className="h-[300px] pr-4">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center h-full opacity-30">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : filteredInstructors.length > 0 ? (
                    <div className="space-y-2">
                        {filteredInstructors.map((instructor) => (
                            <div 
                                key={instructor.uid}
                                className={cn(
                                    "flex items-center justify-between p-3 rounded-2xl border transition-all",
                                    course.instructorId === instructor.uid 
                                        ? "bg-primary/5 border-primary/20" 
                                        : "bg-slate-800/30 border-transparent hover:bg-slate-800/50"
                                )}
                            >
                                <div className="flex items-center gap-3">
                                    <Avatar className="h-10 w-10 border border-slate-700">
                                        <AvatarImage src={instructor.profilePictureURL} />
                                        <AvatarFallback className="bg-slate-800 text-slate-500 font-bold uppercase">
                                            {instructor.fullName?.charAt(0)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="min-w-0">
                                        <p className="font-bold text-sm text-white truncate max-w-[150px]">{instructor.fullName}</p>
                                        <p className="text-[10px] text-slate-500 font-medium uppercase tracking-tighter truncate max-w-[150px]">{instructor.email}</p>
                                    </div>
                                </div>
                                {course.instructorId === instructor.uid ? (
                                    <div className="flex items-center gap-1.5 text-emerald-500">
                                        <ShieldCheck className="h-4 w-4" />
                                        <span className="text-[9px] font-black uppercase tracking-widest">Actuel</span>
                                    </div>
                                ) : (
                                    <Button 
                                        size="sm" 
                                        onClick={() => handleAssign(instructor.uid)}
                                        disabled={!!isSubmitting}
                                        className="h-8 rounded-xl bg-primary hover:bg-primary/90 text-white font-black uppercase text-[9px] tracking-widest"
                                    >
                                        {isSubmitting === instructor.uid ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Choisir"}
                                    </Button>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full opacity-20">
                        <UserPlus className="h-12 w-12 mb-2" />
                        <p className="text-xs font-bold uppercase tracking-widest text-center">Aucun expert trouvé</p>
                    </div>
                )}
            </ScrollArea>
        </div>

        <DialogFooter className="p-6 pt-0 bg-slate-950/50 border-t border-white/5">
            <p className="text-[9px] text-slate-600 font-bold uppercase text-center w-full leading-relaxed">
                Note : L'expert sélectionné pourra modifier les leçons, voir les élèves et recevra les commissions sur les futures ventes.
            </p>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
