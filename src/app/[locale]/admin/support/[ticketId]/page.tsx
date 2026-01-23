
'use client';

import { TicketDetailsClient } from '@/components/admin/support/TicketDetailsClient';
import { Link } from 'next-intl/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function AdminSupportTicketPage({ params }: { params: { ticketId: string } }) {
  return (
    <div className="space-y-6">
      <header>
        <Button variant="outline" asChild>
            <Link href="/admin/support">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour à la liste des tickets
            </Link>
        </Button>
      </header>
      <TicketDetailsClient ticketId={params.ticketId} />
    </div>
  );
}
