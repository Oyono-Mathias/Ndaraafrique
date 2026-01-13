
'use client';

import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export function OnlineStatusIndicator() {
  const isOnline = useOnlineStatus();

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1.5 cursor-help">
            <span
              className={cn(
                'h-2.5 w-2.5 rounded-full ring-2 ring-background',
                isOnline ? 'bg-green-500' : 'bg-red-500'
              )}
            />
            {!isOnline && <span className="text-xs text-red-400">Hors ligne</span>}
          </div>
        </TooltipTrigger>
        <TooltipContent className="dark:bg-slate-900 dark:border-slate-700">
          <p>{isOnline ? 'Vous êtes actuellement en ligne.' : 'Vous êtes hors ligne. Certaines fonctionnalités peuvent être limitées.'}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
