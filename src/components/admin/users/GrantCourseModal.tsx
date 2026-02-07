
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { getFirestore, collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { useRole } from '@/context/RoleContext';
import { useToast } from '@/hooks/use-toast';
import { grantCourseAccess } from '@/actions/userActions';
import type { NdaraUser, Course } from '@/lib/types';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Gift, CheckCircle2 } from 'lucide-react';

const grantFormSchema = z.object({
  courseId: z.string().min(1, "Veuillez sélectionner un cours."),
  reason: z.string().min(5, "Veuillez indiquer un motif valable (min. 5 caract.)."),
  expirationInDays: z.coerce.number().min(0).optional(),
});

type GrantFormValues = z.infer<typeof grantFormSchema>;

interface GrantCourseModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  targetUser: NdaraUser | null;
}

export function GrantCourseModal({ isOpen, onOpenChange, targetUser }: GrantCourseModalProps) {
  const { currentUser: adminUser } = useRole();
  const { toast } = useToast();
  const db = getFirestore();
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoadingCourses, setIsLoadingCourses] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<GrantFormValues>({
    resolver: zodResolver(grantFormSchema),
    defaultValues: {
      courseId: '',
      reason: '',
      expirationInDays: 0,
    },
  });

  useEffect(() => {
    if (isOpen) {
      const fetchCourses = async () => {
        setIsLoadingCourses(true);
        try {
          const q = query(
            collection(db, 'courses'),
            where('status', '==', 'Published'),
            orderBy('title')
          );
          const snap = await getDocs(q);
          setCourses(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course)));
        } catch (error) {
          console.error("Error fetching courses:", error);
        } finally {
          setIsLoadingCourses(false);
        }
      };
      fetchCourses();
    } else {
        form.reset();
    }
  }, [isOpen, db, form]);

  const onSubmit = async (values: GrantFormValues) => {
    if (!adminUser || !targetUser) return;
    setIsSubmitting(true);

    try {
      const result = await grantCourseAccess({
        studentId: targetUser.uid,
        courseId: values.courseId,
        adminId: adminUser.uid,
        reason: values.reason,
        expirationInDays: values.expirationInDays || undefined,
      });

      if (result.success) {
        toast({
          title: "Accès accordé !",
          description: `L'étudiant ${targetUser.fullName} a maintenant accès au cours.`,
        });
        onOpenChange(false);
      } else {
        toast({
          variant: 'destructive',
          title: "Erreur",
          description: result.error,
        });
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: "Erreur technique",
        description: "Impossible de valider l'accès pour le moment.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!targetUser) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-slate-900 border-slate-800">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Gift className="h-5 w-5 text-primary" />
            Offrir un cours
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Accorder un accès gratuit à <b>{targetUser.fullName}</b>.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <FormField
              control={form.control}
              name="courseId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Sélectionner la formation</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="h-12 bg-slate-800/50 border-slate-700 rounded-xl text-white">
                        <SelectValue placeholder={isLoadingCourses ? "Chargement..." : "Choisir un cours"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-slate-900 border-slate-800 text-white">
                      {courses.map(course => (
                        <SelectItem key={course.id} value={course.id}>{course.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Motif de l'offre</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Récompense challenge IA" {...field} className="h-12 bg-slate-800/50 border-slate-700 rounded-xl text-white" />
                  </FormControl>
                  <FormDescription className="text-[10px]">Sera visible dans le journal d'audit.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="expirationInDays"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Durée (jours)</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} className="h-12 bg-slate-800/50 border-slate-700 rounded-xl text-white" />
                  </FormControl>
                  <FormDescription className="text-[10px]">Laissez 0 pour un accès à vie.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="pt-4 border-t border-white/5">
              <Button 
                type="submit" 
                disabled={isSubmitting || isLoadingCourses}
                className="w-full h-14 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-black uppercase text-xs tracking-widest shadow-xl transition-all active:scale-[0.97]"
              >
                {isSubmitting ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Valider l'accès
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
