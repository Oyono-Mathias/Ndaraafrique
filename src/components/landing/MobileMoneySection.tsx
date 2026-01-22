
'use client';

import { cn } from "@/lib/utils";

const paymentMethods = [
  { name: 'MTN Mobile Money', logoClass: 'bg-mtn-yellow', textClass: 'text-black', logoText: 'MTN' },
  { name: 'Orange Money', logoClass: 'bg-orange-money', textClass: 'text-white', logoText: 'orange' },
  { name: 'Wave', logoClass: 'bg-wave-blue', textClass: 'text-white', logoText: 'wave' },
];

const PaymentCard = ({ method, onTrackClick }: { method: typeof paymentMethods[0], onTrackClick: (provider: string) => void }) => (
    <button
        onClick={() => onTrackClick(method.name)}
        className="group w-full p-4 bg-slate-800/50 rounded-2xl border border-slate-700/80 transition-all duration-300 hover:border-primary/50 hover:-translate-y-2 hover:shadow-2xl hover:shadow-primary/10 focus:outline-none focus:ring-2 focus:ring-primary/80"
    >
        <div className={cn("flex items-center justify-center h-20 w-full rounded-lg shadow-lg", method.logoClass)}>
            <span className={cn("font-black text-3xl", method.textClass)}>{method.logoText}</span>
        </div>
        <p className="mt-4 text-sm font-semibold text-slate-300 group-hover:text-white transition-colors">{method.name}</p>
    </button>
);


export function MobileMoneySection({ onTrackClick }: { onTrackClick: (provider: string) => void }) {
  return (
    <section className="py-16 md:py-24 text-center">
      <h2 className="text-3xl md:text-4xl font-extrabold text-white">
        Payez simplement. Sans carte bancaire.
      </h2>
      <p className="mt-4 text-lg text-slate-400 max-w-xl mx-auto">
        Utilisez votre compte Mobile Money pour un accès instantané, sécurisé et sans tracas à toutes nos formations.
      </p>

      <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl mx-auto">
        {paymentMethods.map((method) => (
            <PaymentCard key={method.name} method={method} onTrackClick={onTrackClick} />
        ))}
      </div>
    </section>
  );
}
