'use client';

import { CertificatesClient } from '@/components/instructor/certificates/CertificatesClient';

export default function InstructorCertificatesPage() {
  return (
    <div className="space-y-8 bg-slate-50 dark:bg-slate-900/50 p-6 -m-6 rounded-2xl min-h-full">
      <header>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Certificats Décernés</h1>
        <p className="text-slate-500 dark:text-muted-foreground">Consultez les certificats obtenus par vos étudiants.</p>
      </header>
      <CertificatesClient />
    </div>
  );
}
