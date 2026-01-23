'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { LifeBuoy } from 'lucide-react';

export default function StudentSupportPage() {
  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold text-white">Mes tickets de support</h1>
        <p className="text-muted-foreground">Suivez vos demandes d'assistance et communiquez avec notre équipe.</p>
      </header>
      <Card className="dark:bg-slate-800/50 dark:border-slate-700/80">
        <CardContent className="pt-6 text-center text-muted-foreground">
          <div className="flex flex-col items-center gap-4 p-8">
            <LifeBuoy className="h-16 w-16 text-slate-600" />
            <h3 className="text-xl font-semibold text-slate-300">Bientôt disponible</h3>
            <p className="max-w-sm">Créez et suivez vos tickets de support.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
