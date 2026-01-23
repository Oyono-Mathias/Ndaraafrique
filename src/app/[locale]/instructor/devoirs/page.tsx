
'use client';

import { AssignmentsClient } from '@/components/instructor/assignments/AssignmentsClient';

export default function DevoirsPage() {
  return (
    <div className="space-y-6 bg-slate-50 dark:bg-slate-900/50 p-6 -m-6 rounded-2xl min-h-full">
      <header>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Devoirs</h1>
        <p className="text-slate-500 dark:text-muted-foreground">Consultez et notez les travaux soumis par vos étudiants.</p>
      </header>
      <AssignmentsClient />
    </div>
  );
}
