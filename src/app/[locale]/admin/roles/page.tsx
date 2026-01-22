'use client';

import { RolesManager } from '@/components/admin/roles/roles-manager';

export default function AdminRolesPage() {
  return (
    <div className="space-y-6">
       <header>
        <h1 className="text-3xl font-bold text-white">Rôles & Permissions</h1>
        <p className="text-muted-foreground">Définissez précisément ce que chaque rôle peut faire sur la plateforme.</p>
      </header>
      <RolesManager />
    </div>
  );
}
