'use client';

import { QnaClient } from '@/components/instructor/qna/QnaClient';

export default function QAPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-white">Questions & Réponses</h1>
        <p className="text-muted-foreground">Répondez aux questions des étudiants sur vos cours.</p>
      </header>
      <QnaClient />
    </div>
  );
}
