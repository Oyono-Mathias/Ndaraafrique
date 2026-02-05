'use client';

import { AvisPageClient } from '@/components/instructor/avis/AvisPageClient';

export default function AvisPage() {
  return (
    <div className="space-y-8 bg-slate-50 dark:bg-slate-900/50 p-6 -m-6 rounded-2xl min-h-full">
      <header>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Avis des étudiants</h1>
        <p className="text-slate-500 dark:text-muted-foreground">Consultez les notes et commentaires laissés sur vos formations.</p>
      </header>
      <AvisPageClient />
    </div>
  );
}
