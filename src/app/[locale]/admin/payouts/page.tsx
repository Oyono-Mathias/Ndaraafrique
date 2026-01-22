'use client';

import { PayoutsTable } from '@/components/admin/payouts/payouts-table';

export default function AdminPayoutsPage() {
  return (
    <div className="space-y-6">
       <header>
        <h1 className="text-3xl font-bold text-white">Gestion des Retraits</h1>
        <p className="text-muted-foreground">Approuvez ou rejetez les demandes de paiement des instructeurs.</p>
      </header>
      <PayoutsTable />
    </div>
  );
}
