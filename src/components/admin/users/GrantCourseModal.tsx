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
import { Switch } from '@/components/ui/switch';
import { Loader2, Gift, CheckCircle2, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

const grantFormSchema = z.object({
  courseId: z.string().min(1, "Veuillez sélectionner un cours."),
  reason: z.string().min(5, "Veuillez indiquer un motif valable (min. 5 caract.)."),
  isTemporary: z.boolean().default(false),
  durationValue: z.coerce.number().min(30, "Minimum 30 minutes.").optional(),
  durationUnit: z.enum(['minutes', 'hours', 'days']).default('minutes'),
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
      isTemporary: false,
      durationValue: 30,
      durationUnit: 'minutes',
    },
  });

  const isTemporary = form.watch('isTemporary');

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

    let expirationMinutes = undefined;
    let expirationInDays = undefined;

    if (values.isTemporary && values.durationValue) {
        if (values.durationUnit === 'minutes') expirationMinutes = values.durationValue;
        else if (values.durationUnit === 'hours') expirationMinutes = values.durationValue * 60;
        else if (values.durationUnit === 'days') expirationInDays = values.durationValue;
    }

    try {
      const result = await grantCourseAccess({
        studentId: targetUser.uid,
        courseId: values.courseId,
        adminId: adminUser.uid,
        reason: values.reason,
        expirationMinutes,
        expirationInDays,
      });

      if (result.success) {
        toast({
          title: values.isTemporary ? "Accès test activé !" : "Accès offert !",
          description: `L'utilisateur ${targetUser.fullName} a maintenant accès au cours.`,
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
            Accorder un accès
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Gestion des droits pour <b>{targetUser.fullName}</b>.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <FormField
              control={form.control}
              name="courseId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Formation</FormLabel>
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
              name="isTemporary"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-xl border border-slate-800 p-4 bg-slate-950/50">
                  <div className="space-y-0.5">
                    <FormLabel className="text-sm font-bold text-white">Mode Test (Limité)</FormLabel>
                    <FormDescription className="text-[10px]">L'accès expirera automatiquement.</FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {isTemporary && (
                <div className="grid grid-cols-2 gap-3 animate-in slide-in-from-top-2">
                    <FormField
                        control={form.control}
                        name="durationValue"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-[10px] font-black uppercase text-slate-500">Durée</FormLabel>
                                <FormControl>
                                    <Input type="number" {...field} className="h-12 bg-slate-800/50 border-slate-700 rounded-xl text-white" />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="durationUnit"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-[10px] font-black uppercase text-slate-500">Unité</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger className="h-12 bg-slate-800/50 border-slate-700 rounded-xl text-white">
                                            <SelectValue />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent className="bg-slate-900 border-slate-800 text-white">
                                        <SelectItem value="minutes">Minutes</SelectItem>
                                        <SelectItem value="hours">Heures</SelectItem>
                                        <SelectItem value="days">Jours</SelectItem>
                                    </SelectContent>
                                </Select>
                            </FormItem>
                        )}
                    />
                </div>
            )}

            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Motif</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Test technique admin / Récompense" {...field} className="h-12 bg-slate-800/50 border-slate-700 rounded-xl text-white" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="pt-4">
              <Button 
                type="submit" 
                disabled={isSubmitting || isLoadingCourses}
                className={cn(
                    "w-full h-14 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl transition-all active:scale-[0.97]",
                    isTemporary ? "bg-amber-500 hover:bg-amber-600 text-black" : "bg-primary hover:bg-primary/90 text-primary-foreground"
                )}
              >
                {isSubmitting ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    {isTemporary ? <Clock className="mr-2 h-4 w-4" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                    {isTemporary ? "Activer l'accès test" : "Valider l'accès permanent"}
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
