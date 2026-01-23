'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ClipboardCheck } from 'lucide-react';

export default function MesDevoirsPage() {
  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold text-white">Mes devoirs</h1>
        <p className="text-muted-foreground">Consultez les devoirs à faire et vos notes.</p>
      </header>
      <Card className="dark:bg-slate-800/50 dark:border-slate-700/80">
        <CardContent className="pt-6 text-center text-muted-foreground">
          <div className="flex flex-col items-center gap-4 p-8">
            <ClipboardCheck className="h-16 w-16 text-slate-600" />
            <h3 className="text-xl font-semibold text-slate-300">Bientôt disponible</h3>
            <p className="max-w-sm">Cette section est en cours de construction. Vous pourrez bientôt soumettre vos devoirs et consulter vos notes ici.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
