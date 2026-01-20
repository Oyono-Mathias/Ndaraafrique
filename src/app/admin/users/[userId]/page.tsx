'use client';

import { useParams, useRouter } from 'next/navigation';
import { useDoc, useMemoFirebase } from '@/firebase';
import { doc, collection, query, where, getFirestore, getDocs } from 'firebase/firestore';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, User, Mail, Calendar, Shield, Briefcase } from 'lucide-react';
import type { NdaraUser, Enrollment, Course } from '@/lib/types';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { useState, useEffect } from 'react';
import Link from 'next/link';

const getRoleBadge = (role: NdaraUser['role']) => {
    switch (role) {
        case 'admin': return <Badge variant="destructive" className="flex items-center gap-1"><Shield className="h-3 w-3"/> Admin</Badge>;
        case 'instructor': return <Badge className="flex items-center gap-1"><Briefcase className="h-3 w-3"/> Instructeur</Badge>;
        default: return <Badge variant="secondary" className="flex items-center gap-1"><User className="h-3 w-3"/> Étudiant</Badge>;
    }
}

const getStatusBadge = (status?: NdaraUser['status']) => {
    if (status === 'suspended') {
        return <Badge variant="destructive">Suspendu</Badge>;
    }
    return <Badge variant="default" className="bg-green-600 hover:bg-green-500">Actif</Badge>;
}

interface EnrichedEnrollment extends Enrollment {
    courseTitle?: string;
}

export default function UserDetailPage() {
    const { userId } = useParams();
    const router = useRouter();
    const db = getFirestore();

    const [enrichedEnrollments, setEnrichedEnrollments] = useState<EnrichedEnrollment[]>([]);
    const [enrollmentsLoading, setEnrollmentsLoading] = useState(true);

    const userRef = useMemoFirebase(() => doc(db, 'users', userId as string), [db, userId]);
    const { data: user, isLoading: userLoading } = useDoc<NdaraUser>(userRef);
    
    useEffect(() => {
        if (!userId) return;

        const fetchEnrollments = async () => {
            setEnrollmentsLoading(true);
            const enrollmentsQuery = query(collection(db, 'enrollments'), where('studentId', '==', userId));
            const enrollmentsSnapshot = await getDocs(enrollmentsQuery);
            const enrollments = enrollmentsSnapshot.docs.map(doc => doc.data() as Enrollment);
            
            if (enrollments.length > 0) {
                const courseIds = enrollments.map(e => e.courseId);
                const coursesQuery = query(collection(db, 'courses'), where('__name__', 'in', courseIds));
                const coursesSnapshot = await getDocs(coursesQuery);
                const coursesMap = new Map(coursesSnapshot.docs.map(doc => [doc.id, doc.data() as Course]));
                
                const enriched = enrollments.map(e => ({
                    ...e,
                    courseTitle: coursesMap.get(e.courseId)?.title || "Cours inconnu"
                }));
                setEnrichedEnrollments(enriched);
            } else {
                setEnrichedEnrollments([]);
            }
            setEnrollmentsLoading(false);
        }

        fetchEnrollments();
    }, [userId, db]);


    const isLoading = userLoading || enrollmentsLoading;

    if (isLoading) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-10 w-48" />
                <div className="flex items-center gap-6">
                    <Skeleton className="h-24 w-24 rounded-full" />
                    <div className="space-y-2">
                        <Skeleton className="h-8 w-64" />
                        <Skeleton className="h-5 w-48" />
                    </div>
                </div>
                 <Skeleton className="h-64 w-full" />
            </div>
        )
    }

    if (!user) {
        return (
             <div className="text-center py-20">
                <User className="mx-auto h-12 w-12 text-slate-400" />
                <h3 className="mt-4 text-lg font-semibold text-slate-300">Utilisateur non trouvé</h3>
            </div>
        );
    }


    return (
        <div className="space-y-6">
            <header>
                 <Button variant="ghost" size="sm" onClick={() => router.push('/admin/users')} className="mb-4 dark:text-slate-300 dark:hover:bg-slate-800 -ml-4">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Retour à la liste des utilisateurs
                </Button>
                 <div className="flex flex-col sm:flex-row sm:items-center sm:gap-6">
                    <Avatar className="h-24 w-24 border-4 border-slate-700">
                        <AvatarImage src={user.profilePictureURL} />
                        <AvatarFallback className="text-4xl bg-slate-800">{user.fullName?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                        <h1 className="text-3xl font-bold text-white mt-2 sm:mt-0">{user.fullName}</h1>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-400 mt-1">
                            <span className="flex items-center gap-1.5"><User className="h-3 w-3"/> @{user.username}</span>
                            <span className="flex items-center gap-1.5"><Mail className="h-3 w-3"/> {user.email}</span>
                             {user.createdAt && <span className="flex items-center gap-1.5"><Calendar className="h-3 w-3"/> Membre depuis {format(user.createdAt.toDate(), 'dd MMM yyyy', {locale: fr})}</span>}
                        </div>
                         <div className="flex items-center gap-2 mt-2">
                            {getRoleBadge(user.role)}
                            {getStatusBadge(user.status)}
                         </div>
                    </div>
                 </div>
            </header>
            
            <Card>
                <CardHeader><CardTitle>Cours Inscrits ({enrichedEnrollments.length})</CardTitle></CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Cours</TableHead>
                                <TableHead>Progression</TableHead>
                                <TableHead>Date d'inscription</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {enrichedEnrollments.length > 0 ? enrichedEnrollments.map(e => (
                                <TableRow key={e.id}>
                                    <TableCell className="font-semibold">{e.courseTitle}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <Progress value={e.progress} className="w-24 h-2"/>
                                            <span>{e.progress}%</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>{format(e.enrollmentDate.toDate(), 'dd MMM yyyy', { locale: fr })}</TableCell>
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={3} className="text-center h-24">Cet utilisateur n'est inscrit à aucun cours.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}

    