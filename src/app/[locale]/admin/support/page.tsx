
'use client';

import { TicketList } from '@/components/admin/support/TicketList';

export default function AdminSupportPage() {
  return (
    <div className="space-y-6">
       <header>
        <h1 className="text-3xl font-bold text-white">Tickets de Support</h1>
        <p className="text-muted-foreground">Gérez les demandes d'assistance des utilisateurs et des instructeurs.</p>
      </header>
      <TicketList />
    </div>
  );
}
