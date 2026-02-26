'use client';

/**
 * @fileOverview Interface de passage de quiz pour les étudiants.
 * Gère l'affichage séquentiel des questions, le calcul du score final
 * et l'enregistrement de la performance dans Firestore.
 */

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useRole } from '@/context/RoleContext';
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  collectionGroup,
  addDoc,
  serverTimestamp,
  orderBy,
} from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, ArrowLeft, Award, Trophy, ChevronRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import confetti from 'canvas-confetti';
import type { Quiz, Question } from '@/lib/types';

export default function TakeQuizPage() {
  const { quizId } = useParams();
  const router = useRouter();
  const { user, currentUser } = useRole();
  const db = getFirestore();
  const { toast } = useToast();

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [finalResult, setFinalResult] = useState<{ score: number; total: number; percentage: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!quizId) return;

    const fetchQuizData = async () => {
      setIsLoading(true);
      try {
        const quizQuery = query(collectionGroup(db, 'quizzes'), where('id', '==', quizId));
        const quizSnap = await getDocs(quizQuery);

        if (quizSnap.empty) {
          toast({ variant: 'destructive', title: "Quiz introuvable" });
          setIsLoading(false);
          return;
        }

        const quizDoc = quizSnap.docs[0];
        const quizData = { id: quizDoc.id, ...quizDoc.data() } as Quiz;
        setQuiz(quizData);

        // Fetch questions ordered by 'order'
        const questionsSnap = await getDocs(query(collection(quizDoc.ref, 'questions'), orderBy('order', 'asc')));
        const fetchedQuestions = questionsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Question));
        setQuestions(fetchedQuestions);

      } catch (error) {
        console.error("Error fetching quiz:", error);
        toast({ variant: 'destructive', title: "Erreur de chargement" });
      } finally {
        setIsLoading(false);
      }
    };

    fetchQuizData();
  }, [quizId, db, toast]);

  const handleAnswerSelect = (optionIndex: number) => {
    const questionId = questions[currentStep].id;
    setAnswers(prev => ({ ...prev, [questionId]: optionIndex }));
  };

  const handleNext = () => {
    if (currentStep < questions.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      submitQuiz();
    }
  };

  const submitQuiz = async () => {
    if (!user || !quiz || questions.length === 0) return;
    setIsSubmitting(true);

    let correctCount = 0;
    questions.forEach(q => {
      const correctIndex = q.options.findIndex(opt => opt.isCorrect);
      if (answers[q.id] === correctIndex) {
        correctCount++;
      }
    });

    const percentage = Math.round((correctCount / questions.length) * 100);
    const result = { score: correctCount, total: questions.length, percentage };

    try {
      await addDoc(collection(db, 'quiz_submissions'), {
        quizId: quiz.id,
        quizTitle: quiz.title,
        studentId: user.uid,
        studentName: currentUser?.fullName || 'Étudiant',
        courseId: quiz.courseId,
        score: percentage,
        correctAnswers: correctCount,
        totalQuestions: questions.length,
        submittedAt: serverTimestamp(),
      });

      setFinalResult(result);

      if (percentage >= 70) {
        confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#4F46E5', '#10B981', '#F59E0B']
        });
      }
    } catch (error) {
      console.error("Error submitting quiz:", error);
      toast({ variant: 'destructive', title: "Erreur lors de l'enregistrement" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 p-6">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-slate-500 mt-4 font-bold uppercase tracking-widest text-xs animate-pulse">Chargement du quiz...</p>
      </div>
    );
  }

  if (finalResult) {
    const isSuccess = finalResult.percentage >= 70;
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <Card className="w-full max-w-lg bg-slate-900 border-slate-800 rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in duration-500">
          <div className="h-2 w-full bg-slate-800">
            <div className={cn("h-full transition-all duration-1000", isSuccess ? "bg-green-500" : "bg-amber-500")} style={{ width: '100%' }} />
          </div>
          <CardHeader className="text-center pt-10">
            <div className="mx-auto mb-6 p-4 rounded-full bg-slate-800/50 w-24 h-24 flex items-center justify-center ring-8 ring-slate-900">
              {isSuccess ? <Trophy className="h-12 w-12 text-yellow-500" /> : <Award className="h-12 w-12 text-amber-500" />}
            </div>
            <CardTitle className="text-3xl font-black text-white uppercase tracking-tight">Quiz Terminé !</CardTitle>
            <CardDescription className="text-slate-400 mt-2 font-medium">{quiz?.title}</CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-6 pb-10">
            <div className="space-y-1">
              <p className={cn("text-7xl font-black tracking-tighter", isSuccess ? "text-green-400" : "text-amber-400")}>
                {finalResult.percentage}%
              </p>
              <p className="text-slate-500 font-bold uppercase text-[10px] tracking-[0.3em]">Score final</p>
            </div>
            <p className="text-slate-300 text-sm max-w-xs mx-auto leading-relaxed font-medium">
              {isSuccess 
                ? "Bara ala ! Vous avez brillamment réussi cette évaluation. Vos compétences sont validées." 
                : "C'est un bon début, mais vous pouvez faire mieux. Repassez le cours et tentez de nouveau !"}
            </p>
          </CardContent>
          <CardFooter className="bg-slate-900/50 p-6 flex flex-col gap-3">
            <Button onClick={() => router.push(`/student/courses/${quiz?.courseId}`)} className="w-full h-14 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-black uppercase text-xs tracking-widest shadow-xl active:scale-[0.98] transition-all">
              Continuer la formation
            </Button>
            {!isSuccess && (
              <Button variant="ghost" onClick={() => window.location.reload()} className="w-full h-12 text-slate-400 font-bold uppercase text-[10px] tracking-widest">
                Réessayer le quiz
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>
    );
  }

  const currentQuestion = questions[currentStep];
  const progress = ((currentStep + 1) / questions.length) * 100;

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col pb-24">
      <header className="p-4 border-b border-white/5 bg-slate-900/50 backdrop-blur-xl flex items-center justify-between sticky top-0 z-30">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full text-slate-400">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="text-center">
          <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Évaluation</p>
          <h1 className="text-sm font-bold text-white line-clamp-1 max-w-[200px]">{quiz?.title}</h1>
        </div>
        <div className="text-[10px] font-black text-slate-500 bg-slate-800 px-3 py-1 rounded-full border border-white/5">
          {currentStep + 1} / {questions.length}
        </div>
      </header>

      <div className="h-1 w-full bg-slate-900">
        <div className="h-full bg-primary transition-all duration-500" style={{ width: `${progress}%` }} />
      </div>

      <main className="flex-1 flex flex-col p-4 max-w-2xl mx-auto w-full space-y-8 pt-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <h2 className="text-2xl font-black text-white leading-tight">
          {currentQuestion?.text}
        </h2>

        <RadioGroup
          value={answers[currentQuestion?.id]?.toString()}
          onValueChange={(val) => handleAnswerSelect(parseInt(val, 10))}
          className="space-y-4"
        >
          {currentQuestion?.options.map((option, idx) => (
            <label
              key={idx}
              className={cn(
                "flex items-center gap-4 p-5 rounded-3xl border-2 cursor-pointer transition-all active:scale-[0.98]",
                answers[currentQuestion.id] === idx
                  ? "border-primary bg-primary/5 shadow-2xl shadow-primary/10"
                  : "border-slate-800 bg-slate-900/40 hover:border-slate-700"
              )}
            >
              <RadioGroupItem value={idx.toString()} className="h-5 w-5 border-slate-600 data-[state=checked]:border-primary data-[state=checked]:bg-primary" />
              <span className={cn(
                "text-[15px] font-bold leading-snug",
                answers[currentQuestion.id] === idx ? "text-white" : "text-slate-400"
              )}>
                {option.text}
              </span>
            </label>
          ))}
        </RadioGroup>
      </main>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-slate-950/95 backdrop-blur-2xl border-t border-white/5 z-40 safe-area-pb">
        <div className="max-w-2xl mx-auto">
          <Button
            onClick={handleNext}
            disabled={answers[currentQuestion?.id] === undefined || isSubmitting}
            className="w-full h-16 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-black uppercase text-xs tracking-widest shadow-2xl shadow-primary/20 transition-all active:scale-95"
          >
            {isSubmitting ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : currentStep === questions.length - 1 ? (
              "Terminer & Voir le score"
            ) : (
              <>
                Question suivante
                <ChevronRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}