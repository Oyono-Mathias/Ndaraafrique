/**
 * @fileOverview Utilitaire de gestion des variables d'environnement serveur.
 * Garantit que les clés critiques sont présentes avant l'exécution.
 */

export function getRequiredEnv(name: string): string {
  if (typeof window !== 'undefined') {
    throw new Error(`La variable ${name} ne doit pas être accédée côté client.`);
  }

  const value = process.env[name];
  
  if (!value || value.trim() === '') {
    const errorMsg = `[CRITICAL] Variable d'environnement manquante ou vide : ${name}`;
    console.error(errorMsg);
    throw new Error(errorMsg);
  }

  return value.trim();
}
