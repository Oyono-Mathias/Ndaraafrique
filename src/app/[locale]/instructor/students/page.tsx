
'use client';

import { StudentsClient } from '@/components/instructor/students/StudentsClient';

export default function StudentsPage() {
  return (
    <div className="space-y-6 bg-slate-50 dark:bg-slate-900/50 p-6 -m-6 rounded-2xl min-h-full">
      <header>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Mes Étudiants</h1>
        <p className="text-slate-500 dark:text-muted-foreground">
          Suivi des apprenants inscrits à vos formations.
        </p>
      </header>
      <StudentsClient />
    </div>
  );
}
