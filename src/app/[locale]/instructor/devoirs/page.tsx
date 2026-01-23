
'use client';

import { AssignmentsClient } from '@/components/instructor/assignments/AssignmentsClient';

export default function DevoirsPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-white">Devoirs</h1>
        <p className="text-muted-foreground">Consultez et notez les travaux soumis par vos étudiants.</p>
      </header>
      <AssignmentsClient />
    </div>
  );
}
