'use client';

/**
 * @fileOverview Interface de quiz sécurisée pour les étudiants (Ancienne route).
 * Mise à jour pour utiliser 'slug' afin d'harmoniser le routage.
 */

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useRole } from '@/context/RoleContext';
import {
  getFirestore,
  doc,
  collection,
  query,
  getDocs,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { useDoc } from '@/firebase';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Loader2, ArrowLeft, Award } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import type { Quiz, Question } from '@/lib/types';
import confetti from 'canvas-confetti';

export default function TakeQuizPage() {
  const params = useParams();
  const slug = params.slug as string;
  const quizId = params.quizId as string;
  const router = useRouter();
  const { user } = useRole();
  const db = getFirestore();
  const { toast } = useToast();

  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [finalScore, setFinalScore] = useState<number | null>(null);

  const quizRef = useMemo(() => doc(db, 'quizzes', quizId as string), [db, quizId]);
  const { data: quiz, isLoading: isQuizLoading } = useDoc<Quiz>(quizRef);

  useEffect(() => {
    if (quiz) {
      const fetchQuestions = async () => {
        const questionsQuery = query(collection(db, `quizzes/${quizId}/questions`));
        const questionsSnap = await getDocs(questionsQuery);
        setQuestions(questionsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Question)));
      };
      fetchQuestions();
    }
  }, [quiz, db, quizId]);

  const handleSubmit = async () => {
    if (!user || Object.keys(answers).length !== questions.length) {
      toast({ variant: 'destructive', title: 'Erreur', description: 'Veuillez répondre à toutes les questions.' });
      return;
    }
    setIsSubmitting(true);
    let score = 0;
    questions.forEach(q => {
      const correctIndex = q.options.findIndex(opt => opt.isCorrect);
      if (answers[q.id] === correctIndex) score++;
    });
    const percentageScore = Math.round((score / questions.length) * 100);
    setFinalScore(percentageScore);
    
    if (percentageScore >= 50) confetti({ particleCount: 150, spread: 70 });

    try {
      const attemptId = `${user.uid}_${quizId}`;
      const attemptRef = doc(db, `quizzes/${quizId}/attempts`, attemptId);
      await setDoc(attemptRef, {
        userId: user.uid,
        quizId,
        courseId: slug,
        answers,
        score: percentageScore,
        submittedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isQuizLoading || (questions.length === 0 && finalScore === null)) {
    return <div className="flex h-screen w-full items-center justify-center bg-slate-950"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }
  
  if (finalScore !== null) {
      return (
          <div className="flex flex-col items-center justify-center h-screen p-4 bg-slate-950">
              <Card className="w-full max-w-lg text-center dark:bg-slate-800 rounded-[2.5rem]">
                  <CardHeader>
                      <Award className="mx-auto h-16 w-16 text-amber-500 mb-4" />
                      <CardTitle className="text-2xl font-bold dark:text-white">Résultats</CardTitle>
                      <CardDescription>{quiz?.title}</CardDescription>
                  </CardHeader>
                  <CardContent>
                      <p className="text-6xl font-black text-primary">{finalScore}%</p>
                  </CardContent>
                  <CardFooter>
                      <Button onClick={() => router.push(`/courses/${slug}`)} className="w-full h-14 rounded-2xl">Continuer</Button>
                  </CardFooter>
              </Card>
          </div>
      )
  }

  const currentQuestion = questions[currentQuestionIndex];

  return (
    <div className="flex flex-col h-screen p-4 bg-slate-950">
      <header className="flex items-center gap-2 mb-4">
        <Button variant="ghost" size="sm" onClick={() => router.push(`/courses/${slug}`)} className="text-slate-400">
          <ArrowLeft className="h-4 w-4 mr-2" /> Retour
        </Button>
      </header>
      <div className="w-full max-w-2xl mx-auto flex-1">
        <Progress value={((currentQuestionIndex + 1) / questions.length) * 100} className="mb-6" />
        <Card className="dark:bg-slate-800 rounded-3xl overflow-hidden shadow-xl">
            <CardContent className="p-8">
                <h2 className="text-xl font-bold mb-8 text-white">{currentQuestion?.text}</h2>
                <RadioGroup onValueChange={(v) => setAnswers(prev => ({...prev, [currentQuestion.id]: parseInt(v)}))}>
                    {currentQuestion?.options.map((opt, i) => (
                        <div key={i} className="flex items-center space-x-3 p-4 bg-slate-900/50 rounded-xl mb-3 border border-white/5">
                            <RadioGroupItem value={i.toString()} id={`q-${i}`} />
                            <label htmlFor={`q-${i}`} className="text-slate-300 font-medium cursor-pointer">{opt.text}</label>
                        </div>
                    ))}
                </RadioGroup>
                <div className="mt-8 flex justify-end">
                    {currentQuestionIndex < questions.length - 1 ? (
                        <Button onClick={() => setCurrentQuestionIndex(prev => prev + 1)}>Suivant</Button>
                    ) : (
                        <Button onClick={handleSubmit} disabled={isSubmitting}>Terminer</Button>
                    )}
                </div>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
