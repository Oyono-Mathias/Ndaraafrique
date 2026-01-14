
'use client';

import { useRole } from '@/context/RoleContext';
import { useCollection, useMemoFirebase, useIsMobile } from '@/firebase';
import { getFirestore, collection, query, where, orderBy, getDocs, doc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { AlertCircle, MessageSquare, CheckCircle, Clock, PlusCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import React, { useMemo, useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/hooks/use-toast';
import type { Course, Enrollment } from '@/lib/types';
import { useRouter } from 'next/navigation';


interface SupportTicket {
    id: string;
    subject: string;
    lastMessage: string;
    status: 'ouvert' | 'fermé';
    updatedAt: any; // Firestore Timestamp
    courseId: string;
    courseTitle?: string;
}

const ticketCreationSchema = z.object({
    courseId: z.string().min(1, { message: "Veuillez sélectionner un cours." }),
    subject: z.string().min(10, { message: "Le sujet doit contenir au moins 10 caractères." }),
    message: z.string().min(20, { message: "Votre question doit contenir au moins 20 caractères." }),
});

type TicketCreationValues = z.infer<typeof ticketCreationSchema>;

const TicketStatusBadge = ({ status, fullText = false }: { status: SupportTicket['status'], fullText?: boolean }) => {
    const { t } = useTranslation();
    if (status === 'ouvert') {
        return (
            <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/50 dark:text-amber-300 dark:border-amber-700">
                <Clock className="h-3 w-3 mr-1.5"/>
                {fullText ? t('ticket_status_open') : t('open')}
            </Badge>
        );
    }
    return (
        <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200 dark:bg-green-900/50 dark:text-green-300 dark:border-green-700">
             <CheckCircle className="h-3 w-3 mr-1.5"/>
             {fullText ? t('ticket_status_closed') : t('closed')}
        </Badge>
    );
};

const TicketCard = ({ ticket }: { ticket: SupportTicket }) => (
    <Link href={`/questions-reponses/${ticket.id}`} className="block">
        <Card className="hover:bg-slate-800/50 transition-colors dark:bg-slate-800 dark:border-slate-700">
            <CardContent className="p-4 space-y-2">
                <div className="flex justify-between items-start">
                    <p className="font-bold text-sm text-white line-clamp-2 pr-4">{ticket.subject}</p>
                    <TicketStatusBadge status={ticket.status} />
                </div>
                <p className="text-xs text-slate-400 line-clamp-1 italic">"{ticket.lastMessage}"</p>
                <p className="text-xs text-slate-500 pt-2 border-t border-slate-800">
                   Dernière activité: {ticket.updatedAt ? formatDistanceToNow(ticket.updatedAt.toDate(), { addSuffix: true, locale: fr }) : 'N/A'}
                </p>
            </CardContent>
        </Card>
    </Link>
);

const NewTicketForm = ({ enrolledCourses, onSubmit, isSubmitting }: { enrolledCourses: Course[], onSubmit: (values: TicketCreationValues) => void, isSubmitting: boolean }) => {
    const { t } = useTranslation();
    const form = useForm<TicketCreationValues>({
        resolver: zodResolver(ticketCreationSchema),
        defaultValues: { subject: '', message: '', courseId: ''},
    });

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                <FormField
                    control={form.control}
                    name="courseId"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="dark:text-slate-300">Formation concernée</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                    <SelectTrigger className="dark:bg-slate-800 dark:border-slate-700">
                                        <SelectValue placeholder="Sélectionnez le cours..." />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent className="dark:bg-slate-900 dark:border-slate-700">
                                    {enrolledCourses.map(course => (
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
                    name="subject"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="dark:text-slate-300">Sujet de votre question</FormLabel>
                            <FormControl>
                                <Input placeholder="Ex: Problème avec la leçon 5" {...field} className="dark:bg-slate-800 dark:border-slate-700"/>
                            </FormControl>
                             <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="message"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="dark:text-slate-300">Votre question en détail</FormLabel>
                            <FormControl>
                                <Textarea placeholder="Bonjour, je rencontre un problème avec..." rows={5} {...field} className="dark:bg-slate-800 dark:border-slate-700"/>
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                 <DialogFooter className="pt-4">
                    <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Envoyer la question
                    </Button>
                </DialogFooter>
            </form>
        </Form>
    )
}

export default function QAPage() {
    const { formaAfriqueUser, isUserLoading } = useRole();
    const db = getFirestore();
    const { t } = useTranslation();
    const router = useRouter();
    const { toast } = useToast();
    const isMobile = useIsMobile();
    const [activeTab, setActiveTab] = useState('ouvert');
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [enrolledCourses, setEnrolledCourses] = useState<Course[]>([]);

    const ticketsQuery = useMemoFirebase(
        () => {
            if (!formaAfriqueUser?.uid) return null;
            
            // This is the key change: Querying for tickets where the user is a participant.
            const fieldToFilter = formaAfriqueUser.role === 'instructor' ? 'instructorId' : 'userId';

            return query(
                collection(db, 'support_tickets'),
                where(fieldToFilter, '==', formaAfriqueUser.uid),
                orderBy('updatedAt', 'desc')
            )
        },
        [db, formaAfriqueUser]
    );

    const { data: tickets, isLoading: ticketsLoading, error } = useCollection<SupportTicket>(ticketsQuery);
    const isLoading = isUserLoading || ticketsLoading;

    const filteredTickets = useMemo(() => {
        if (!tickets) return [];
        return tickets.filter(ticket => ticket.status === activeTab);
    }, [tickets, activeTab]);

    useEffect(() => {
        if (isFormOpen && formaAfriqueUser?.uid && enrolledCourses.length === 0) {
            const fetchEnrolledCourses = async () => {
                const enrollmentsQuery = query(collection(db, 'enrollments'), where('studentId', '==', formaAfriqueUser.uid));
                const enrollmentsSnap = await getDocs(enrollmentsQuery);
                const courseIds = enrollmentsSnap.docs.map(doc => doc.data().courseId);

                if (courseIds.length > 0) {
                    const coursesQuery = query(collection(db, 'courses'), where('__name__', 'in', courseIds.slice(0, 30)));
                    const coursesSnap = await getDocs(coursesQuery);
                    setEnrolledCourses(coursesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course)));
                }
            };
            fetchEnrolledCourses();
        }
    }, [isFormOpen, formaAfriqueUser, db, enrolledCourses.length]);
    
    const handleCreateTicket = async (values: TicketCreationValues) => {
        if (!formaAfriqueUser) return;
        setIsSubmitting(true);

        try {
            const courseDoc = await getDoc(doc(db, 'courses', values.courseId));
            if (!courseDoc.exists()) throw new Error("Le cours sélectionné n'existe pas.");
            const courseData = courseDoc.data();

            const ticketsCollection = collection(db, 'support_tickets');
            const newTicketRef = doc(ticketsCollection);
            
            const batch = writeBatch(db);

            const ticketPayload = {
                userId: formaAfriqueUser.uid,
                instructorId: courseData.instructorId,
                courseId: values.courseId,
                subject: values.subject,
                status: 'ouvert',
                category: 'Pédagogique',
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                lastMessage: values.message,
            };
            batch.set(newTicketRef, ticketPayload);
            
            const messagePayload = {
                senderId: formaAfriqueUser.uid,
                text: values.message,
                createdAt: serverTimestamp(),
            };
            batch.set(doc(collection(newTicketRef, 'messages')), messagePayload);

            await batch.commit();
            toast({ title: "Question envoyée !", description: "Vous recevrez bientôt une réponse de votre instructeur." });
            setIsFormOpen(false);
            router.push(`/questions-reponses/${newTicketRef.id}`);

        } catch (error) {
            console.error("Error creating ticket:", error);
            toast({ variant: 'destructive', title: "Erreur", description: "Impossible d'envoyer votre question." });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const FormWrapper = isMobile ? Sheet : Dialog;
    const FormContent = isMobile ? SheetContent : DialogContent;
    const FormHeader = isMobile ? SheetHeader : DialogHeader;
    const FormTitle = isMobile ? SheetTitle : DialogTitle;
    const FormDescription = isMobile ? SheetDescription : DialogDescription;


    return (
        <div className={`space-y-8`}>
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{t('navQA')}</h1>
                    <p className="text-muted-foreground dark:text-slate-400">
                        {formaAfriqueUser?.role === 'instructor' 
                            ? t('qa_desc_instructor')
                            : t('qa_desc_student')
                        }
                    </p>
                </div>
                 {formaAfriqueUser?.role !== 'instructor' && (
                    <FormWrapper open={isFormOpen} onOpenChange={setIsFormOpen}>
                        <SheetTrigger asChild>
                            <Button>
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Poser une question
                            </Button>
                        </SheetTrigger>
                        <FormContent side={isMobile ? "bottom" : "right"} className="dark:bg-slate-900 dark:border-slate-800">
                            <FormHeader>
                                <FormTitle className="dark:text-white">Nouvelle question</FormTitle>
                                <FormDescription className="dark:text-slate-400">
                                    Sélectionnez le cours concerné et décrivez votre problème.
                                </FormDescription>
                            </FormHeader>
                             <NewTicketForm 
                                enrolledCourses={enrolledCourses}
                                onSubmit={handleCreateTicket}
                                isSubmitting={isSubmitting}
                             />
                        </FormContent>
                    </FormWrapper>
                 )}
            </header>
            
            {error && (
                <div className="p-4 bg-destructive/10 text-destructive border border-destructive/50 rounded-lg flex items-center gap-3">
                    <AlertCircle className="h-5 w-5" />
                    <p>
                        Une erreur est survenue lors du chargement des questions. 
                        Si le problème persiste, un index Firestore est peut-être manquant.
                    </p>
                </div>
            )}

            <Card className="bg-card shadow-sm dark:bg-slate-800 dark:border-slate-700">
                <CardHeader>
                    <Tabs value={activeTab} onValueChange={setActiveTab}>
                        <TabsList className="grid w-full grid-cols-2 max-w-sm dark:bg-slate-700/50 dark:border-slate-600">
                            <TabsTrigger value="ouvert">{t('openTickets')}</TabsTrigger>
                            <TabsTrigger value="fermé">{t('closedTickets')}</TabsTrigger>
                        </TabsList>
                    </Tabs>
                </CardHeader>
                <CardContent>
                    {/* --- Mobile Card View --- */}
                    <div className="md:hidden space-y-4">
                        {isLoading ? (
                            [...Array(3)].map((_, i) => <Skeleton key={i} className="h-28 w-full bg-slate-700" />)
                        ) : filteredTickets.length > 0 ? (
                            filteredTickets.map(ticket => <TicketCard key={ticket.id} ticket={ticket} />)
                        ) : (
                            <div className="h-48 text-center flex items-center justify-center">
                                <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground dark:text-slate-400">
                                    <MessageSquare className="h-10 w-10" />
                                    <span className="font-medium">{t('no_tickets_in_category')}</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* --- Desktop Table View --- */}
                    <div className="hidden md:block">
                        <Table>
                            <TableHeader>
                                <TableRow className="dark:border-slate-700">
                                    <TableHead className="dark:text-slate-400">{t('subject')}</TableHead>
                                    <TableHead className="dark:text-slate-400">{t('status')}</TableHead>
                                    <TableHead className="dark:text-slate-400">{t('last_activity')}</TableHead>
                                    <TableHead className="text-right dark:text-slate-400">{t('action')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    [...Array(3)].map((_, i) => (
                                        <TableRow key={i} className="dark:border-slate-700">
                                            <TableCell><Skeleton className="h-5 w-48 bg-slate-700" /></TableCell>
                                            <TableCell><Skeleton className="h-6 w-20 rounded-full bg-slate-700" /></TableCell>
                                            <TableCell><Skeleton className="h-5 w-24 bg-slate-700" /></TableCell>
                                            <TableCell className="text-right"><Skeleton className="h-8 w-20 bg-slate-700" /></TableCell>
                                        </TableRow>
                                    ))
                                ) : filteredTickets.length > 0 ? (
                                    filteredTickets.map((ticket) => (
                                        <TableRow key={ticket.id} className="hover:bg-muted/50 dark:hover:bg-slate-700/50 dark:border-slate-700">
                                            <TableCell className="font-medium dark:text-slate-200">{ticket.subject}</TableCell>
                                            <TableCell><TicketStatusBadge status={ticket.status} fullText={true} /></TableCell>
                                            <TableCell className="text-muted-foreground text-sm dark:text-slate-400">
                                                {ticket.updatedAt ? formatDistanceToNow(ticket.updatedAt.toDate(), { addSuffix: true, locale: fr }) : 'N/A'}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="outline" size="sm" asChild className="dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-600">
                                                    <Link href={`/questions-reponses/${ticket.id}`}>{t('view')}</Link>
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow className="dark:border-slate-700">
                                        <TableCell colSpan={4} className="h-32 text-center">
                                            <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground dark:text-slate-400">
                                                <MessageSquare className="h-10 w-10" />
                                                <span className="font-medium">{t('no_tickets_in_category')}</span>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
