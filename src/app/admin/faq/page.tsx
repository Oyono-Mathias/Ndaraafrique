
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  getFirestore,
  collection,
  query,
  orderBy,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { useCollection, useMemoFirebase } from '@/firebase';
import { useIsMobile } from '@/hooks/use-mobile';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose,
} from '@/components/ui/sheet';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, Edit, Loader2, MessageCircleQuestion, ChevronUp, ChevronDown } from 'lucide-react';

interface FAQ {
  id: string;
  question_fr: string;
  answer_fr: string;
  tags: string[];
  order: number;
}

const faqSchema = z.object({
  question_fr: z.string().min(10, 'La question doit contenir au moins 10 caractères.'),
  answer_fr: z.string().min(20, 'La réponse doit contenir au moins 20 caractères.'),
  tags: z.string().min(3, 'Ajoutez au moins un tag. Séparez par des virgules.'),
});

type FaqFormValues = z.infer<typeof faqSchema>;

const FaqForm = ({ form, onSubmit, isSubmitting }: { form: any, onSubmit: (data: FaqFormValues) => void, isSubmitting: boolean }) => (
    <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField control={form.control} name="question_fr" render={({ field }) => (
                <FormItem><FormLabel className="dark:text-slate-300">Question</FormLabel><FormControl><Input placeholder="Comment puis-je..." {...field} className="dark:bg-slate-800 dark:border-slate-700" /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="answer_fr" render={({ field }) => (
                <FormItem><FormLabel className="dark:text-slate-300">Réponse</FormLabel><FormControl><Textarea placeholder="Pour ce faire, vous devez..." {...field} rows={6} className="dark:bg-slate-800 dark:border-slate-700" /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="tags" render={({ field }) => (
                <FormItem>
                    <FormLabel className="dark:text-slate-300">Tags (pour l'IA)</FormLabel>
                    <FormControl><Input placeholder="paiement, certificat, compte..." {...field} className="dark:bg-slate-800 dark:border-slate-700"/></FormControl>
                    <FormDescription className="dark:text-slate-500">Séparez les mots-clés par des virgules. Cela aide MATHIAS à trouver la bonne réponse.</FormDescription>
                    <FormMessage />
                </FormItem>
            )} />
            
            <div className="flex justify-end gap-2 pt-4">
                <SheetClose asChild><Button type="button" variant="ghost">Annuler</Button></SheetClose>
                <DialogClose asChild><Button type="button" variant="ghost">Annuler</Button></DialogClose>
                <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                    Sauvegarder
                </Button>
            </div>
        </form>
    </Form>
);


export default function AdminFaqPage() {
  const db = getFirestore();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingFaq, setEditingFaq] = useState<FAQ | null>(null);
  const [deleteAlertOpen, setDeleteAlertOpen] = useState(false);
  const [faqToDelete, setFaqToDelete] = useState<string | null>(null);

  const faqsQuery = useMemoFirebase(() => query(collection(db, 'faqs'), orderBy('order', 'asc')), [db]);
  const { data: faqs, isLoading } = useCollection<FAQ>(faqsQuery);
  
  const form = useForm<FaqFormValues>({
    resolver: zodResolver(faqSchema),
    defaultValues: {
      question_fr: '',
      answer_fr: '',
      tags: '',
    },
  });
  
  useEffect(() => {
    if (editingFaq) {
      form.reset({
        question_fr: editingFaq.question_fr,
        answer_fr: editingFaq.answer_fr,
        tags: editingFaq.tags?.join(', ') || '',
      });
      setIsFormOpen(true);
    } else {
      form.reset({ question_fr: '', answer_fr: '', tags: '' });
    }
  }, [editingFaq, form]);

  const handleOpenForm = (faq: FAQ | null = null) => {
    setEditingFaq(faq);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingFaq(null);
  };

  const onSubmit = async (data: FaqFormValues) => {
    setIsSubmitting(true);
    const tagsArray = data.tags.split(',').map(tag => tag.trim().toLowerCase()).filter(Boolean);
    
    try {
        if (editingFaq) {
            // Update existing FAQ
            const faqRef = doc(db, 'faqs', editingFaq.id);
            await updateDoc(faqRef, { ...data, tags: tagsArray, updatedAt: serverTimestamp() });
            toast({ title: 'FAQ mise à jour !' });
        } else {
            // Create new FAQ
            const faqCollection = collection(db, 'faqs');
            await addDoc(faqCollection, { 
                ...data, 
                tags: tagsArray, 
                order: faqs?.length || 0, // Set order to the end of the list
                createdAt: serverTimestamp() 
            });
            toast({ title: 'Nouvelle FAQ ajoutée !' });
        }
        handleCloseForm();
    } catch (error) {
        console.error("Error saving FAQ:", error);
        toast({ variant: 'destructive', title: "Erreur", description: 'Impossible de sauvegarder la FAQ.' });
    } finally {
        setIsSubmitting(false);
    }
  };

  const openDeleteDialog = (id: string) => {
    setFaqToDelete(id);
    setDeleteAlertOpen(true);
  };

  const handleDelete = async () => {
    if (!faqToDelete) return;
    try {
        await deleteDoc(doc(db, 'faqs', faqToDelete));
        toast({ title: 'FAQ supprimée avec succès.' });
    } catch (error) {
        console.error("Error deleting FAQ:", error);
        toast({ variant: 'destructive', title: "Erreur", description: 'Impossible de supprimer la FAQ.' });
    } finally {
        setDeleteAlertOpen(false);
        setFaqToDelete(null);
    }
  };

  const handleMove = async (currentIndex: number, direction: 'up' | 'down') => {
    if (!faqs) return;
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

    if (targetIndex < 0 || targetIndex >= faqs.length) return;

    const currentFaq = faqs[currentIndex];
    const targetFaq = faqs[targetIndex];

    const batch = writeBatch(db);
    const currentFaqRef = doc(db, 'faqs', currentFaq.id);
    const targetFaqRef = doc(db, 'faqs', targetFaq.id);

    // Swap order values
    batch.update(currentFaqRef, { order: targetFaq.order });
    batch.update(targetFaqRef, { order: currentFaq.order });

    try {
        await batch.commit();
        toast({ title: 'Ordre mis à jour !'});
    } catch (error) {
        console.error("Error reordering FAQs:", error);
        toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de réorganiser les questions.' });
    }
  };
  
  const FormWrapper = isMobile ? Sheet : Dialog;
  const FormContent = isMobile ? SheetContent : DialogContent;
  const FormHeader = isMobile ? SheetHeader : DialogHeader;
  const FormTitle = isMobile ? SheetTitle : DialogTitle;
  const FormDescription = isMobile ? SheetDescription : DialogDescription;
  
  return (
    <>
      <div className="space-y-6">
        <header className="flex items-center justify-between">
            <div>
                <h1 className="text-3xl font-bold dark:text-white">Gestion de la FAQ</h1>
                <p className="text-muted-foreground dark:text-slate-400">Ajoutez, modifiez et réorganisez les questions fréquentes.</p>
            </div>
            <Button onClick={() => handleOpenForm()}>
                <Plus className="mr-2 h-4 w-4"/>
                Ajouter une question
            </Button>
        </header>
        
        <Card className="dark:bg-slate-800 dark:border-slate-700">
            <CardHeader><CardTitle className="dark:text-white">Base de Connaissances</CardTitle></CardHeader>
            <CardContent className="space-y-4">
                {isLoading ? (
                    [...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 w-full dark:bg-slate-700" />)
                ) : faqs && faqs.length > 0 ? (
                    faqs.map((faq, index) => (
                        <Card key={faq.id} className="dark:bg-slate-900/50 dark:border-slate-700">
                            <CardHeader className="flex flex-row items-start justify-between">
                                <CardTitle className="text-base dark:text-slate-200">{faq.question_fr}</CardTitle>
                                <div className="flex items-center gap-1">
                                     <Button variant="ghost" size="icon" onClick={() => handleMove(index, 'up')} disabled={index === 0}><ChevronUp className="h-4 w-4"/></Button>
                                     <Button variant="ghost" size="icon" onClick={() => handleMove(index, 'down')} disabled={index === faqs.length - 1}><ChevronDown className="h-4 w-4"/></Button>
                                     <Button variant="ghost" size="icon" onClick={() => handleOpenForm(faq)}><Edit className="h-4 w-4 text-blue-500"/></Button>
                                     <Button variant="ghost" size="icon" onClick={() => openDeleteDialog(faq.id)}><Trash2 className="h-4 w-4 text-destructive"/></Button>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground dark:text-slate-400">{faq.answer_fr}</p>
                                {faq.tags && (
                                    <div className="flex gap-2 mt-4">
                                        {faq.tags.map(tag => <Badge key={tag} variant="secondary" className="dark:bg-slate-700 dark:text-slate-300">{tag}</Badge>)}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))
                ) : (
                    <div className="text-center py-16 border-2 border-dashed rounded-lg dark:border-slate-700">
                        <MessageCircleQuestion className="mx-auto h-12 w-12 text-slate-400"/>
                        <h3 className="mt-4 font-medium text-lg">Aucune question dans la FAQ</h3>
                        <p className="text-sm text-muted-foreground">Commencez par ajouter une nouvelle question.</p>
                    </div>
                )}
            </CardContent>
        </Card>

      </div>

      <FormWrapper open={isFormOpen} onOpenChange={setIsFormOpen}>
        <FormContent className="dark:bg-slate-900 dark:border-slate-800">
            <FormHeader>
                <FormTitle className="dark:text-white">{editingFaq ? 'Modifier la question' : 'Ajouter une question'}</FormTitle>
            </FormHeader>
            <FaqForm form={form} onSubmit={onSubmit} isSubmitting={isSubmitting} />
        </FormContent>
      </FormWrapper>
      
      <AlertDialog open={deleteAlertOpen} onOpenChange={setDeleteAlertOpen}>
          <AlertDialogContent>
              <AlertDialogHeader>
                  <AlertDialogTitle>Confirmer la suppression ?</AlertDialogTitle>
                  <AlertDialogDescription>
                      Cette action est irréversible et supprimera définitivement cette question de la FAQ.
                  </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
                      Supprimer
                  </AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

    