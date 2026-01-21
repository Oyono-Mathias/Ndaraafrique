
'use client';
import { useTranslations } from 'next-intl';

export default function ResourcesPage() {
  const t = useTranslations();
  return (
    <div>
      <h1 className="text-2xl font-bold">Gérer les ressources</h1>
      <p className="text-muted-foreground">Cette section est en cours de construction.</p>
    </div>
  );
}
