
'use client';

import { AnnouncementsClient } from '@/components/instructor/announcements/AnnouncementsClient';

export default function AnnouncementsPage() {
  return (
    <div className="space-y-6 bg-slate-50 dark:bg-slate-900/50 p-6 -m-6 rounded-2xl min-h-full">
      <header>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Annonces</h1>
        <p className="text-slate-500 dark:text-muted-foreground">
          Communiquez avec tous les étudiants inscrits à un cours.
        </p>
      </header>
      <AnnouncementsClient />
    </div>
  );
}
