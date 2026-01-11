

'use client';

import { useParams, useRouter } from 'next/navigation';
import { useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { getFirestore, doc, collection, query, where, getDocs } from 'firebase/firestore';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, BookOpen, Loader2, User as UserIcon, Calendar, Info, ShieldAlert } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import Link from 'next/link';
import type { FormaAfriqueUser } from '@/context/RoleContext';
import type { Course, Enrollment } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useMemo, useState, useEffect } from 'react';

const getRoleBadgeVariant = (role: FormaAfriqueUser['role']) => {
  switch (role) {
    case 'admin':
      return 'destructive';
    case 'instructor':
      return 'default';
    default:
      return 'secondary';
  }
};

const getStatusBadgeVariant = (status?: 'active' | 'suspended') => {
    return status === 'suspended' ? 'destructive' : 'default';
};

const UserActivity = ({ user }: { user: FormaAfriqueUser & {createdAt?: any} }) => {
    const db = getFirestore();

    const enrolledQuery = useMemoFirebase(
        () => user.role === 'student' ? query(collection(db, 'enrollments'), where('studentId', '==', user.uid)) : null,
        [db, user]
    );
    const { data: enrollments, isLoading: enrollmentsLoading, error: enrollmentsError } = useCollection<Enrollment>(enrolledQuery);

    const createdQuery = useMemoFirebase(
        () => user.role === 'instructor' ? query(collection(db, 'courses'), where('instructorId', '==', user.uid)) : null,
        [db, user]
    );
    const { data: createdCourses, isLoading: createdCoursesLoading, error: coursesError } = useCollection<Course>(createdQuery);

    const enrolledCourseIds = useMemo(() => enrollments?.map(e => e.courseId) || [], [enrollments]);
    
    const [enrolledCourses, setEnrolledCourses] = useState<Course[]>([]);
    const [enrolledCoursesLoading, setEnrolledCoursesLoading] = useState(true);
    const [enrolledCoursesError, setEnrolledCoursesError] = useState(null);

    useEffect(() => {
        if (enrolledCourseIds.length === 0) {
            setEnrolledCourses([]);
            setEnrolledCoursesLoading(false);
            return;
        }

        const fetchEnrolledCourses = async () => {
            setEnrolledCoursesLoading(true);
            try {
                const coursesRef = collection(db, 'courses');
                // Firestore 'in' query has a limit of 30. For more, batching would be needed.
                const q = query(coursesRef, where('__name__', 'in', enrolledCourseIds.slice(0, 30)));
                const coursesSnapshot = await getDocs(q);
                const coursesList = coursesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course));
                setEnrolledCourses(coursesList);
            } catch (err: any) {
                setEnrolledCoursesError(err);
                console.error("Error fetching enrolled courses:", err);
            } finally {
                setEnrolledCoursesLoading(false);
            }
        };

        fetchEnrolledCourses();
    }, [enrolledCourseIds, db]);
    
    const isLoading = enrollmentsLoading || createdCoursesLoading || enrolledCoursesLoading;
    const isError = enrollmentsError || coursesError || enrolledCoursesError;

    if (isLoading) {
        return (
             <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-1/3"/>
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-24 w-full"/>
                </CardContent>
            </Card>
        )
    }
    
    if (isError) {
        return (
             <Card className="border-destructive/50 bg-destructive/5">
                <CardHeader>
                    <CardTitle className="text-destructive flex items-center gap-2"><ShieldAlert className="h-5 w-5"/> Erreur d'activité</CardTitle>
                    <CardDescription className="text-destructive/80">Impossible de charger l'activité de l'utilisateur. Un index Firestore est peut-être manquant.</CardDescription>
                </CardHeader>
            </Card>
        )
    }

    if (user.role === 'student') {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Cours Inscrits ({enrolledCourses?.length || 0})</CardTitle>
                </CardHeader>
                <CardContent>
                    {enrolledCourses && enrolledCourses.length > 0 ? (
                        <ul className="space-y-2">
                           {enrolledCourses.map(course => (
                             <li key={course.id} className="flex items-center justify-between p-2 rounded-md border hover:bg-muted">
                               <span className="font-medium">{course.title}</span>
                               <Link href={`/course/${course.id}`}><Button variant="ghost" size="sm">Voir le cours</Button></Link>
                             </li>
                           ))}
                        </ul>
                    ) : <p className="text-muted-foreground">Cet étudiant n'est inscrit à aucun cours.</p>}
                </CardContent>
            </Card>
        );
    }
    
    if (user.role === 'instructor') {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Cours Créés ({createdCourses?.length || 0})</CardTitle>
                </CardHeader>
                <CardContent>
                    {createdCourses && createdCourses.length > 0 ? (
                        <ul className="space-y-2">
                           {createdCourses.map(course => (
                             <li key={course.id} className="flex items-center justify-between p-2 rounded-md border hover:bg-muted">
                               <span className="font-medium">{course.title}</span>
                               <Link href={`/course/${course.id}`}><Button variant="ghost" size="sm">Voir le cours</Button></Link>
                             </li>
                           ))}
                        </ul>
                    ) : <p className="text-muted-foreground">Cet instructeur n'a créé aucun cours.</p>}
                </CardContent>
            </Card>
        );
    }

    return null;
}

