
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Wrench } from "lucide-react";

export default function AdminSettingsPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold dark:text-white">Paramètres</h1>
        <p className="text-muted-foreground dark:text-slate-400">Gérez la configuration globale de la plateforme FormaAfrique.</p>
      </header>

      <Card className="dark:bg-slate-800 dark:border-slate-700">
        <CardHeader>
          <CardTitle className="dark:text-white">Configuration de la plateforme</CardTitle>
          <CardDescription className="dark:text-slate-400">
            Cette section est en cours de développement.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center gap-4 text-center text-muted-foreground dark:text-slate-500 py-16 border-2 border-dashed dark:border-slate-700 rounded-lg">
            <Wrench className="h-12 w-12" />
            <p className="font-medium">Page en construction</p>
            <p className="text-sm max-w-sm">
                Les options pour configurer le nom du site, le logo, les clés API, les modes de paiement et les templates d'email seront bientôt disponibles ici.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
