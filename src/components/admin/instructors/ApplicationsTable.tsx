'use client';

/**
 * @fileOverview File d'attente des Candidatures - Design Qwen Cards.
 * ✅ ANDROID-FIRST : Cartes tactiles avec indicateurs de temps.
 */

import { useState, useMemo } from 'react';
import { useCollection } from '@/firebase';
import { getFirestore, collection, query, where } from 'firebase/firestore';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { NdaraUser } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Clock, ChevronRight, UserCheck, Frown } from 'lucide-react';
import { ApplicationDetailsModal } from './ApplicationDetailsModal';
import { cn } from '@/lib/utils';

export function ApplicationsTable() {
  const db = getFirestore();
  const [selectedApplication, setSelectedApplication] = useState<NdaraUser | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const applicationsQuery = useMemo(
    () => query(collection(db, 'users'), where('role', '==', 'instructor'), where('isInstructorApproved', '==', false)),
    [db]
  );
  const { data: rawApplications, isLoading } = useCollection<NdaraUser>(applicationsQuery);

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

  return (
    <>
      <ApplicationDetailsModal 
        isOpen={isModalOpen}
        onOpenChange={setIsModalOpen}
        application={selectedApplication}
        onActionComplete={() => setIsModalOpen(false)}
      />

      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
            <h2 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em]">File d'attente</h2>
            <Badge className="bg-primary/10 text-primary border-none text-[9px] font-black uppercase px-2">{applications.length} En cours</Badge>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-[2rem] bg-slate-900" />)}
          </div>
        ) : applications.length > 0 ? (
          <div className="grid gap-3">
            {applications.map(app => (
              <button
                key={app.uid}
                onClick={() => handleViewDetails(app)}
                className="w-full text-left bg-slate-900/60 backdrop-blur-xl border border-white/5 rounded-[2rem] p-4 flex items-center gap-4 transition-all active:scale-[0.98] group relative overflow-hidden shadow-xl"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-3xl -mr-12 -mt-12 group-hover:bg-primary/10 transition-all" />
                
                <div className="relative flex-shrink-0">
                    <Avatar className="h-16 w-16 border-2 border-white/10 shadow-2xl">
                        <AvatarImage src={app.profilePictureURL} className="object-cover" />
                        <AvatarFallback className="bg-slate-800 text-slate-500 font-black uppercase">
                            {app.fullName?.charAt(0)}
                        </AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-ndara-ochre rounded-full border-2 border-slate-900 flex items-center justify-center shadow-lg">
                        <Clock className="w-3 h-3 text-white" />
                    </div>
                </div>

                <div className="flex-1 min-w-0 pt-1">
                    <h3 className="font-black text-white text-base truncate uppercase tracking-tight">{app.fullName}</h3>
                    <p className="text-primary text-xs font-bold truncate tracking-tight mb-2">
                        Spécialité : {app.instructorApplication?.specialty || 'Non spécifié'}
                    </p>
                    <div className="flex items-center gap-3 text-[10px] font-bold text-slate-500 uppercase tracking-tighter">
                        <span className="bg-white/5 px-2 py-0.5 rounded border border-white/5">
                            Reçu {app.createdAt && typeof (app.createdAt as any).toDate === 'function' ? formatDistanceToNow((app.createdAt as any).toDate(), { locale: fr, addSuffix: true }) : 'récemment'}
                        </span>
                        <span>•</span>
                        <span className="truncate">{app.countryName || 'Afrique'}</span>
                    </div>
                </div>

                <ChevronRight className="h-5 w-5 text-slate-700 group-hover:text-primary transition-all mr-2" />
              </button>
            ))}
          </div>
        ) : (
          <div className="py-24 text-center bg-slate-900/20 border-2 border-dashed border-slate-800 rounded-[3rem] opacity-20">
            <UserCheck className="h-16 w-16 mx-auto mb-4 text-slate-700" />
            <p className="font-black uppercase tracking-widest text-xs">Aucun dossier à traiter</p>
          </div>
        )}
      </div>
    </>
  );
}
