'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

/**
 * @fileOverview Page de redirection pour éviter les conflits de routage hors locale.
 * ✅ RÉSOLU : Utilisation de router.replace.
 */
export default function TutorRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/fr/student/tutor');
  }, [router]);

  return null;
}
