import { format, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

/**
 * Convertit de manière sécurisée un Timestamp/FieldValue Firestore en Date.
 * Utile pour éviter les erreurs de build Vercel.
 */
export function safeToDate(date: any): Date | null {
  if (!date) return null;
  if (typeof date.toDate === 'function') return date.toDate();
  if (date instanceof Date) return date;
  return null;
}

/**
 * Formate une date Firestore en format relatif (ex: "il y a 2 min")
 */
export function formatRelativeSafe(date: any): string {
  const d = safeToDate(date);
  if (!d) return "...";
  return formatDistanceToNow(d, { locale: fr, addSuffix: true });
}

/**
 * Formate une date Firestore en format fixe
 */
export function formatSafe(date: any, pattern: string = 'd MMMM yyyy'): string {
  const d = safeToDate(date);
  if (!d) return "...";
  return format(d, pattern, { locale: fr });
}