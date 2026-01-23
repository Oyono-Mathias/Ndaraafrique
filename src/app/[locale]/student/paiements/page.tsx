'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { CreditCard } from 'lucide-react';

export default function StudentPaymentsPage() {
  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold text-white">Historique des paiements</h1>
        <p className="text-muted-foreground">Consultez la liste de toutes vos transactions sur la plateforme.</p>
      </header>
      <Card className="dark:bg-slate-800/50 dark:border-slate-700/80">
        <CardContent className="pt-6 text-center text-muted-foreground">
          <div className="flex flex-col items-center gap-4 p-8">
            <CreditCard className="h-16 w-16 text-slate-600" />
            <h3 className="text-xl font-semibold text-slate-300">Bientôt disponible</h3>
            <p className="max-w-sm">Cette section est en cours de construction. Vous pourrez bientôt consulter l'historique de vos paiements ici.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
