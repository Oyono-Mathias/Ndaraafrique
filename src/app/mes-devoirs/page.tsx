
'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useRole } from '@/context/RoleContext';
import { useCollection, useMemoFirebase } from '@/firebase';
import { getFirestore, collection, query, where, getDocs, getDoc, doc, setDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';

import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ClipboardList, CheckCircle, Clock, Edit, UploadCloud, File, X } from 'lucide-react';
import { format, isPast } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { Course, Enrollment, Assignment, Submission } from '@/lib/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';


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

const getStatusInfo = (status: StudentAssignment['status']) => {
    switch (status) {
        case 'pending':
            return { text: 'À Rendre', icon: <Edit className="h-4 w-4" />, color: 'text-blue-600' };
        case 'submitted':
            return { text: 'En Attente de Note', icon: <Clock className="h-4 w-4" />, color: 'text-orange-500' };
        case 'graded':
            return { text: 'Corrigé', icon: <CheckCircle className="h-4 w-4" />, color: 'text-green-600' };
        default:
            return { text: 'Indéfini', icon: <ClipboardList className="h-4 w-4" />, color: 'text-gray-500' };
    }
};

function AssignmentCard({ assignment, onOpenSubmit }: { assignment: StudentAssignment, onOpenSubmit: (assignment: StudentAssignment) => void }) {
  const statusInfo = getStatusInfo(assignment.status);
  const isOverdue = assignment.dueDate ? isPast(assignment.dueDate) : false;

  return (
    <Card className="hover:shadow-md transition-shadow duration-300 flex flex-col">
      <CardHeader>
        <CardTitle className="text-base font-bold text-slate-800 line-clamp-2">{assignment.title}</CardTitle>
        <p className="text-xs text-slate-500">{assignment.courseTitle}</p>
      </CardHeader>
      <CardContent className="space-y-3 flex-grow">
        <div className={cn("flex items-center text-sm font-semibold", statusInfo.color)}>
            {statusInfo.icon}
            <span className="ml-2">{statusInfo.text}</span>
        </div>
        {assignment.dueDate && (
            <p className={cn("text-xs", isOverdue && assignment.status === 'pending' ? "text-red-600 font-bold" : "text-slate-500")}>
                Date limite : {format(assignment.dueDate, 'dd MMMM yyyy', { locale: fr })}
            </p>
        )}
      </CardContent>
       <CardFooter>
        <Button onClick={() => onOpenSubmit(assignment)} size="sm" className="w-full">
            {assignment.status === 'pending' ? 'Ouvrir et Rendre' : 'Voir le devoir'}
        </Button>
      </CardFooter>
    </Card>
  );
}

