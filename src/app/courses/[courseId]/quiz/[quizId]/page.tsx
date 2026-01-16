
'use client';

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
import { useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, ArrowLeft, Send, Check, X, Award } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import type { Course, Quiz, Question, QuizAttempt } from '@/lib/types';
import { cn } from '@/lib/utils';
import confetti from 'canvas-confetti';

export default function TakeQuizPage() {
  const { courseId, quizId } = useParams();
  const router = useRouter();
  const { user } = useRole();
  const db = getFirestore();
  const { toast } = useToast();

  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [finalScore, setFinalScore] = useState<number | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  const quizRef = useMemoFirebase(() => doc(db, 'quizzes', quizId as string), [db, quizId]);
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

  const isLoading = isQuizLoading || questions.length === 0;

  const handleAnswerSelect = (optionIndex: number) => {
    const currentQuestionId = questions[currentQuestionIndex].id;
    setAnswers(prev => ({ ...prev, [currentQuestionId]: optionIndex }));
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const handleSubmit = async () => {
    if (!user || Object.keys(answers).length !== questions.length) {
      toast({ variant: 'destructive', title: 'Erreur', description: 'Veuillez répondre à toutes les questions.' });
      return;
    }
    setIsSubmitting(true);
    let score = 0;
    questions.forEach(q => {
      if (answers[q.id] === q.correctOptionIndex) {
        score++;
      }
    });
    const percentageScore = Math.round((score / questions.length) * 100);
    setFinalScore(percentageScore);
    
    if (percentageScore >= 50) {
        confetti({
            particleCount: 150,
            spread: 70,
            origin: { y: 0.6 },
        });
    }

    try {
      const attemptId = `${user.uid}_${quizId}`;
      const attemptRef = doc(db, `quizzes/${quizId}/attempts`, attemptId);
      await setDoc(attemptRef, {
        userId: user.uid,
        quizId,
        courseId,
        answers,
        score: percentageScore,
        submittedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("Error saving quiz attempt:", error);
      toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de sauvegarder vos résultats.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentQuestion = questions[currentQuestionIndex];

  if (isLoading) {
    return <div className="flex h-full w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }
  
  if (finalScore !== null) {
      return (
          <div className="flex flex-col items-center justify-center h-full p-4">
              <Card className="w-full max-w-lg text-center dark:bg-slate-800 dark:border-slate-700">
                  <CardHeader>
                      <Award className="mx-auto h-16 w-16 text-amber-500 mb-4" />
                      <CardTitle className="text-2xl font-bold dark:text-white">Résultats du Quiz</CardTitle>
                      <CardDescription className="dark:text-slate-400">{quiz?.title}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                      <p className="text-6xl font-bold text-primary">{finalScore}%</p>
                      <p className="text-muted-foreground">{finalScore >= 50 ? "Félicitations, vous avez réussi !" : "Vous pouvez faire mieux, réessayez !"}</p>
                  </CardContent>
                  <CardFooter className="flex-col gap-3">
                      <Button onClick={() => router.push(`/courses/${courseId}`)} className="w-full">
                          Retourner au cours
                      </Button>
                      {finalScore < 100 && (
                          <Button variant="outline" onClick={() => {
                            setFinalScore(null);
                            setCurrentQuestionIndex(0);
                            setAnswers({});
                          }} className="w-full">
                            Réessayer le quiz
                          </Button>
                      )}
                  </CardFooter>
              </Card>
          </div>
      )
  }

  return (
    <div className="flex flex-col h-full p-4">
      <header className="flex items-center gap-2 mb-4">
        <Button variant="ghost" size="sm" onClick={() => router.push(`/courses/${courseId}`)}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Retour au cours
        </Button>
      </header>
      <div className="w-full max-w-2xl mx-auto flex-1 flex flex-col">
        <div className="text-center mb-4">
          <h1 className="text-2xl font-bold text-white">{quiz?.title}</h1>
          <p className="text-sm text-slate-400">Question {currentQuestionIndex + 1} sur {questions.length}</p>
        </div>
        <Progress value={((currentQuestionIndex + 1) / questions.length) * 100} className="w-full h-2 mb-6" />
        
        <Card className="flex-1 flex flex-col dark:bg-slate-800 dark:border-slate-700">
            <CardContent className="p-6 flex-1 flex flex-col justify-between">
                <div>
                  <h2 className="text-lg font-semibold mb-6 dark:text-white">{currentQuestion?.text}</h2>
                  <RadioGroup
                    onValueChange={(value) => handleAnswerSelect(parseInt(value, 10))}
                    value={answers[currentQuestion?.id]?.toString()}
                    className="space-y-3"
                  >
                    {currentQuestion?.options.map((option, index) => (
                      <div key={index} className="flex items-center space-x-3">
                        <RadioGroupItem value={index.toString()} id={`q${currentQuestionIndex}-o${index}`} />
                        <label htmlFor={`q${currentQuestionIndex}-o${index}`} className="font-normal text-base text-slate-200 cursor-pointer">{option}</label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
                <div className="flex justify-end items-center mt-6">
                    {currentQuestionIndex < questions.length - 1 ? (
                        <Button onClick={handleNext} disabled={answers[currentQuestion?.id] === undefined}>
                            Question suivante
                        </Button>
                    ) : (
                        <Button onClick={handleSubmit} disabled={isSubmitting}>
                            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                            Terminer & Voir le résultat
                        </Button>
                    )}
                </div>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
