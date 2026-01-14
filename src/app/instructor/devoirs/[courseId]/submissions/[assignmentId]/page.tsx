
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useRole } from '@/context/RoleContext';
import { useDoc, useCollection, useMemoFirebase } from '@/firebase';
import {
  getFirestore,
  collection,
  doc,
  query,
  orderBy,
  updateDoc,
  where,
  getDocs,
} from 'firebase/firestore';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Loader2, Bot, CheckCircle, FileText, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Course, Assignment, Submission } from '@/lib/types';
import type { FormaAfriqueUser } from '@/context/RoleContext';
import { useToast } from '@/hooks/use-toast';
import { gradeAssignment } from '@/ai/flows/grade-assignment-flow';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';

type GradedResult = {
    note: string;
    points_forts: string;
    points_amelioration: string;
    commentaire_fr: string;
    commentaire_sg: string;
}

interface EnrichedSubmission extends Submission {
    student?: FormaAfriqueUser;
}

const SubmissionCard = ({ submission, assignment }: { submission: EnrichedSubmission, assignment: Assignment | null }) => {
    const { toast } = useToast();
    const [isGrading, setIsGrading] = useState(false);
    const [correction, setCorrection] = useState<GradedResult | null>(submission.feedback ? JSON.parse(submission.feedback) : null);
    
    const handleGrade = async () => {
        if (!assignment || !submission.fileURL) {
            toast({ variant: 'destructive', title: 'Erreur', description: 'Informations manquantes pour la correction.' });
            return;
        }
        setIsGrading(true);
        try {
            // Note: In a real-world scenario, you'd fetch the file content from the URL.
            // For this simulation, we'll send the URL and a placeholder text. The AI is instructed to handle this.
            const studentWork = `Le fichier de l'étudiant est disponible à cette URL: ${submission.fileURL}. Analysez ce travail en fonction des consignes.`;

            const result = await gradeAssignment({
                correctionGuide: assignment.correctionGuide || 'Corrige ce devoir de manière standard.',
                studentWork: studentWork,
            });
            setCorrection(result);
            
            // Persist the correction to Firestore
            const submissionRef = doc(getFirestore(), `courses/${assignment.courseId}/assignments/${assignment.id}/submissions/${submission.id}`);
            await updateDoc(submissionRef, {
                feedback: JSON.stringify(result),
                grade: parseInt(result.note.split('/')[0], 10),
                status: 'Corrigé'
            });

            toast({ title: 'Correction terminée !', description: 'La note et le feedback sont prêts.' });

        } catch (error) {
            console.error("Error grading with AI:", error);
            toast({ variant: 'destructive', title: 'Erreur de l\'IA', description: 'La correction automatique a échoué.' });
        } finally {
            setIsGrading(false);
        }
    };

    return (
        <Card className="dark:bg-slate-800 dark:border-slate-700">
            <CardHeader className="flex-row items-center gap-4 space-y-0">
                <Avatar className="h-12 w-12">
                    <AvatarImage src={submission.student?.profilePictureURL} />
                    <AvatarFallback>{submission.student?.fullName.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                    <CardTitle className="dark:text-white">{submission.student?.fullName}</CardTitle>
                    <CardDescription className="dark:text-slate-400">{submission.student?.email}</CardDescription>
                </div>
                <div className="ml-auto flex items-center gap-2">
                    {submission.status === 'Corrigé' && <Badge variant="default" className="bg-green-600">Corrigé</Badge>}
                    <Button variant="outline" size="sm" asChild>
                        <a href={submission.fileURL} target="_blank" rel="noopener noreferrer">
                            <Download className="h-4 w-4 mr-2" /> Voir le devoir
                        </a>
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                {correction ? (
                     <div className="space-y-4 p-4 border rounded-lg bg-slate-100 dark:bg-slate-900/50 dark:border-slate-700">
                        <div className="flex justify-between items-baseline">
                            <h4 className="font-bold text-lg dark:text-white">Résultat de la Correction</h4>
                            <p className="font-extrabold text-2xl text-primary">{correction.note}</p>
                        </div>
                        <div>
                            <h5 className="font-semibold text-sm text-green-600 dark:text-green-400">Points Forts</h5>
                            <p className="text-sm text-muted-foreground dark:text-slate-300">{correction.points_forts}</p>
                        </div>
                         <div>
                            <h5 className="font-semibold text-sm text-orange-500 dark:text-orange-400">Points d'Amélioration</h5>
                            <p className="text-sm text-muted-foreground dark:text-slate-300">{correction.points_amelioration}</p>
                        </div>
                         <div>
                            <h5 className="font-semibold text-sm text-slate-600 dark:text-slate-200">Commentaire du Mentor</h5>
                            <p className="text-sm text-muted-foreground italic dark:text-slate-300">"{correction.commentaire_fr}"</p>
                            <p className="text-xs text-muted-foreground italic mt-1">Sango: "{correction.commentaire_sg}"</p>
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-8 text-muted-foreground dark:text-slate-400">
                        <p>Ce devoir n'a pas encore été corrigé.</p>
                    </div>
                )}
            </CardContent>
            <CardFooter>
                 <Button onClick={handleGrade} disabled={isGrading || !!correction} className="w-full">
                    {isGrading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Bot className="mr-2 h-4 w-4" />}
                    {correction ? "Corriger à nouveau" : "Corriger avec MATHIAS"}
                </Button>
            </CardFooter>
        </Card>
    )
}

export default function SubmissionsPage() {
    const { courseId, assignmentId } = useParams();
    const router = useRouter();
    const db = getFirestore();
    const { isUserLoading } = useRole();

    const assignmentRef = useMemoFirebase(() => doc(db, `courses/${courseId}/assignments/${assignmentId}`), [db, courseId, assignmentId]);
    const { data: assignment, isLoading: assignmentLoading } = useDoc<Assignment>(assignmentRef);

    const submissionsQuery = useMemoFirebase(() => query(collection(db, `courses/${courseId}/assignments/${assignmentId}/submissions`), orderBy('submittedAt', 'desc')), [db, courseId, assignmentId]);
    const { data: submissions, isLoading: submissionsLoading } = useCollection<Submission>(submissionsQuery);

    const [enrichedSubmissions, setEnrichedSubmissions] = useState<EnrichedSubmission[]>([]);
    const [studentsLoading, setStudentsLoading] = useState(true);

    useEffect(() => {
        if (!submissions) return;
        setStudentsLoading(true);

        const fetchStudents = async () => {
            const studentIds = [...new Set(submissions.map(sub => sub.userId))];
            if (studentIds.length === 0) {
                setEnrichedSubmissions([]);
                setStudentsLoading(false);
                return;
            }

            const usersMap = new Map<string, FormaAfriqueUser>();
            const usersRef = collection(db, 'users');
            const q = query(usersRef, where('uid', 'in', studentIds.slice(0, 30)));
            const usersSnap = await getDocs(q);
            usersSnap.forEach(doc => usersMap.set(doc.id, doc.data() as FormaAfriqueUser));
            
            const enriched = submissions.map(sub => ({
                ...sub,
                student: usersMap.get(sub.userId)
            }));
            setEnrichedSubmissions(enriched);
            setStudentsLoading(false);
        };

        fetchStudents();
    }, [submissions, db]);


    const isLoading = assignmentLoading || submissionsLoading || isUserLoading || studentsLoading;

    return (
        <div className="space-y-8">
            <header>
                 <Button variant="ghost" size="sm" onClick={() => router.push(`/instructor/devoirs/${courseId}`)} className="mb-2 dark:text-slate-300 dark:hover:bg-slate-800">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Retour aux devoirs
                </Button>
                {assignmentLoading ? (
                    <Skeleton className="h-8 w-3/4 dark:bg-slate-700" />
                ) : (
                    <h1 className="text-3xl font-bold dark:text-white">Soumissions pour "{assignment?.title}"</h1>
                )}
            </header>
            
            <div className="space-y-6">
                {isLoading ? (
                    [...Array(2)].map((_, i) => <Skeleton key={i} className="h-64 w-full dark:bg-slate-700" />)
                ) : enrichedSubmissions.length > 0 ? (
                    enrichedSubmissions.map(sub => <SubmissionCard key={sub.id} submission={sub} assignment={assignment} />)
                ) : (
                    <div className="text-center py-20 border-2 border-dashed rounded-lg dark:border-slate-700">
                        <FileText className="mx-auto h-12 w-12 text-slate-400" />
                        <h3 className="mt-4 font-medium text-lg dark:text-slate-300">Aucune soumission pour ce devoir.</h3>
                        <p className="text-sm text-muted-foreground dark:text-slate-400">Les travaux des étudiants apparaîtront ici.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
