
'use client';

import { useState, useEffect, useMemo } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Eye, CheckCircle, XCircle, Clock, ShieldAlert, Loader2, Video, PlayCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import { useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, getDocs, getFirestore, query, serverTimestamp, updateDoc, where, orderBy } from 'firebase/firestore';
import type { Course, NdaraUser, Section, Lecture } from '@/lib/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { moderateCourse } from '@/actions/supportActions';
import { useRole } from '@/context/RoleContext';


// --- REFUSAL MODAL COMPONENT ---
const RefusalModal = ({ course, onConfirm, isSubmitting }: { course: Course, onConfirm: (reason: string) => void, isSubmitting: boolean }) => {
    const [reason, setReason] = useState('');

    const handleConfirm = () => {
        if (reason.trim().length < 10) return;
        onConfirm(reason);
    }
    
    return (
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Refuser le cours : "{course.title}" ?</DialogTitle>
                <DialogDescription>
                    Veuillez fournir une raison claire et constructive pour le refus. L'instructeur sera notifié.
                </DialogDescription>
            </DialogHeader>
            <div className="py-4">
                <Textarea
                    placeholder="Ex: Le contenu de la leçon 3 n'est pas assez approfondi..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={5}
                />
                 {reason.trim().length < 10 && <p className="text-xs text-destructive mt-2">La raison doit contenir au moins 10 caractères.</p>}
            </div>
            <DialogFooter>
                <DialogClose asChild>
                    <Button type="button" variant="ghost">Annuler</Button>
                </DialogClose>
                <Button type="button" variant="destructive" onClick={handleConfirm} disabled={isSubmitting || reason.trim().length < 10}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                    Confirmer le refus
                </Button>
            </DialogFooter>
        </DialogContent>
    );
};