const SubmissionModal = ({
    assignment,
    isOpen,
    onClose
}: {
    assignment: StudentAssignment | null,
    isOpen: boolean,
    onClose: () => void
}) => {
    const { user } = useRole();
    const { toast } = useToast();
    const [file, setFile] = useState<File | null>(null);
    const [uploadProgress, setUploadProgress] = useState<number | null>(null);
    const storage = getStorage();
    const db = getFirestore();

    if (!assignment) return null;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };
    
    const handleSubmit = async () => {
        if (!file || !user || !assignment) {
            toast({ variant: 'destructive', title: 'Fichier manquant', description: 'Veuillez sélectionner un fichier.'});
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
                toast({ variant: 'destructive', title: 'Erreur d\'envoi', description: 'Impossible de téléverser le fichier.'});
                setUploadProgress(null);
            },
            async () => {
                const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                const submissionId = `${user.uid}_${assignment.assignmentId}`;
                const submissionRef = doc(db, `courses/${assignment.courseId}/assignments/${assignment.assignmentId}/submissions`, submissionId);

                await setDoc(submissionRef, {
                    userId: user.uid,
                    fileURL: downloadURL,
                    submittedAt: serverTimestamp(),
                    status: 'Envoyé',
                }, { merge: true });

                toast({ title: 'Devoir envoyé avec succès !' });
                setFile(null);
                setUploadProgress(null);
                onClose();
            }
        );
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{assignment.title}</DialogTitle>
                    <DialogDescription>{assignment.courseTitle}</DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                    <h4 className="font-semibold">Instructions</h4>
                    <p className="text-sm text-muted-foreground">{assignment.description || 'Aucune instruction supplémentaire.'}</p>
                    
                    <div className="border-t pt-4">
                        <h4 className="font-semibold mb-2">Votre travail</h4>
                        {assignment.status === 'pending' ? (
                             <div>
                                {!file && (
                                     <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted">
                                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                            <UploadCloud className="w-8 h-8 mb-2 text-muted-foreground" />
                                            <p className="text-sm text-muted-foreground">Cliquez pour uploader (PDF, Word, Image)</p>
                                        </div>
                                        <input type="file" className="hidden" onChange={handleFileChange} />
                                    </label>
                                )}
                                {file && (
                                    <div className="flex items-center justify-between p-2 border rounded-lg">
                                        <div className="flex items-center gap-2">
                                            <File className="h-5 w-5" />
                                            <span className="text-sm font-medium">{file.name}</span>
                                        </div>
                                        <Button variant="ghost" size="icon" onClick={() => setFile(null)}><X className="h-4 w-4"/></Button>
                                    </div>
                                )}
                                {uploadProgress !== null && <Progress value={uploadProgress} className="w-full mt-2" />}
                            </div>
                        ) : (
                            <div>
                                <p className="text-sm">Vous avez déjà soumis ce devoir.</p>
                                <a href={assignment.submission?.fileURL} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">
                                    Voir votre soumission
                                </a>
                            </div>
                        )}
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Fermer</Button>
                    {assignment.status === 'pending' && (
                        <Button onClick={handleSubmit} disabled={!file || uploadProgress !== null}>
                            {uploadProgress !== null ? 'Envoi en cours...' : 'Envoyer le devoir'}
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
                <h1 className="text-3xl font-bold text-slate-900">Mes Devoirs</h1>
                <p className="text-slate-500">Suivez vos travaux à rendre et vos notes.</p>
            </header>

            <Tabs defaultValue="todo" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="todo">À faire ({todo.length})</TabsTrigger>
                    <TabsTrigger value="in-progress">En attente ({inProgress.length})</TabsTrigger>
                    <TabsTrigger value="graded">Corrigés ({graded.length})</TabsTrigger>
                </TabsList>

                <div className="mt-6">
                    <TabsContent value="todo">
                        <AssignmentsGrid assignments={todo} isLoading={isLoading} onOpenSubmit={setSelectedAssignment} emptyMessage="Vous n'avez aucun devoir à faire pour le moment." />
                    </TabsContent>
                    <TabsContent value="in-progress">
                        <AssignmentsGrid assignments={inProgress} isLoading={isLoading} onOpenSubmit={setSelectedAssignment} emptyMessage="Aucun devoir en attente de correction." />
                    </TabsContent>
                    <TabsContent value="graded">
                        <AssignmentsGrid assignments={graded} isLoading={isLoading} onOpenSubmit={setSelectedAssignment} emptyMessage="Aucun de vos devoirs n'a été corrigé." />
                    </TabsContent>
                </div>
            </Tabs>
            
            <SubmissionModal 
                isOpen={!!selectedAssignment}
                onClose={() => setSelectedAssignment(null)}
                assignment={selectedAssignment}
            />
        </div>
    );
}


const AssignmentsGrid = ({ assignments, isLoading, emptyMessage, onOpenSubmit }: { assignments: StudentAssignment[], isLoading: boolean, emptyMessage: string, onOpenSubmit: (assignment: StudentAssignment) => void }) => {
    if (isLoading) {
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-48 w-full rounded-lg" />)}
            </div>
        );
    }
    if (assignments.length === 0) {
        return (
            <div className="text-center py-16 border-2 border-dashed rounded-lg">
                <ClipboardList className="mx-auto h-12 w-12 text-slate-400" />
                <h3 className="mt-4 text-lg font-semibold text-slate-600">{emptyMessage}</h3>
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