export default function UserProfilePage() {
    const { userId } = useParams();
    const router = useRouter();
    const db = getFirestore();
    
    const userRef = useMemoFirebase(() => doc(db, 'users', userId as string), [db, userId]);
    const { data: user, isLoading, error } = useDoc<FormaAfriqueUser & {createdAt?: any}>(userRef);

    if (isLoading) {
        return <div className="flex h-full items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;
    }

    if (error || !user) {
        return (
            <div className="p-8 text-center text-muted-foreground">
                <UserIcon className="h-12 w-12 mx-auto mb-4" />
                <h2 className="text-xl font-semibold">Utilisateur non trouvé</h2>
                <p>Impossible de trouver les détails pour cet utilisateur.</p>
                <Button onClick={() => router.push('/dashboarde/users')} className="mt-4">Retour à la liste</Button>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <header>
                <Button variant="ghost" onClick={() => router.push('/dashboarde/users')}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Retour à la liste des utilisateurs
                </Button>
            </header>
            
            <main className="grid md:grid-cols-3 gap-6">
                {/* Left Column for Profile Summary */}
                <div className="md:col-span-1 space-y-6">
                    <Card>
                        <CardContent className="pt-6 flex flex-col items-center text-center">
                            <Avatar className="h-24 w-24 mb-4 border-2">
                                <AvatarImage src={user.profilePictureURL} alt={user.fullName} />
                                <AvatarFallback className="text-3xl">{user.fullName?.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <h1 className="text-2xl font-bold">{user.fullName}</h1>
                            <p className="text-muted-foreground">{user.email}</p>
                            <div className="flex gap-2 mt-4">
                                <Badge variant={getRoleBadgeVariant(user.role)} className="capitalize text-sm">{user.role}</Badge>
                                <Badge variant={getStatusBadgeVariant(user.status)} className={cn('text-sm', user.status !== 'suspended' && 'bg-green-100 text-green-800')}>
                                    {user.status === 'suspended' ? 'Suspendu' : 'Actif'}
                                </Badge>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>Informations</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 text-sm">
                            <div className="flex items-center gap-3">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <div>
                                    <p className="font-medium">Date d'inscription</p>
                                    <p className="text-muted-foreground">{user.createdAt ? format(user.createdAt.toDate(), 'dd MMMM yyyy', { locale: fr }) : 'N/A'}</p>
                                </div>
                            </div>
                             <div className="flex items-start gap-3">
                                <Info className="h-4 w-4 text-muted-foreground mt-1" />
                                <div>
                                    <p className="font-medium">Biographie</p>
                                    <p className="text-muted-foreground italic">{user.bio || 'Aucune biographie fournie.'}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column for Activity */}
                <div className="md:col-span-2">
                    <UserActivity user={user} />
                </div>
            </main>
        </div>
    );
}

