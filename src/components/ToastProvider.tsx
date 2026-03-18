'use client';

import { useToastStore } from '@/hooks/useToast';
import { CheckCircle, XCircle, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ToastProvider() {
  const { toasts, dismiss } = useToastStore();

  const variants = {
    success: 'bg-[#10B981]/90 border-[#10B981]',
    error: 'bg-[#EF4444]/90 border-[#EF4444]',
    info: 'bg-[#3B82F6]/90 border-[#3B82F6]',
  };

  const icons = {
    success: <CheckCircle className="w-5 h-5" />,
    error: <XCircle className="w-5 h-5" />,
    info: <Info className="w-5 h-5" />,
  };

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[200] space-y-2 w-full max-w-md px-4 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            'glass-dark rounded-full px-6 py-3 flex items-center gap-3 shadow-lg backdrop-blur-md border animate-slide-up pointer-events-auto',
            variants[toast.variant]
          )}
        >
          <div className="text-white">{icons[toast.variant]}</div>
          <div className="flex-1">
            <p className="text-white text-sm font-bold">{toast.title}</p>
            {toast.description && (
              <p className="text-white/80 text-xs">{toast.description}</p>
            )}
          </div>
          <button
            onClick={() => dismiss(toast.id)}
            className="text-white/60 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
