'use client';

import { QnaClient } from '@/components/instructor/qna/QnaClient';

export default function QAPage() {
  return (
    <div className="space-y-6 bg-slate-50 dark:bg-slate-900/50 p-6 -m-6 rounded-2xl min-h-full">
      <header>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Questions & Réponses</h1>
        <p className="text-slate-500 dark:text-muted-foreground">Répondez aux questions des étudiants sur vos cours.</p>
      </header>
      <QnaClient />
    </div>
  );
}
