
import type { Metadata } from 'next';

// This function communicates directly with Google and runs on the server.
export async function generateMetadata({ params }: { params: { courseId: string } }): Promise<Metadata> {
  // In the absence of an initialized admin SDK, we cannot use client functions here.
  // For now, we return generic metadata. A future implementation
  // could fetch data via an API or the Firebase admin SDK.

  return {
    title: `Détails du Cours | Ndara Afrique`,
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

    