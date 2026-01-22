'use client';

import { PaymentsTable } from '@/components/admin/payments/payments-table';

export default function AdminPaymentsPage() {
  return (
    <div className="space-y-6">
       <header>
        <h1 className="text-3xl font-bold text-white">Gestion des Transactions</h1>
        <p className="text-muted-foreground">Consultez et gérez l'historique de tous les paiements sur la plateforme.</p>
      </header>
      <PaymentsTable />
    </div>
  );
}
