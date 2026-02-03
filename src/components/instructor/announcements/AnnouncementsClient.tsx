'use client';

import { useState, useMemo } from 'react';
import { useCollection } from '@/firebase';
import { getFirestore, collection, query, where, orderBy } from 'firebase/firestore';
import { useRole } from '@/context/RoleContext';
import type { Course, Announcement } from '@/lib/types';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { AnnouncementForm } from './AnnouncementForm';
import { Frown, Megaphone } from 'lucide-react';

const AnnouncementCard = ({ announcement }: { announcement: Announcement }) => (
  <Card className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
    <CardHeader>
      <CardTitle className="text-base">{announcement.title}</CardTitle>
      <CardDescription>
        {(announcement.createdAt as any)?.toDate?.() 
          ? format((announcement.createdAt as any).toDate(), 'd MMMM yyyy à HH:mm', { locale: fr }) 
          : 'Date indisponible'}
      </CardDescription>
    </CardHeader>
    <CardContent>
      <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{announcement.message}</p>
    </CardContent>
  </Card>
);

export function AnnouncementsClient() {
  const db = getFirestore();
  const { currentUser } = useRole();
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);

  const coursesQuery = useMemo(
    () => currentUser ? query(collection(db, 'courses'), where('instructorId', '==', currentUser.uid), where('status', '==', 'Published')) : null,
    [db, currentUser]
  );
  const { data: courses, isLoading: coursesLoading } = useCollection<Course>(coursesQuery);

  const announcementsQuery = useMemo(
    () => selectedCourseId ? query(collection(db, `courses/${selectedCourseId}/announcements`), orderBy('createdAt', 'desc')) : null,
    [db, selectedCourseId]
  );
  const { data: announcements, isLoading: announcementsLoading } = useCollection<Announcement>(announcementsQuery);

  return (
    <div className="grid lg:grid-cols-3 gap-8 items-start">
      <div className="lg:col-span-1 space-y-4">
        <h2 className="font-semibold text-lg text-slate-900 dark:text-white">1. Choisissez un cours</h2>
        <Select onValueChange={setSelectedCourseId} disabled={coursesLoading}>
          <SelectTrigger className="w-full h-11 text-base bg-white dark:bg-slate-800">
            <SelectValue placeholder="Sélectionnez un cours..." />
          </SelectTrigger>
          <SelectContent>
            {courses?.map(course => <SelectItem key={course.id} value={course.id}>{course.title}</SelectItem>)}
          </SelectContent>
        </Select>

        {selectedCourseId && <AnnouncementForm courseId={selectedCourseId} />}
      </div>

      <div className="lg:col-span-2 space-y-4">
        <h2 className="font-semibold text-lg text-slate-900 dark:text-white">2. Historique des annonces</h2>
        {selectedCourseId ? (
          announcementsLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : announcements && announcements.length > 0 ? (
            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
              {announcements.map(announcement => (
                <AnnouncementCard key={announcement.id} announcement={announcement} />
              ))}
            </div>
          ) : (
            <div className="text-center py-20 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
              <Megaphone className="mx-auto h-12 w-12 text-slate-400" />
              <h3 className="mt-4 text-lg font-semibold text-slate-600 dark:text-slate-300">Aucune annonce envoyée</h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-muted-foreground">Les messages envoyés à vos étudiants apparaîtront ici.</p>
            </div>
          )
        ) : (
          <div className="text-center py-20 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
             <Frown className="mx-auto h-12 w-12 text-slate-400" />
            <h3 className="mt-4 text-lg font-semibold text-slate-600 dark:text-slate-300">Aucun cours sélectionné</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-muted-foreground">Veuillez d'abord sélectionner un cours.</p>
          </div>
        )}
      </div>
    </div>
  );
}