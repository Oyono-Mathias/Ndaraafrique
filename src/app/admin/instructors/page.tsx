
'use client';

import { useState, useMemo } from 'react';
import { useRole } from '@/context/RoleContext';
import { useCollection, useMemoFirebase } from '@/firebase';
import {
  getFirestore,
  collection,
  query,
  where,
  doc,
  updateDoc,
  orderBy
} from 'firebase/firestore';
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, Check, X, UserCheck, UserX, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { FormaAfriqueUser } from '@/context/RoleContext';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Application extends FormaAfriqueUser {
    instructorApplication?: {
        motivation: string;
        verificationDocUrl: string;
        submittedAt: any;
    }
}


export default function InstructorApplicationsPage() {
  const { formaAfriqueUser: adminUser, isUserLoading } = useRole();
  const db = getFirestore();
  const { toast } = useToast();
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const applicationsQuery = useMemoFirebase(
    () => query(
        collection(db, 'users'), 
        where('role', '==', 'instructor'), 
        where('isInstructorApproved', '==', false),
        orderBy('createdAt', 'desc')
    ),
    [db]
  );
  const { data: applications, isLoading: applicationsLoading } = useCollection<Application>(applicationsQuery);

  const isLoading = isUserLoading || applicationsLoading;

  const handleUpdateApplication = async (userId: string, approve: boolean) => {
    setUpdatingId(userId);
    const userRef = doc(db, 'users', userId);
    try {
        if (approve) {
            await updateDoc(userRef, { isInstructorApproved: true });
            toast({ title: 'Candidature Approuvée', description: 'L\'instructeur a maintenant accès à toutes les fonctionnalités.' });
        } else {
            await updateDoc(userRef, { role: 'student', isInstructorApproved: false });
            toast({ title: 'Candidature Rejetée', description: 'Le rôle de l\'utilisateur a été réinitialisé à étudiant.' });
        }
    } catch (error) {
        console.error("Error updating application:", error);
        toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de mettre à jour la candidature.' });
    } finally {
        setUpdatingId(null);
    }
  };


  if (adminUser?.role !== 'admin') {
    return <div className="p-8 text-center">Accès non autorisé.</div>;
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold dark:text-white">Candidatures Instructeurs</h1>
        <p className="text-muted-foreground dark:text-slate-400">Examinez, approuvez ou rejetez les nouvelles demandes.</p>
      </header>

      <Card className="dark:bg-slate-800 dark:border-slate-700">
        <CardHeader>
          <CardTitle className="dark:text-white">Demandes en attente</CardTitle>
          <CardDescription className="dark:text-slate-400">
            Ces utilisateurs souhaitent devenir formateurs sur la plateforme.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="dark:hover:bg-slate-700/50 dark:border-slate-700">
                  <TableHead className="dark:text-slate-400">Nom</TableHead>
                  <TableHead className="hidden md:table-cell dark:text-slate-400">Date de la demande</TableHead>
                  <TableHead className="hidden lg:table-cell dark:text-slate-400">Document</TableHead>
                  <TableHead className="text-right dark:text-slate-400">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  [...Array(3)].map((_, i) => (
                    <TableRow key={i} className="dark:border-slate-700">
                      <TableCell><Skeleton className="h-10 w-40 dark:bg-slate-700" /></TableCell>
                      <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-24 dark:bg-slate-700" /></TableCell>
                      <TableCell className="hidden lg:table-cell"><Skeleton className="h-8 w-24 dark:bg-slate-700" /></TableCell>
                      <TableCell className="text-right"><div className="flex justify-end gap-2"><Skeleton className="h-8 w-20 dark:bg-slate-700" /><Skeleton className="h-8 w-20 dark:bg-slate-700" /></div></TableCell>
                    </TableRow>
                  ))
                ) : applications && applications.length > 0 ? (
                  applications.map((app) => (
                    <TableRow key={app.uid} className="dark:hover:bg-slate-700/50 dark:border-slate-700">
                      <TableCell>
                         <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarImage src={app.profilePictureURL} alt={app.fullName} />
                            <AvatarFallback>{app.fullName?.charAt(0) || 'U'}</AvatarFallback>
                          </Avatar>
                          <div>
                            <span className="font-medium dark:text-slate-100">{app.fullName}</span>
                            <p className="text-xs text-muted-foreground dark:text-slate-400">{app.email}</p>
                          </div>
                        </div>
                      </TableCell>
                       <TableCell className="text-muted-foreground hidden md:table-cell dark:text-slate-400">
                          {app.instructorApplication?.submittedAt ? formatDistanceToNow(app.instructorApplication.submittedAt.toDate(), { addSuffix: true, locale: fr }) : (app.createdAt ? formatDistanceToNow(app.createdAt.toDate(), { addSuffix: true, locale: fr }) : 'N/A')}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                          {app.instructorApplication?.verificationDocUrl ? (
                            <Button asChild variant="outline" size="sm">
                                <a href={app.instructorApplication.verificationDocUrl} target="_blank" rel="noopener noreferrer">
                                    <FileText className="mr-2 h-4 w-4"/> Voir le document
                                </a>
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground">Aucun document</span>
                          )}
                      </TableCell>
                      <TableCell className="text-right">
                         <div className="flex justify-end gap-2">
                            <Button onClick={() => handleUpdateApplication(app.uid, false)} size="sm" variant="destructive" disabled={updatingId === app.uid}>
                                {updatingId === app.uid ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <UserX className="mr-2 h-4 w-4"/>}
                                Rejeter
                            </Button>
                             <Button onClick={() => handleUpdateApplication(app.uid, true)} size="sm" variant="default" disabled={updatingId === app.uid}>
                                {updatingId === app.uid ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <UserCheck className="mr-2 h-4 w-4"/>}
                                Approuver
                            </Button>
                         </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow className="dark:border-slate-700">
                    <TableCell colSpan={4} className="h-48 text-center">
                       <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground dark:text-slate-400">
                          <UserCheck className="h-12 w-12" />
                          <p className="font-medium">Aucune nouvelle candidature</p>
                          <p className="text-sm">Toutes les demandes ont été traitées.</p>
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
