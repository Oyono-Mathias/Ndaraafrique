import { format, formatDistanceToNow, isValid } from 'date-fns';
import { fr } from 'date-fns/locale';

/**
 * Convertit de manière sécurisée un Timestamp/FieldValue Firestore en Date.
 * Gère les objets Timestamp, les dates JS, les nombres, les strings et les objets sérialisés.
 */
export function safeToDate(date: any): Date {
  if (!date) return new Date(0);
  
  // 1. Firestore Timestamp (méthode native)
  if (typeof date.toDate === 'function') return date.toDate();
  
  // 2. Date JS déjà instanciée
  if (date instanceof Date) return isValid(date) ? date : new Date(0);
  
  // 3. Timestamp Firestore sérialisé en JSON { seconds, nanoseconds }
  if (date && typeof date === 'object' && typeof date.seconds === 'number') {
    return new Date(date.seconds * 1000);
  }

  // 4. Nombre (ms) ou String
  if (typeof date === 'number' || typeof date === 'string') {
    const d = new Date(date);
    return isValid(d) ? d : new Date(0);
  }
  
  return new Date(0);
}

/**
 * Formate une date Firestore en format relatif (ex: "il y a 2 min")
 */
export function formatRelativeSafe(date: any): string {
  const d = safeToDate(date);
  if (d.getTime() === 0) return "...";
  return formatDistanceToNow(d, { locale: fr, addSuffix: true });
}

/**
 * Formate une date Firestore en format fixe
 */
export function formatSafe(date: any, pattern: string = 'd MMMM yyyy'): string {
  const d = safeToDate(date);
  if (d.getTime() === 0) return "...";
  return format(d, pattern, { locale: fr });
}
