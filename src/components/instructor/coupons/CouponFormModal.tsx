'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Ticket, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { createCouponAction } from '@/actions/couponActions';
import { useRole } from '@/context/RoleContext';
import type { Course } from '@/lib/types';

const formSchema = z.object({
  code: z.string().min(3).max(20).toUpperCase(),
  courseId: z.string().min(1, "Veuillez sélectionner un cours."),
  discountType: z.enum(['percentage', 'fixed']),
  discountValue: z.coerce.number().positive("La valeur doit être positive."),
  maxUses: z.coerce.number().int().positive("Minimum 1 utilisation."),
  expiresAt: z.string().min(1, "Date requise."),
});

export function CouponFormModal({ isOpen, onOpenChange, courses }: { isOpen: boolean, onOpenChange: (o: boolean) => void, courses: Course[] }) {
  const { currentUser } = useRole();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      code: '',
      courseId: '',
      discountType: 'percentage',
      discountValue: 10,
      maxUses: 100,
      expiresAt: '',
    }
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!currentUser) return;
    setIsLoading(true);

    const selectedCourse = courses.find(c => c.id === values.courseId);
    
    const result = await createCouponAction({
      ...values,
      courseTitle: selectedCourse?.title || 'Formation',
      expiresAt: new Date(values.expiresAt),
    }, currentUser.uid);

    if (result.success) {
      toast({ title: "Coupon créé avec succès !" });
      form.reset();
      onOpenChange(false);
    } else {
      toast({ variant: 'destructive', title: "Erreur", description: JSON.stringify(result.error) });
    }
    setIsLoading(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-slate-900 border-slate-800 rounded-[2rem] overflow-hidden">
        <DialogHeader className="p-8 pb-0">
          <DialogTitle className="text-2xl font-black text-white uppercase flex items-center gap-3">
            <Ticket className="text-primary" /> Nouveau Coupon
          </DialogTitle>
          <DialogDescription className="text-slate-400">Offrez une remise exclusive sur vos cours.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="p-8 space-y-6">
            <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="code" render={({ field }) => (
                    <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase text-slate-500">Code promo</FormLabel>
                        <FormControl><Input placeholder="EX: NDARA20" {...field} className="h-12 bg-slate-950 border-slate-800 rounded-xl" /></FormControl>
                        <FormMessage />
                    </FormItem>
                )}/>
                <FormField control={form.control} name="courseId" render={({ field }) => (
                    <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase text-slate-500">Cours cible</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger className="h-12 bg-slate-950 border-slate-800 rounded-xl"><SelectValue placeholder="Choisir" /></SelectTrigger></FormControl>
                            <SelectContent className="bg-slate-900 border-slate-800 text-white">
                                {courses.map(c => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                )}/>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="discountType" render={({ field }) => (
                    <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase text-slate-500">Type de remise</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger className="h-12 bg-slate-950 border-slate-800 rounded-xl"><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent className="bg-slate-900 border-slate-800 text-white">
                                <SelectItem value="percentage">Pourcentage (%)</SelectItem>
                                <SelectItem value="fixed">Montant Fixe (XOF)</SelectItem>
                            </SelectContent>
                        </Select>
                    </FormItem>
                )}/>
                <FormField control={form.control} name="discountValue" render={({ field }) => (
                    <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase text-slate-500">Valeur</FormLabel>
                        <FormControl><Input type="number" {...field} className="h-12 bg-slate-950 border-slate-800 rounded-xl font-bold" /></FormControl>
                        <FormMessage />
                    </FormItem>
                )}/>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="maxUses" render={({ field }) => (
                    <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase text-slate-500">Nombre d'utilisations</FormLabel>
                        <FormControl><Input type="number" {...field} className="h-12 bg-slate-950 border-slate-800 rounded-xl" /></FormControl>
                        <FormMessage />
                    </FormItem>
                )}/>
                <FormField control={form.control} name="expiresAt" render={({ field }) => (
                    <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase text-slate-500">Date d'expiration</FormLabel>
                        <FormControl><Input type="date" {...field} className="h-12 bg-slate-950 border-slate-800 rounded-xl" /></FormControl>
                        <FormMessage />
                    </FormItem>
                )}/>
            </div>

            <Button type="submit" disabled={isLoading} className="w-full h-14 rounded-2xl bg-primary hover:bg-primary/90 font-black uppercase text-xs tracking-widest shadow-xl">
                {isLoading ? <Loader2 className="animate-spin" /> : <><CheckCircle2 className="mr-2 h-4 w-4" /> Créer le coupon</>}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
