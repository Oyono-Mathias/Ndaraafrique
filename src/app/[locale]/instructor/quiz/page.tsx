'use client';

import { QuizPageClient } from '@/components/instructor/quiz/QuizPageClient';

export default function InstructorQuizPage() {
  return (
    <div className="space-y-8 bg-slate-50 dark:bg-slate-900/50 p-6 -m-6 rounded-2xl min-h-full">
      <header>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Gestion des Quiz</h1>
        <p className="text-slate-500 dark:text-slate-400">Créez et gérez les évaluations pour vos formations.</p>
      </header>
      <QuizPageClient />
    </div>
  );
}
