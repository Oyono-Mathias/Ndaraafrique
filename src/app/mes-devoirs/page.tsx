

'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useRole } from '@/context/RoleContext';
import { useCollection, useMemoFirebase } from '@/firebase';
import { getFirestore, collection, query, where, getDocs, getDoc, doc, setDoc, serverTimestamp, updateDoc, Timestamp } from 'firebase/firestore';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';

import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ClipboardList, CheckCircle, Clock, Edit, UploadCloud, File, X, Download } from 'lucide-react';
import { format, isPast } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { Course, Enrollment, Assignment, Submission } from '@/lib/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { useTranslations } from 'next-intl';


interface StudentAssignment {
    id: string; // combination of courseId and assignmentId
    assignmentId: string;
    title: string;
    description?: string;
    courseId: string;
    courseTitle: string;
    dueDate?: Date;
    status: 'pending' | 'submitted' | 'graded';
    grade?: number;
    submission?: Submission;
}

const getStatusInfo = (status: StudentAssignment['status'], t: (key: string) => string) => {
    switch (status) {
        case 'pending':
            return { text: t('assignment_status_pending'), icon: <Edit className="h-4 w-4" />, color: 'text-blue-500' };
        case 'submitted':
            return { text: t('assignment_status_in_review'), icon: <Clock className="h-4 w-4" />, color: 'text-amber-500' };
        case 'graded':
            return { text: t('assignment_status_graded'), icon: <CheckCircle className="h-4 w-4" />, color: 'text-green-500' };
        default:
            return { text: "Inconnu", icon: <ClipboardList className="h-4 w-4" />, color: 'text-gray-500' };
    }
};

function AssignmentCard({ assignment, onOpenSubmit }: { assignment: StudentAssignment, onOpenSubmit: (assignment: StudentAssignment) => void }) {
  const t = useTranslations();
  const statusInfo = getStatusInfo(assignment.status, t);
  const isOverdue = assignment.dueDate ? isPast(assignment.dueDate) : false;

  return (
    <Card className="hover:shadow-md transition-shadow duration-300 flex flex-col dark:bg-slate-800 dark:border-slate-700">
      <CardHeader>
        <CardTitle className="text-base font-bold text-slate-800 dark:text-white line-clamp-2">{assignment.title}</CardTitle>
        <p className="text-xs text-slate-500 dark:text-slate-400">{assignment.courseTitle}</p>
      </CardHeader>
      <CardContent className="space-y-3 flex-grow">
        <div className={cn("flex items-center text-sm font-semibold", statusInfo.color)}>
            {statusInfo.icon}
            <span className="ml-2">{statusInfo.text}</span>
            {assignment.status === 'graded' && assignment.grade !== undefined && (
                <span className="ml-auto font-bold text-lg">{assignment.grade}/20</span>
            )}
        </div>
        {assignment.dueDate && (
            <p className={cn("text-xs", isOverdue && assignment.status === 'pending' ? "text-red-600 font-bold" : "text-slate-500 dark:text-slate-400")}>
                À rendre le {format(assignment.dueDate, 'dd MMMM yyyy', { locale: fr })}
            </p>
        )}
      </CardContent>
       <CardFooter>
        <Button onClick={() => onOpenSubmit(assignment)} size="sm" className="w-full">
            {assignment.status === 'pending' ? 'Ouvrir et soumettre' : 'Voir le devoir'}
        </Button>
      </CardFooter>
    </Card>
  );
}

