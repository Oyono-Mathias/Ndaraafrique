'use client';

/**
 * @fileOverview Gestionnaire d'Annonces (Client).
 * Affiche l'historique des messages envoyés par le formateur.
 */

import { useState, useMemo } from 'react';
import { useCollection } from '@/firebase';
import { getFirestore, collection, query, where, orderBy, limit } from 'firebase/firestore';
import { useRole } from '@/context/RoleContext';
import type { Course, Announcement } from '@/lib/types';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { AnnouncementForm } from './AnnouncementForm';
import { Frown, History, Clock, BookOpen, Megaphone } from 'lucide-react';

const AnnouncementHistoryCard = ({ announcement }: { announcement: Announcement }) => {
  const date = (announcement.createdAt as any)?.toDate?.() || new Date();
  
  return (
    <Card className="bg-slate-900 border-slate-800 overflow-hidden rounded-[1.5rem] shadow-xl animate-in fade-in slide-in-from-bottom-2 duration-500">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2 text-[9px] font-black text-primary uppercase tracking-widest mb-1">
            <BookOpen className="h-3 w-3" />
            {announcement.courseTitle || 'Formation'}
        </div>
        <CardTitle className="text-base font-bold text-white uppercase tracking-tight">{announcement.title}</CardTitle>
        <CardDescription className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase">
          <Clock className="h-3 w-3" />
          {format(date, 'd MMMM yyyy à HH:mm', { locale: fr })}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-slate-400 leading-relaxed font-medium italic border-l-2 border-slate-800 pl-4">
            "{announcement.message}"
        </p>
      </CardContent>
    </Card>
  );
};

export function AnnouncementsClient() {
  const db = getFirestore();
  const { currentUser } = useRole();

  // 1. Récupérer les cours pour le sélecteur
  const coursesQuery = useMemo(
    () => currentUser ? query(collection(db, 'courses'), where('instructorId', '==', currentUser.uid), where('status', '==', 'Published')) : null,
    [db, currentUser]
  );
  const { data: courses, isLoading: coursesLoading } = useCollection<Course>(coursesQuery);

  // 2. Récupérer l'historique des annonces de l'instructeur
  const historyQuery = useMemo(
    () => currentUser ? query(
        collection(db, 'course_announcements'), 
        where('instructorId', '==', currentUser.uid),
        orderBy('createdAt', 'desc'),
        limit(20)
    ) : null,
    [db, currentUser]
  );
  const { data: history, isLoading: historyLoading } = useCollection<Announcement>(historyQuery);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      
      {/* --- FORMULAIRE --- */}
      <div className="lg:col-span-1">
        {coursesLoading ? (
            <Skeleton className="h-96 w-full rounded-[2rem] bg-slate-900" />
        ) : courses && courses.length > 0 ? (
            <AnnouncementForm courses={courses} />
        ) : (
            <Card className="bg-slate-900/50 border-slate-800 border-dashed rounded-[2rem] p-8 text-center opacity-40">
                <Frown className="h-12 w-12 mx-auto mb-4 text-slate-600" />
                <p className="text-xs font-bold uppercase tracking-widest">Aucune formation publiée disponible pour annonces.</p>
            </Card>
        )}
      </div>

      {/* --- HISTORIQUE --- */}
      <div className="lg:col-span-2 space-y-6">
        <div className="flex items-center gap-2 text-slate-500 ml-2">
            <History className="h-4 w-4" />
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em]">Historique des diffusions</h3>
        </div>

        {historyLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-[1.5rem] bg-slate-900" />)}
          </div>
        ) : history && history.length > 0 ? (
          <div className="grid gap-4">
            {history.map(item => (
              <AnnouncementHistoryCard key={item.id} announcement={item} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center bg-slate-900/20 rounded-[2.5rem] border-2 border-dashed border-slate-800/50 opacity-20">
            <Megaphone className="h-16 w-16 text-slate-700 mb-4" />
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">Aucune annonce enregistrée</p>
          </div>
        )}
      </div>
    </div>
  );
}
