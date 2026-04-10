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
import confetti from 'canvas-confetti';
import { cn } from '@/lib/utils'; // ✅ Import ajouté pour corriger l'erreur de build

/**
 * ✅ RÉSOLU : Interfaces locales pour bypasser les erreurs de build Vercel
 */
interface QuestionOption {
  text: string;
  isCorrect: boolean;
}

interface Question {
  id: string;
  text: string;
  options: QuestionOption[];
}

interface Quiz {
  id: string;
  title: string;
  description?: string;
  courseId: string;
}

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
        setQuestions(questionsSnap.docs.map(d => ({ 
            id: d.id, 
            ...d.data() 
        } as Question)));
      };
      fetchQuestions();
    }
  }, [quiz, db, quizId]);

  const handleSubmit = async () => {
    if (!user || Object.keys(answers).length !== questions.length) {
      toast({ 
          variant: 'destructive', 
          title: 'Erreur', 
          description: 'Veuillez répondre à toutes les questions.' 
      });
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
      console.error("Erreur lors de l'enregistrement du score:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isQuizLoading || (questions.length === 0 && finalScore === null)) {
    return (
        <div className="flex h-screen w-full items-center justify-center bg-slate-950">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    );
  }
  
  if (finalScore !== null) {
      return (
          <div className="flex flex-col items-center justify-center h-screen p-4 bg-slate-950">
              <Card className="w-full max-w-lg text-center dark:bg-slate-800 rounded-[2.5rem] border-white/5 shadow-2xl">
                  <CardHeader>
                      <Award className="mx-auto h-16 w-16 text-amber-500 mb-4" />
                      <CardTitle className="text-2xl font-bold dark:text-white uppercase tracking-tighter">Résultats</CardTitle>
                      <CardDescription className="font-medium text-slate-400">{quiz?.title}</CardDescription>
                  </CardHeader>
                  <CardContent>
                      <p className="text-7xl font-black text-primary tracking-tighter">{finalScore}%</p>
                      <p className="mt-2 text-slate-500 text-xs font-bold uppercase tracking-widest">Score Final</p>
                  </CardContent>
                  <CardFooter>
                      <Button onClick={() => router.push(`/courses/${slug}`)} className="w-full h-14 rounded-2xl font-black uppercase text-xs tracking-widest">
                          Continuer la formation
                      </Button>
                  </CardFooter>
              </Card>
          </div>
      )
  }

  const currentQuestion = questions[currentQuestionIndex];

  return (
    <div className="flex flex-col h-screen p-4 bg-slate-950 font-sans">
      <header className="flex items-center gap-2 mb-4">
        <Button variant="ghost" size="sm" onClick={() => router.push(`/courses/${slug}`)} className="text-slate-400 hover:text-white">
          <ArrowLeft className="h-4 w-4 mr-2" /> Retour au cours
        </Button>
      </header>
      <div className="w-full max-w-2xl mx-auto flex-1 flex flex-col justify-center">
        <div className="mb-6 space-y-2">
            <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-500 px-1">
                <span>Question {currentQuestionIndex + 1} sur {questions.length}</span>
                <span>{Math.round(((currentQuestionIndex + 1) / questions.length) * 100)}%</span>
            </div>
            <Progress value={((currentQuestionIndex + 1) / questions.length) * 100} className="h-2 bg-slate-900" />
        </div>

        <Card className="dark:bg-slate-900/50 border-white/5 rounded-[2rem] overflow-hidden shadow-2xl backdrop-blur-sm">
            <CardContent className="p-8">
                <h2 className="text-xl font-bold mb-8 text-white leading-tight">{currentQuestion?.text}</h2>
                <RadioGroup 
                    value={answers[currentQuestion?.id]?.toString()}
                    onValueChange={(v) => setAnswers(prev => ({...prev, [currentQuestion.id]: parseInt(v)}))}
                >
                    {currentQuestion?.options.map((opt, i) => (
                        <div key={i} className={cn(
                            "flex items-center space-x-3 p-5 rounded-2xl mb-3 border transition-all duration-200",
                            answers[currentQuestion.id] === i 
                                ? "bg-primary/10 border-primary/40" 
                                : "bg-slate-900/50 border-white/5 hover:border-white/10"
                        )}>
                            <RadioGroupItem value={i.toString()} id={`q-${i}`} className="border-slate-600" />
                            <label htmlFor={`q-${i}`} className="text-slate-200 font-semibold cursor-pointer flex-1 py-1">
                                {opt.text}
                            </label>
                        </div>
                    ))}
                </RadioGroup>
                <div className="mt-10 flex justify-end">
                    {currentQuestionIndex < questions.length - 1 ? (
                        <Button 
                            disabled={answers[currentQuestion?.id] === undefined}
                            onClick={() => setCurrentQuestionIndex(prev => prev + 1)}
                            className="rounded-xl px-8 h-12 font-black uppercase text-[10px] tracking-widest"
                        >
                            Question Suivante
                        </Button>
                    ) : (
                        <Button 
                            onClick={handleSubmit} 
                            disabled={isSubmitting || answers[currentQuestion?.id] === undefined}
                            className="rounded-xl px-10 h-12 font-black uppercase text-[10px] tracking-widest bg-emerald-600 hover:bg-emerald-700"
                        >
                            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Soumettre"}
                        </Button>
                    )}
                </div>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
