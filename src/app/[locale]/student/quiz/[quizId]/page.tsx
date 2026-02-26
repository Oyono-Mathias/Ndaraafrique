
'use client';

/**
 * @fileOverview Interface de passage de quiz optimisée.
 * Correction : Importation explicite de orderBy pour fixer l'erreur de build Vercel.
 */

import { useState, useEffect } from 'react';
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
  orderBy, 
  collectionGroup,
  where,
} from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Loader2, ArrowLeft, Award } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Quiz, Question } from '@/lib/types';
import { cn } from '@/lib/utils';
import confetti from 'canvas-confetti';

export default function TakeQuizPage() {
  const params = useParams();
  const { quizId } = params;
  const router = useRouter();
  const { user } = useRole();
  const db = getFirestore();
  const { toast } = useToast();

  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [finalScore, setFinalScore] = useState<number | null>(null);
  const [quizData, setQuizData] = useState<Quiz | null>(null);
  const [isQuizLoading, setIsQuizLoading] = useState(true);

  useEffect(() => {
    if (!quizId) return;

    const fetchQuizAndQuestions = async () => {
      setIsQuizLoading(true);
      try {
        const quizQuery = query(collectionGroup(db, 'quizzes'), where('id', '==', quizId));
        const quizSnap = await getDocs(quizQuery);
        
        if (quizSnap.empty) {
          toast({ variant: 'destructive', title: "Quiz introuvable" });
          return;
        }

        const quizDoc = quizSnap.docs[0];
        const data = { id: quizDoc.id, ...quizDoc.data() } as Quiz;
        setQuizData(data);

        const questionsQuery = query(collection(quizDoc.ref, 'questions'), orderBy('order', 'asc'));
        const questionsSnap = await getDocs(questionsQuery);
        setQuestions(questionsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Question)));
      } catch (e) {
        console.error("Erreur chargement quiz:", e);
      } finally {
        setIsQuizLoading(false);
      }
    };

    fetchQuizAndQuestions();
  }, [quizId, db, toast]);

  const isLoading = isQuizLoading || (questions.length === 0 && !finalScore);

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
      const correctIndex = q.options.findIndex(opt => opt.isCorrect);
      if (answers[q.id] === correctIndex) {
        score++;
      }
    });
    const percentageScore = Math.round((score / questions.length) * 100);
    setFinalScore(percentageScore);
    
    if (percentageScore >= 70) {
        confetti({
            particleCount: 150,
            spread: 70,
            origin: { y: 0.6 },
        });
    }

    try {
      const attemptId = `${user.uid}_${quizId}`;
      const attemptRef = doc(db, `quiz_submissions`, attemptId);
      await setDoc(attemptRef, {
        id: attemptId,
        studentId: user.uid,
        quizId,
        quizTitle: quizData?.title || 'Quiz',
        courseId: quizData?.courseId || '',
        courseTitle: quizData?.title || 'Formation',
        answers,
        score: percentageScore,
        submittedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("Error saving quiz attempt:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentQuestion = questions[currentQuestionIndex];

  if (isLoading) {
    return <div className="flex h-screen w-full items-center justify-center bg-slate-950"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }
  
  if (finalScore !== null) {
      return (
          <div className="flex flex-col items-center justify-center h-screen p-4 bg-slate-950">
              <Card className="w-full max-w-lg text-center bg-slate-900 border-slate-800 rounded-[2rem] overflow-hidden shadow-2xl">
                  <CardHeader className="pt-10">
                      <Award className="mx-auto h-16 w-16 text-amber-500 mb-4" />
                      <CardTitle className="text-2xl font-black text-white uppercase tracking-tight">Résultats du Quiz</CardTitle>
                      <CardDescription className="text-slate-400 font-medium">{quizData?.title}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 pb-10">
                      <p className={cn("text-7xl font-black tracking-tighter", finalScore >= 70 ? "text-green-400" : "text-amber-400")}>{finalScore}%</p>
                      <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">{finalScore >= 70 ? "Félicitations, vous avez réussi !" : "Vous pouvez faire mieux, réessayez !"}</p>
                  </CardContent>
                  <CardFooter className="flex flex-col gap-3 p-6 bg-slate-950/50 border-t border-white/5">
                      <Button onClick={() => router.push(`/student/courses/${quizData?.courseId}`)} className="w-full h-14 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-black uppercase text-xs tracking-widest shadow-xl">
                          Retourner au cours
                      </Button>
                      <Button variant="ghost" onClick={() => {
                        setFinalScore(null);
                        setCurrentQuestionIndex(0);
                        setAnswers({});
                      }} className="w-full h-12 text-slate-500 font-bold uppercase text-[10px] tracking-widest">
                        Réessayer le quiz
                      </Button>
                  </CardFooter>
              </Card>
          </div>
      )
  }

  return (
    <div className="flex flex-col h-screen bg-slate-950">
      <header className="flex items-center justify-between p-4 border-b border-white/5 bg-slate-900/50 backdrop-blur-xl">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full text-slate-400">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="text-center overflow-hidden">
            <h1 className="text-sm font-bold text-white uppercase tracking-widest truncate max-w-[200px]">{quizData?.title}</h1>
            <p className="text-[10px] font-black text-primary uppercase mt-0.5 tracking-tighter">Question {currentQuestionIndex + 1} / {questions.length}</p>
        </div>
        <div className="w-10" />
      </header>
      
      <div className="h-1.5 w-full bg-slate-900">
        <div className="h-full bg-primary transition-all duration-500 shadow-[0_0_10px_hsl(var(--primary))]" style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }} />
      </div>

      <main className="flex-1 flex flex-col p-4 max-w-2xl mx-auto w-full pt-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <h2 className="text-2xl font-black text-white leading-tight mb-10">
            {currentQuestion?.text}
        </h2>
        
        <RadioGroup
            onValueChange={(value) => handleAnswerSelect(parseInt(value, 10))}
            value={answers[currentQuestion?.id]?.toString()}
            className="space-y-4"
        >
            {currentQuestion?.options.map((option, index) => (
                <label 
                    key={index} 
                    className={cn(
                        "flex items-center gap-4 p-5 rounded-3xl border-2 transition-all active:scale-[0.98] cursor-pointer",
                        answers[currentQuestion.id] === index 
                            ? "border-primary bg-primary/5 shadow-2xl shadow-primary/10" 
                            : "border-slate-800 bg-slate-900/40 hover:border-slate-700"
                    )}
                >
                    <RadioGroupItem value={index.toString()} id={`opt-${index}`} className="h-5 w-5 border-slate-600 data-[state=checked]:border-primary data-[state=checked]:bg-primary" />
                    <span className={cn(
                        "text-[15px] font-bold leading-snug",
                        answers[currentQuestion.id] === index ? "text-white" : "text-slate-400"
                    )}>
                        {option.text}
                    </span>
                </label>
            ))}
        </RadioGroup>
      </main>

      <div className="p-4 bg-slate-950/95 backdrop-blur-2xl border-t border-white/5 safe-area-pb">
        <div className="max-w-2xl mx-auto">
            {currentQuestionIndex < questions.length - 1 ? (
                <Button onClick={handleNext} disabled={answers[currentQuestion?.id] === undefined} className="w-full h-16 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-black uppercase text-xs tracking-widest shadow-2xl shadow-primary/20 active:scale-95 transition-all">
                    Question suivante
                </Button>
            ) : (
                <Button onClick={handleSubmit} disabled={isSubmitting || answers[currentQuestion?.id] === undefined} className="w-full h-16 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-black uppercase text-xs tracking-widest shadow-2xl shadow-primary/20 active:scale-95 transition-all">
                    {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin text-white" /> : null}
                    Valider mon Quiz
                </Button>
            )}
        </div>
      </div>
    </div>
  );
}
