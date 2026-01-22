'use client';

import { ApplicationsTable } from '@/components/admin/instructors/ApplicationsTable';

export default function AdminInstructorsPage() {
  return (
    <div className="space-y-6">
       <header>
        <h1 className="text-3xl font-bold text-white">Candidatures Instructeurs</h1>
        <p className="text-muted-foreground">Examinez et approuvez les nouvelles demandes de formateurs.</p>
      </header>
      <ApplicationsTable />
    </div>
  );
}
