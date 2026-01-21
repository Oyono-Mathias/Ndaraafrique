'use client';

import { AdminAssistantClient } from '@/components/admin/assistant-client';

export default function AdminAssistantPage() {
  return (
    <div>
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-white">Assistant IA Mathias</h1>
        <p className="text-muted-foreground">Votre copilote pour les tâches administratives. Créez des promotions, des annonces, et plus encore.</p>
      </header>
      <AdminAssistantClient />
    </div>
  );
}
