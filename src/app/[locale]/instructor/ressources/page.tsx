'use client';

import { ResourcesClient } from '@/components/instructor/resources/ResourcesClient';

export default function ResourcesPage() {
  return (
    <div className="space-y-6 bg-slate-50 dark:bg-slate-900/50 p-6 -m-6 rounded-2xl min-h-full">
      <header>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Ressources</h1>
        <p className="text-slate-500 dark:text-muted-foreground">
          Partagez des fichiers, des liens et d'autres ressources avec vos étudiants.
        </p>
      </header>
      <ResourcesClient />
    </div>
  );
}
