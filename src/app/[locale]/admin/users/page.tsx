'use client';

import { UsersTable } from '@/components/admin/users/users-table';

export default function AdminUsersPage() {
  return (
    <div className="space-y-6">
       <header>
        <h1 className="text-3xl font-bold text-white">Gestion des Utilisateurs</h1>
        <p className="text-muted-foreground">Recherchez, filtrez et gérez tous les membres de la plateforme.</p>
      </header>
      <UsersTable />
    </div>
  );
}
