'use client';

import { StudentsClient } from '@/components/instructor/students/StudentsClient';

export default function StudentsPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-white">Mes Étudiants</h1>
        <p className="text-muted-foreground">
          Suivi des apprenants inscrits à vos formations.
        </p>
      </header>
      <StudentsClient />
    </div>
  );
}
