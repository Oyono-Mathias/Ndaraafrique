'use client';

import { CoursesTable } from '@/components/admin/courses/courses-table';

export default function AdminCoursesPage() {
  return (
    <div className="space-y-6">
       <header>
        <h1 className="text-3xl font-bold text-white">Gestion des Cours</h1>
        <p className="text-muted-foreground">Recherchez, filtrez et gérez tous les cours de la plateforme.</p>
      </header>
      <CoursesTable />
    </div>
  );
}
