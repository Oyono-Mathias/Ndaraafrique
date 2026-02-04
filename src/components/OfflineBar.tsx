
'use client';

import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';

export function OfflineBar() {
  const isOnline = useOnlineStatus();

  return (
    <div
      className={cn(
        "fixed top-0 left-0 right-0 z-[10001] transition-all duration-500 ease-in-out overflow-hidden flex items-center justify-center bg-amber-500 text-amber-950 text-[10px] font-bold uppercase tracking-widest",
        isOnline ? "h-0" : "h-6 shadow-md"
      )}
    >
      <div className="flex items-center gap-2">
        <WifiOff className="h-3 w-3" />
        <span>Mode Hors-Ligne Actif</span>
      </div>
    </div>
  );
}
