'use client';

import { redirect } from 'next/navigation';
import { useEffect } from 'react';

/**
 * @fileOverview Page de redirection pour éviter les conflits de routage hors locale.
 */
export default function TutorRedirect() {
  useEffect(() => {
    redirect('/fr/student/tutor');
  }, []);

  return null;
}
