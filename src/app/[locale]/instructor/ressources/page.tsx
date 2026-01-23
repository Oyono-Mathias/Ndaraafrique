'use client';

import { ResourcesClient } from '@/components/instructor/resources/ResourcesClient';

export default function ResourcesPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-white">Ressources</h1>
        <p className="text-muted-foreground">
          Partagez des fichiers, des liens et d'autres ressources avec vos étudiants.
        </p>
      </header>
      <ResourcesClient />
    </div>
  );
}