// --- PREVIEW MODAL COMPONENT ---
const CoursePreviewModal = ({ course, onClose }: { course: Course | null, onClose: () => void }) => {
    const db = getFirestore();
    const sectionsQuery = useMemoFirebase(() => course ? query(collection(db, `courses/${course.id}/sections`), orderBy('order')) : null, [course, db]);
    const { data: sections, isLoading: sectionsLoading } = useCollection<Section>(sectionsQuery);
    const [lecturesMap, setLecturesMap] = useState<Map<string, Lecture[]>>(new Map());
    const [lecturesLoading, setLecturesLoading] = useState(true);

    useEffect(() => {
        if (sections && !sectionsLoading) {
            const fetchLectures = async () => {
                setLecturesLoading(true);
                const lecturesPromises = sections.map(section => 
                    getDocs(query(collection(db, `courses/${course!.id}/sections/${section.id}/lectures`), orderBy('title')))
                );
                const lecturesSnapshots = await Promise.all(lecturesPromises);
                const newLecturesMap = new Map<string, Lecture[]>();
                sections.forEach((section, index) => {
                    newLecturesMap.set(section.id, lecturesSnapshots[index].docs.map(d => d.data() as Lecture));
                });
                setLecturesMap(newLecturesMap);
                setLecturesLoading(false);
            };
            fetchLectures();
        } else if (!sectionsLoading) {
            setLecturesLoading(false);
        }
    }, [sections, sectionsLoading, db, course]);

    const isLoading = sectionsLoading || lecturesLoading;
    
    return (
        <Dialog open={!!course} onOpenChange={(isOpen) => !isOpen && onClose()}>
            <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col dark:bg-slate-900 dark:border-slate-800">
                <DialogHeader>
                    <DialogTitle className="dark:text-white">Aperçu du cours : {course?.title}</DialogTitle>
                </DialogHeader>
                <ScrollArea className="flex-1 -mx-6 px-6">
                    <div className="space-y-6 pb-6">
                        <div>
                            <h3 className="font-semibold dark:text-slate-200">Description</h3>
                            <p className="text-sm text-muted-foreground mt-1">{course?.description}</p>
                        </div>
                        <div>
                            <h3 className="font-semibold mb-2 dark:text-slate-200">Programme du cours</h3>
                            {isLoading ? (
                                <div className="space-y-2">
                                    <Skeleton className="h-12 w-full" />
                                    <Skeleton className="h-12 w-full" />
                                </div>
                            ) : sections && sections.length > 0 ? (
                                <Accordion type="multiple" defaultValue={sections.map(s => s.id)} className="space-y-2">
                                    {sections.map(section => (
                                        <AccordionItem key={section.id} value={section.id} className="dark:bg-slate-800/50 rounded-lg border dark:border-slate-700">
                                            <AccordionTrigger className="px-4 text-sm font-semibold dark:text-slate-300 hover:no-underline">{section.title}</AccordionTrigger>
                                            <AccordionContent className="border-t dark:border-slate-700">
                                                <ul className="divide-y dark:divide-slate-700">
                                                    {(lecturesMap.get(section.id) || []).map(lecture => (
                                                        <li key={lecture.id} className="flex items-center justify-between p-3">
                                                            <div className="flex items-center gap-2">
                                                                <Video className="h-4 w-4 text-muted-foreground" />
                                                                <span className="text-sm dark:text-slate-300">{lecture.title}</span>
                                                            </div>
                                                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                                {lecture.isFreePreview && <Badge variant="outline" className="text-primary border-primary">Aperçu</Badge>}
                                                                <span>{lecture.duration} min</span>
                                                            </div>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </AccordionContent>
                                        </AccordionItem>
                                    ))}
                                </Accordion>
                            ) : (
                                <p className="text-sm text-muted-foreground text-center py-4">Aucun programme n'a été ajouté à ce cours.</p>
                            )}
                        </div>
                    </div>
                </ScrollArea>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Fermer</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};


export default function AdminModerationPage() {
  const [coursesForReview, setCoursesForReview] = useState<Course[]>([]);
  const [instructors, setInstructors] = useState<Map<string, NdaraUser>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [submittingAction, setSubmittingAction] = useState<{ id: string, action: 'approve' | 'refuse' } | null>(null);
  const [previewCourse, setPreviewCourse] = useState<Course | null>(null);
  const { currentUser } = useRole();

  const { toast } = useToast();
  const { t } = useTranslation();
  const db = getFirestore();

  const coursesQuery = useMemoFirebase(
    () => query(collection(db, 'courses'), where('status', '==', 'Pending Review'), orderBy('createdAt', 'desc')),
    [db]
  );
  const { data: courses, isLoading: coursesLoading } = useCollection<Course>(coursesQuery);

  useEffect(() => {
    if (coursesLoading) {
      setIsLoading(true);
      return;
    }
    if (!courses) {
        setCoursesForReview([]);
        setIsLoading(false);
        return;
    }

    setCoursesForReview(courses);

    const fetchInstructors = async () => {
        const instructorIds = [...new Set(courses.map(c => c.instructorId).filter(Boolean))];
        if (instructorIds.length === 0) return;

        const newIdsToFetch = instructorIds.filter(id => !instructors.has(id));
        if (newIdsToFetch.length === 0) {
            setIsLoading(false);
            return;
        };

        try {
            const usersQuery = query(collection(db, 'users'), where('uid', 'in', newIdsToFetch.slice(0, 30)));
            const usersSnap = await getDocs(usersQuery);
            
            const newInstructors = new Map(instructors);
            usersSnap.forEach(doc => newInstructors.set(doc.data().uid, doc.data() as NdaraUser));
            setInstructors(newInstructors);
        } catch (error) {
            console.error("Error fetching instructors for moderation:", error);
        } finally {
            setIsLoading(false);
        }
    };

    fetchInstructors();

  }, [courses, coursesLoading, db, instructors]);

  const handleApprove = async (courseId: string) => {
    if (!currentUser) return;
    setSubmittingAction({ id: courseId, action: 'approve' });
    const result = await moderateCourse(courseId, 'approve', currentUser.uid);
    if (result.success) {
        toast({ title: "Cours approuvé", description: "Le cours est maintenant publié et visible par tous." });
    } else {
        toast({ variant: 'destructive', title: "Erreur", description: result.error || "Impossible d'approuver le cours." });
    }
    setSubmittingAction(null);
  };

  const handleRefuse = async (courseId: string, reason: string) => {
    if (!currentUser) return;
    setSubmittingAction({ id: courseId, action: 'refuse' });
    const result = await moderateCourse(courseId, 'reject', currentUser.uid, reason);
    if (result.success) {
      toast({ title: "Cours refusé", description: "L'instructeur a été notifié de la décision.", variant: 'default' });
    } else {
      toast({ variant: 'destructive', title: "Erreur", description: result.error || "Impossible de refuser le cours." });
    }
    setSubmittingAction(null);
  };

  return (
    <>
        <div className="space-y-6">
        <header>
            <h1 className="text-3xl font-bold dark:text-white">Modération</h1>
            <p className="text-muted-foreground dark:text-slate-400">Validez les cours soumis par les instructeurs avant leur publication.</p>
        </header>

        <Card className="dark:bg-slate-800 dark:border-slate-700">
            <CardHeader>
            <CardTitle className="dark:text-white">Cours en attente de révision</CardTitle>
            <CardDescription className="dark:text-slate-400">
                Examinez chaque cours attentivement avant de prendre une décision.
            </CardDescription>
            </CardHeader>
            <CardContent>
            <div className="overflow-x-auto">
                <Table>
                <TableHeader>
                    <TableRow className="dark:hover:bg-slate-700/50 dark:border-slate-700">
                    <TableHead className="dark:text-slate-400">Titre du cours</TableHead>
                    <TableHead className="hidden md:table-cell dark:text-slate-400">Instructeur</TableHead>
                    <TableHead className="hidden lg:table-cell dark:text-slate-400">Soumission</TableHead>
                    <TableHead className="text-center dark:text-slate-400">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {isLoading ? (
                    [...Array(3)].map((_, i) => (
                        <TableRow key={i} className="dark:border-slate-700">
                        <TableCell><Skeleton className="h-5 w-48 dark:bg-slate-700" /></TableCell>
                        <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-24 dark:bg-slate-700" /></TableCell>
                        <TableCell className="hidden lg:table-cell"><Skeleton className="h-5 w-28 dark:bg-slate-700" /></TableCell>
                        <TableCell className="text-right"><div className="flex justify-center gap-2"><Skeleton className="h-8 w-24 dark:bg-slate-700" /><Skeleton className="h-8 w-24 dark:bg-slate-700" /><Skeleton className="h-8 w-24 dark:bg-slate-700" /></div></TableCell>
                        </TableRow>
                    ))
                    ) : coursesForReview && coursesForReview.length > 0 ? (
                    coursesForReview.map((course) => (
                        <TableRow key={course.id} className="dark:hover:bg-slate-700/50 dark:border-slate-700">
                        <TableCell className="font-medium">
                            <div className="flex flex-col">
                                <span className="dark:text-slate-100">{course.title}</span>
                                <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 w-fit mt-1 lg:hidden">
                                    <Clock className="mr-1.5 h-3 w-3"/>
                                    En révision
                                </Badge>
                            </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground hidden md:table-cell dark:text-slate-400">
                            {instructors.get(course.instructorId)?.fullName || 'Chargement...'}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-muted-foreground dark:text-slate-400">
                            {course.createdAt ? formatDistanceToNow(course.createdAt.toDate(), { addSuffix: true, locale: fr }) : 'N/A'}
                        </TableCell>
                        <TableCell className="text-center">
                            <div className="flex justify-center gap-2">
                                <Button variant="outline" size="sm" className="dark:bg-slate-700 dark:border-slate-600 dark:hover:bg-slate-600" onClick={() => setPreviewCourse(course)}>
                                <Eye className="mr-2 h-4 w-4"/> Aperçu
                                </Button>
                                <Dialog>
                                    <DialogTrigger asChild>
                                        <Button variant="destructive" size="sm" disabled={submittingAction?.id === course.id}>
                                            {submittingAction?.id === course.id && submittingAction.action === 'refuse' ? <Loader2 className="h-4 w-4 animate-spin"/> : <XCircle className="mr-2 h-4 w-4"/>} Refuser
                                        </Button>
                                    </DialogTrigger>
                                    <RefusalModal course={course} onConfirm={(reason) => handleRefuse(course.id, reason)} isSubmitting={submittingAction?.action === 'refuse'} />
                                </Dialog>
                                <Button onClick={() => handleApprove(course.id)} size="sm" variant="default" className="bg-green-600 hover:bg-green-700" disabled={submittingAction?.id === course.id}>
                                    {submittingAction?.id === course.id && submittingAction.action === 'approve' ? <Loader2 className="h-4 w-4 animate-spin"/> : <CheckCircle className="mr-2 h-4 w-4"/>} Approuver
                                </Button>
                            </div>
                        </TableCell>
                        </TableRow>
                    ))
                    ) : (
                    <TableRow className="dark:border-slate-700">
                        <TableCell colSpan={4} className="h-48 text-center">
                        <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground dark:text-slate-400">
                            <ShieldAlert className="h-12 w-12" />
                            <p className="font-medium">Aucun cours en attente</p>
                            <p className="text-sm">Toutes les soumissions ont été traitées.</p>
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
        <CoursePreviewModal course={previewCourse} onClose={() => setPreviewCourse(null)} />
    </>
  );
}
