'use client';

export default function AdminSupportTicketPage({ params }: { params: { ticketId: string } }) {
  return (
    <div>
      <h1 className="text-2xl font-bold">Ticket de Support: {params.ticketId}</h1>
      <p className="text-muted-foreground">Cette section est en cours de construction.</p>
    </div>
  );
}
