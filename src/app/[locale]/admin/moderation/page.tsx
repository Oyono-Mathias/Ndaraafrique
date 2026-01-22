'use client';

import { ModerationQueue } from '@/components/admin/moderation/ModerationQueue';

export default function AdminModerationPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-white">Modération du Contenu</h1>
        <p className="text-muted-foreground">Examinez et approuvez les nouveaux cours soumis par les instructeurs.</p>
      </header>
      <ModerationQueue />
    </div>
  );
}
