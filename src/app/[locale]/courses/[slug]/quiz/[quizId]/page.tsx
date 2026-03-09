'use client';

/**
 * @fileOverview Interface de quiz sécurisée.
 * Parent unifié [slug] pour la cohérence du routage.
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
  const slug = params.slug as string; // Paramètre unifié
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

  const quizRef = useMemo(() => doc(db, 'quizzes', quizId), [db, quizId]);
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

  const handleAnswerSelect = (optionIndex: number) => {
    const currentQuestionId = questions[currentQuestionIndex].id;
    setAnswers(prev => ({ ...prev, [currentQuestionId]: optionIndex }));
  };

  const handleSubmit = async () => {
    if (!user) return;
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
        score: percentageScore,
        submittedAt: serverTimestamp(),
      });
    } catch (e) {
      console.error(e);
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
            <Card className="w-full max-w-lg text-center dark:bg-slate-800">
                <CardHeader>
                    <Award className="mx-auto h-16 w-16 text-amber-500 mb-4" />
                    <CardTitle className="text-2xl font-bold dark:text-white">Résultats</CardTitle>
                    <CardDescription>{quiz?.title}</CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-6xl font-bold text-primary">{finalScore}%</p>
                </CardContent>
                <CardFooter>
                    <Button onClick={() => router.push(`/student/courses/${slug}`)} className="w-full">Continuer</Button>
                </CardFooter>
            </Card>
        </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];

  return (
    <div className="flex flex-col h-screen p-4 bg-slate-950">
      <header className="flex items-center gap-2 mb-4">
        <Button variant="ghost" size="sm" onClick={() => router.push(`/student/courses/${slug}`)} className="text-slate-400">
          <ArrowLeft className="h-4 w-4 mr-2" /> Retour
        </Button>
      </header>
      <div className="w-full max-w-2xl mx-auto flex-1">
        <Progress value={((currentQuestionIndex + 1) / questions.length) * 100} className="mb-6" />
        <Card className="dark:bg-slate-800">
            <CardContent className="p-6">
                <h2 className="text-lg font-semibold mb-6">{currentQuestion?.text}</h2>
                <RadioGroup onValueChange={(v) => handleAnswerSelect(parseInt(v, 10))}>
                    {currentQuestion?.options.map((opt, i) => (
                        <div key={i} className="flex items-center space-x-3 p-2">
                            <RadioGroupItem value={i.toString()} id={`q-${i}`} />
                            <label htmlFor={`q-${i}`} className="text-slate-200">{opt.text}</label>
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
