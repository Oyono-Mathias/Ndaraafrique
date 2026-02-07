'use client';

import { useState, useMemo } from 'react';
import { useCollection } from '@/firebase';
import { getFirestore, collection, query, where } from 'firebase/firestore';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { NdaraUser } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Eye, Frown } from 'lucide-react';
import { ApplicationDetailsModal } from './ApplicationDetailsModal';

export function ApplicationsTable() {
  const db = getFirestore();
  const [selectedApplication, setSelectedApplication] = useState<NdaraUser | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Correction : On retire l'orderBy de la requête Firestore pour éviter de masquer les docs sans date
  const applicationsQuery = useMemo(
    () => query(collection(db, 'users'), where('role', '==', 'instructor'), where('isInstructorApproved', '==', false)),
    [db]
  );
  const { data: rawApplications, isLoading } = useCollection<NdaraUser>(applicationsQuery);

  // Tri manuel en mémoire pour garantir la visibilité
  const applications = useMemo(() => {
    if (!rawApplications) return [];
    return [...rawApplications].sort((a, b) => {
      const dateA = (a.createdAt as any)?.toDate?.() || new Date(0);
      const dateB = (b.createdAt as any)?.toDate?.() || new Date(0);
      return dateB.getTime() - dateA.getTime();
    });
  }, [rawApplications]);

  const handleViewDetails = (application: NdaraUser) => {
    setSelectedApplication(application);
    setIsModalOpen(true);
  };
  
  const handleActionComplete = () => {
    // Le listener temps réel de useCollection mettra à jour la liste automatiquement.
  }

  return (
    <>
      <ApplicationDetailsModal 
        isOpen={isModalOpen}
        onOpenChange={setIsModalOpen}
        application={selectedApplication}
        onActionComplete={handleActionComplete}
      />
      <div className="border rounded-lg dark:border-slate-700">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Candidat</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Date de candidature</TableHead>
              <TableHead>Spécialité</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              [...Array(3)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={5}><Skeleton className="h-10 w-full bg-slate-800"/></TableCell>
                </TableRow>
              ))
            ) : applications && applications.length > 0 ? (
              applications.map(app => (
                <TableRow key={app.uid}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={app.profilePictureURL} />
                        <AvatarFallback>{app.fullName?.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="font-medium">{app.fullName}</div>
                    </div>
                  </TableCell>
                  <TableCell>{app.email}</TableCell>
                  <TableCell>
                    {app.createdAt && typeof (app.createdAt as any).toDate === 'function'
                      ? formatDistanceToNow((app.createdAt as any).toDate(), { locale: fr, addSuffix: true })
                      : 'Date inconnue'}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{app.instructorApplication?.specialty || 'Non spécifié'}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" onClick={() => handleViewDetails(app)}>
                      <Eye className="mr-2 h-4 w-4" />
                      Détails
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Frown className="h-8 w-8" />
                    <p>Aucune nouvelle candidature pour le moment.</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </>
  );
}