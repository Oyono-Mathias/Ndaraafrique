'use client';

import { useState, useEffect } from 'react';

export type ToastVariant = 'success' | 'error' | 'info';

export interface Toast {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
}

let memoryToasts: Toast[] = [];
let listeners: Array<(toasts: Toast[]) => void> = [];

const notify = () => {
  listeners.forEach((listener) => listener([...memoryToasts]));
};

/**
 * Fonction globale pour déclencher un toast depuis n'importe quelle action (Server ou Client)
 */
export const toast = (newToast: Omit<Toast, 'id'>) => {
  const id = Math.random().toString(36).substring(2, 9);
  const toastWithId = { ...newToast, id };
  memoryToasts = [...memoryToasts, toastWithId];
  notify();

  // Auto-dismiss après 5 secondes
  setTimeout(() => {
    dismissToast(id);
  }, 5000);
};

export const dismissToast = (id: string) => {
  memoryToasts = memoryToasts.filter((t) => t.id !== id);
  notify();
};

/**
 * Hook interne utilisé par le ToastProvider
 */
export function useToastStore() {
  const [toasts, setToasts] = useState<Toast[]>(memoryToasts);

  useEffect(() => {
    listeners.push(setToasts);
    return () => {
      listeners = listeners.filter((l) => l !== setToasts);
    };
  }, []);

  return { toasts, dismiss: dismissToast };
}
