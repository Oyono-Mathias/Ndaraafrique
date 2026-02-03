
'use client';

import { cn } from "@/lib/utils";

const paymentMethods = [
  { name: 'MTN', logoClass: 'bg-yellow-400', textClass: 'text-black', logoText: 'MTN' },
  { name: 'Orange', logoClass: 'bg-[#FF6600]', textClass: 'text-white', logoText: 'OM' },
  { name: 'Wave', logoClass: 'bg-[#00A3E0]', textClass: 'text-white', logoText: 'W' },
];

export function MobileMoneySection({ onTrackClick }: { onTrackClick: (provider: string) => void }) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {paymentMethods.map((method) => (
        <button
          key={method.name}
          onClick={() => onTrackClick(method.name)}
          className="flex flex-col items-center gap-2 focus:outline-none active:scale-95 transition-transform"
        >
          <div className={cn(
            "h-12 w-12 rounded-xl flex items-center justify-center shadow-lg font-black text-sm",
            method.logoClass,
            method.textClass
          )}>
            {method.logoText}
          </div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
            {method.name}
          </span>
        </button>
      ))}
    </div>
  );
}
