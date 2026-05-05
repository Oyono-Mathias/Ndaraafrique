'use client';

/**
 * @fileOverview Modal Super-Admin de modification d'identité utilisateur.
 * ✅ SÉCURITÉ : Double validation pour le changement d'email.
 */

import { useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRole } from '@/context/RoleContext';
import { useToast } from '@/hooks/use-toast';
import { updateUserIdentityAction } from '@/actions/adminActions';
import type { NdaraUser } from '@/lib/types';

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
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, UserCog, Mail, ShieldAlert, CheckCircle2 } from 'lucide-react';

const editSchema = z.object({
  fullName: z.string().min(2, "Nom trop court."),
  username: z.string().min(3, "Pseudo trop court."),
  email: z.string().email("Email invalide."),
  password: z.string().min(6, "Le mot de passe doit faire 6 caract. min.").optional().or(z.literal('')),
});

export function EditAccountModal({ isOpen, onOpenChange, user }: { isOpen: boolean; onOpenChange: (o: boolean) => void; user: NdaraUser; }) {
    const { currentUser: admin } = useRole();
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();

    const form = useForm<z.infer<typeof editSchema>>({
        resolver: zodResolver(editSchema),
        defaultValues: {
            fullName: user.fullName || '',
            username: user.username || '',
            email: user.email || '',
            password: '',
        }
    });

    const onSubmit = (values: z.infer<typeof editSchema>) => {
        if (!admin) return;
        
        startTransition(async () => {
            const result = await updateUserIdentityAction({
                adminId: admin.uid,
                targetUserId: user.uid,
                data: values
            });

            if (result.success) {
                toast({ title: "Compte mis à jour", description: "Les identifiants Auth et Firestore sont synchronisés." });
                onOpenChange(false);
            } else {
                toast({ variant: 'destructive', title: "Échec", description: result.error });
            }
        });
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md bg-slate-900 border-slate-800 p-0 overflow-hidden rounded-[2.5rem]">
                <DialogHeader className="p-8 pb-4 border-b border-white/5 bg-slate-800/30">
                    <DialogTitle className="flex items-center gap-3 text-white uppercase font-black tracking-tight">
                        <UserCog className="text-amber-500" /> Modifier le compte
                    </DialogTitle>
                    <DialogDescription className="text-slate-400">
                        Synchronisation Firebase Auth & Firestore.
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="p-8 space-y-6">
                        <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl flex items-start gap-3">
                            <ShieldAlert className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                            <p className="text-[10px] font-bold text-amber-200/80 uppercase leading-relaxed">
                                Action critique : La modification de l'email impacte immédiatement la connexion de l'utilisateur.
                            </p>
                        </div>

                        <FormField control={form.control} name="fullName" render={({ field }) => (
                            <FormItem><FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Nom Complet</FormLabel>
                                <FormControl><Input {...field} className="h-12 bg-slate-950 border-slate-800 rounded-xl" /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}/>

                        <FormField control={form.control} name="username" render={({ field }) => (
                            <FormItem><FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Pseudo</FormLabel>
                                <FormControl><Input {...field} className="h-12 bg-slate-950 border-slate-800 rounded-xl" /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}/>

                        <FormField control={form.control} name="email" render={({ field }) => (
                            <FormItem><FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">E-mail (Login)</FormLabel>
                                <FormControl><div className="relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600"/><Input {...field} className="h-12 pl-10 bg-slate-950 border-slate-800 rounded-xl" /></div></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}/>

                        <FormField control={form.control} name="password" render={({ field }) => (
                            <FormItem><FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Nouveau Mot de passe (Optionnel)</FormLabel>
                                <FormControl><Input {...field} type="password" placeholder="Laisser vide pour ne pas changer" className="h-12 bg-slate-950 border-slate-800 rounded-xl" /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}/>

                        <DialogFooter className="pt-4">
                            <Button type="submit" disabled={isPending} className="w-full h-14 rounded-2xl bg-primary text-slate-950 font-black uppercase text-xs tracking-widest shadow-xl">
                                {isPending ? <Loader2 className="animate-spin" /> : <><CheckCircle2 className="mr-2 h-4 w-4" /> Sauvegarder les identifiants</>}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
