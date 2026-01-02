
import type { Metadata } from 'next';

// Cette fonction parle directement à Google et s'exécute sur le serveur
export async function generateMetadata({ params }: { params: { courseId: string } }): Promise<Metadata> {
  // En l'absence d'un SDK admin initialisé, nous ne pouvons pas utiliser de fonctions client ici.
  // Pour l'instant, on retourne des métadonnées génériques. Une implémentation future
  // pourrait récupérer les données via une API ou le SDK admin Firebase.

  return {
    title: `Détails du Cours | FormaAfrique`,
    description: `Apprenez avec des experts. Accès immédiat et attestation de réussite.`,
  };
}

export default function CourseDetailsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