const SubmissionModal = ({
    assignment,
    isOpen,
    onClose,
    onSubmissionSuccess
}: {
    assignment: StudentAssignment | null,
    isOpen: boolean,
    onClose: () => void,
    onSubmissionSuccess: (assignmentId: string, submission: Submission) => void;
}) => {
    const { user } = useRole();
    const { toast } = useToast();
    const t = useTranslations();
    const [file, setFile] = useState<File | null>(null);
    const [uploadProgress, setUploadProgress] = useState<number | null>(null);
    const storage = getStorage();
    const db = getFirestore();

    useEffect(() => {
        // Reset state when modal is opened for a new assignment
        if (isOpen) {
            setFile(null);
            setUploadProgress(null);
        }
    }, [isOpen]);

    if (!assignment) return null;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };
    
    const handleSubmit = async () => {
        if (!file || !user || !assignment) {
            toast({ variant: 'destructive', title: "Fichier manquant", description: "Veuillez sélectionner un fichier à envoyer."});
            return;
        }

        const storageRef = ref(storage, `assignments/${user.uid}/${assignment.assignmentId}/${file.name}`);
        const uploadTask = uploadBytesResumable(storageRef, file);

        uploadTask.on('state_changed',
            (snapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                setUploadProgress(progress);
            },
            (error) => {
                console.error("Upload error:", error);
                toast({ variant: 'destructive', title: "Erreur d'envoi", description: "Votre fichier n'a pas pu être envoyé."});
                setUploadProgress(null);
            },
            async () => {
                const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                const submissionId = `${user.uid}_${assignment.assignmentId}`;
                const submissionRef = doc(db, `courses/${assignment.courseId}/assignments/${assignment.assignmentId}/submissions`, submissionId);

                const newSubmissionData = {
                    userId: user.uid,
                    fileURL: downloadURL,
                    submittedAt: serverTimestamp(),
                    status: 'Envoyé',
                };
                
                await setDoc(submissionRef, newSubmissionData, { merge: true });

                toast({ title: 'Devoir envoyé !' });
                onSubmissionSuccess(assignment.assignmentId, { id: submissionId, ...newSubmissionData, submittedAt: Timestamp.fromDate(new Date()) } as Submission);
                onClose();
            }
        );
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="dark:bg-slate-900 dark:border-slate-800">
                <DialogHeader>
                    <DialogTitle className="dark:text-white">{assignment.title}</DialogTitle>
                    <DialogDescription className="dark:text-slate-400">{assignment.courseTitle}</DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                    <h4 className="font-semibold dark:text-slate-200">Consignes</h4>
                    <p className="text-sm text-muted-foreground dark:text-slate-300">{assignment.description || "Aucune consigne spécifique."}</p>
                    
                    <div className="border-t pt-4 dark:border-slate-700">
                        <h4 className="font-semibold mb-2 dark:text-slate-200">Votre travail</h4>
                        {assignment.status === 'pending' ? (
                             <div>
                                {!file && (
                                     <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted dark:border-slate-700 dark:hover:bg-slate-800/50">
                                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                            <UploadCloud className="w-8 h-8 mb-2 text-muted-foreground" />
                                            <p className="text-sm text-muted-foreground">Cliquez pour téléverser un fichier</p>
                                        </div>
                                        <input type="file" className="hidden" onChange={handleFileChange} />
                                    </label>
                                )}
                                {file && (
                                    <div className="flex items-center justify-between p-2 border rounded-lg dark:border-slate-700">
                                        <div className="flex items-center gap-2">
                                            <File className="h-5 w-5 text-primary" />
                                            <span className="text-sm font-medium dark:text-slate-200">{file.name}</span>
                                        </div>
                                        <Button variant="ghost" size="icon" onClick={() => setFile(null)}><X className="h-4 w-4"/></Button>
                                    </div>
                                )}
                                {uploadProgress !== null && <Progress value={uploadProgress} className="w-full mt-2" />}
                            </div>
                        ) : (
                             <div>
                                <p className="text-sm dark:text-slate-300">Vous avez déjà soumis ce devoir.</p>
                                {assignment.submission?.fileURL && (
                                    <Button variant="outline" asChild className="mt-2">
                                        <a href={assignment.submission.fileURL} target="_blank" rel="noopener noreferrer">
                                            <Download className="mr-2 h-4 w-4" />
                                            Voir ma soumission
                                        </a>
                                    </Button>
                                )}
                            </div>
                        )}
                        {assignment.status === 'graded' && assignment.submission?.feedback && (
                            <div className="mt-4 p-4 border rounded-lg bg-slate-100 dark:bg-slate-800/50 dark:border-slate-700">
                                <h5 className="font-bold text-lg dark:text-white">Note : {assignment.grade}/20</h5>
                                <p className="mt-2 text-sm text-muted-foreground dark:text-slate-300">{JSON.parse(assignment.submission.feedback).commentaire_fr}</p>
                            </div>
                        )}
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Fermer</Button>
                    {assignment.status === 'pending' && (
                        <Button onClick={handleSubmit} disabled={!file || uploadProgress !== null}>
                            {uploadProgress !== null ? "Envoi en cours..." : "Soumettre le devoir"}
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default function MyAssignmentsPage() {
    const { user, isUserLoading } = useRole();
    const db = getFirestore();
    const t = useTranslations();
    const [assignments, setAssignments] = useState<StudentAssignment[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedAssignment, setSelectedAssignment] = useState<StudentAssignment | null>(null);

    useEffect(() => {
        if (!user) {
            if (!isUserLoading) setIsLoading(false);
            return;
        }

        setIsLoading(true);

        const fetchAllData = async () => {
            const enrollmentsQuery = query(collection(db, 'enrollments'), where('studentId', '==', user.uid));
            const enrollmentsSnap = await getDocs(enrollmentsQuery);
            const enrolledCourseIds = enrollmentsSnap.docs.map(doc => doc.data().courseId);

            if (enrolledCourseIds.length === 0) {
                setAssignments([]);
                setIsLoading(false);
                return;
            }
            
            const coursesData = new Map<string, Course>();
            if (enrolledCourseIds.length > 0) {
                const coursesSnap = await getDocs(query(collection(db, 'courses'), where('__name__', 'in', enrolledCourseIds.slice(0, 30))));
                coursesSnap.forEach(doc => coursesData.set(doc.id, { id: doc.id, ...doc.data() } as Course));
            }

            let allStudentAssignments: StudentAssignment[] = [];
            for (const courseId of enrolledCourseIds) {
                const assignmentsQuery = query(collection(db, `courses/${courseId}/assignments`));
                const assignmentsSnap = await getDocs(assignmentsQuery);

                for (const assignmentDoc of assignmentsSnap.docs) {
                    const assignment = { id: assignmentDoc.id, ...assignmentDoc.data() } as Assignment;
                    const submissionId = `${user.uid}_${assignment.id}`;
                    const submissionRef = doc(db, `courses/${courseId}/assignments/${assignment.id}/submissions`, submissionId);
                    const submissionSnap = await getDoc(submissionRef);
                    
                    let status: StudentAssignment['status'] = 'pending';
                    let submissionData: Submission | undefined = undefined;

                    if (submissionSnap.exists()) {
                        submissionData = { id: submissionSnap.id, ...submissionSnap.data() } as Submission;
                        status = submissionData.status === 'Corrigé' ? 'graded' : 'submitted';
                    }

                    allStudentAssignments.push({
                        id: `${courseId}-${assignment.id}`,
                        assignmentId: assignment.id,
                        title: assignment.title,
                        description: assignment.description,
                        courseId: courseId,
                        courseTitle: coursesData.get(courseId)?.title || 'Cours inconnu',
                        status: status,
                        grade: submissionData?.grade,
                        submission: submissionData,
                    });
                }
            }
            setAssignments(allStudentAssignments);
            setIsLoading(false);
        };
        fetchAllData();
    }, [user, isUserLoading, db]);

    const handleSubmissionSuccess = (assignmentId: string, submission: Submission) => {
        setAssignments(prev => prev.map(a => {
            if (a.assignmentId === assignmentId) {
                return {
                    ...a,
                    status: 'submitted',
                    submission,
                };
            }
            return a;
        }));
    };

    const { todo, inProgress, graded } = useMemo(() => {
        return {
            todo: assignments.filter(a => a.status === 'pending'),
            inProgress: assignments.filter(a => a.status === 'submitted'),
            graded: assignments.filter(a => a.status === 'graded')
        };
    }, [assignments]);
    
    return (
        <div className="space-y-6">
            <header>
                <h1 className="text-3xl font-bold dark:text-white">{t('navMyAssignments')}</h1>
                <p className="text-slate-500 dark:text-slate-400">Gardez une trace de vos travaux à faire et de vos résultats.</p>
            </header>

            <Tabs defaultValue="todo" className="w-full">
                <TabsList className="grid w-full grid-cols-3 dark:bg-slate-800 dark:border-slate-700">
                    <TabsTrigger value="todo">À faire ({todo.length})</TabsTrigger>
                    <TabsTrigger value="in-progress">En cours ({inProgress.length})</TabsTrigger>
                    <TabsTrigger value="graded">Corrigés ({graded.length})</TabsTrigger>
                </TabsList>

                <div className="mt-6">
                    <TabsContent value="todo">
                        <AssignmentsGrid assignments={todo} isLoading={isLoading} onOpenSubmit={setSelectedAssignment} emptyMessage="Vous n'avez aucun devoir à faire pour le moment." />
                    </TabsContent>
                    <TabsContent value="in-progress">
                        <AssignmentsGrid assignments={inProgress} isLoading={isLoading} onOpenSubmit={setSelectedAssignment} emptyMessage="Vous n'avez aucun devoir en attente de correction." />
                    </TabsContent>
                    <TabsContent value="graded">
                        <AssignmentsGrid assignments={graded} isLoading={isLoading} onOpenSubmit={setSelectedAssignment} emptyMessage="Aucun devoir n'a encore été corrigé." />
                    </TabsContent>
                </div>
            </Tabs>
            
            <SubmissionModal 
                isOpen={!!selectedAssignment}
                onClose={() => setSelectedAssignment(null)}
                assignment={selectedAssignment}
                onSubmissionSuccess={handleSubmissionSuccess}
            />
        </div>
    );
}


const AssignmentsGrid = ({ assignments, isLoading, emptyMessage, onOpenSubmit }: { assignments: StudentAssignment[], isLoading: boolean, emptyMessage: string, onOpenSubmit: (assignment: StudentAssignment) => void }) => {
    if (isLoading) {
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-48 w-full rounded-lg dark:bg-slate-800" />)}
            </div>
        );
    }
    if (assignments.length === 0) {
        return (
            <div className="text-center py-16 border-2 border-dashed rounded-lg dark:border-slate-700">
                <ClipboardList className="mx-auto h-12 w-12 text-slate-400" />
                <h3 className="mt-4 text-lg font-semibold text-slate-600 dark:text-slate-300">{emptyMessage}</h3>
            </div>
        );
    }
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {assignments.map(assignment => (
                <AssignmentCard key={assignment.id} assignment={assignment} onOpenSubmit={onOpenSubmit} />
            ))}
        </div>
    );
}
