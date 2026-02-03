'use client';

/**
 * @fileOverview Interface de passage de quiz pour les étudiants.
 * Gère l'affichage séquentiel des questions, le calcul du score final
 * et l'enregistrement de la performance dans Firestore.
 */

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useRole } from '@/context/RoleContext';
import {
  getFirestore,
  doc,
  collection,
  query,
  where,
  getDocs,
  collectionGroup,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, ArrowLeft, CheckCircle2, XCircle, Award, Trophy, ChevronRight } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
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

  // 1. Récupération du quiz et de ses questions
  useEffect(() => {
    if (!quizId) return;

    const fetchQuizData = async () => {
      setIsLoading(true);
      try {
        const quizQuery = query(collectionGroup(db, 'quizzes'), where('__name__', '==', quizId));
        const quizSnap = await getDocs(quizQuery);

        if (quizSnap.empty) {
          toast({ variant: 'destructive', title: "Quiz introuvable" });
          setIsLoading(false);
          return;
        }

        const quizDoc = quizSnap.docs[0];
        const quizData = { id: quizDoc.id, ...quizDoc.data() } as Quiz;
        setQuiz(quizData);

        const questionsSnap = await getDocs(query(collection(quizDoc.ref, 'questions')));
        const fetchedQuestions = questionsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Question));
        setQuestions(fetchedQuestions.sort((a, b) => (a.order || 0) - (b.order || 0)));

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
    if (!user || !quiz) return;
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
      toast({ variant: 'destructive', title: "Erreur lors de l'enregistrement du score" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-slate-400 animate-pulse">Préparation de vos questions...</p>
      </div>
    );
  }

  if (finalResult) {
    const isSuccess = finalResult.percentage >= 50;
    return (
      <div className="max-w-2xl mx-auto py-12 px-4 animate-in fade-in zoom-in-95 duration-500">
        <Card className="text-center border-2 border-slate-800 bg-slate-900/50 backdrop-blur-xl shadow-2xl">
          <CardHeader>
            <div className="flex justify-center mb-6">
              {isSuccess ? (
                <div className="p-4 bg-green-500/20 rounded-full ring-8 ring-green-500/10">
                  <Trophy className="h-16 w-16 text-green-400" />
                </div>
              ) : (
                <div className="p-4 bg-amber-500/20 rounded-full ring-8 ring-amber-500/10">
                  <Award className="h-16 w-16 text-amber-400" />
                </div>
              )}
            </div>
            <CardTitle className="text-3xl font-bold text-white">Quiz Terminé !</CardTitle>
            <CardDescription className="text-lg mt-2">
              {quiz?.title}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="py-8">
              <span className={cn(
                "text-7xl font-black tracking-tighter",
                isSuccess ? "text-green-400" : "text-amber-400"
              )}>
                {finalResult.percentage}%
              </span>
              <p className="text-slate-400 mt-2 font-medium">
                {finalResult.score} bonnes réponses sur {finalResult.total}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
              <p className="text-slate-200">
                {isSuccess 
                  ? "Excellent travail ! Vous maîtrisez bien ce sujet." 
                  : "C'est un bon début. Relisez le cours pour améliorer votre score la prochaine fois !"}
              </p>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col sm:flex-row gap-4 justify-center pb-8 px-8">
            <Button variant="outline" className="w-full sm:w-auto h-12 px-8" onClick={() => window.location.reload()}>
              Réessayer
            </Button>
            <Button className="w-full sm:w-auto h-12 px-8" onClick={() => router.push(`/student/dashboard`)}>
              Retour au tableau de bord
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  const currentQuestion = questions[currentStep];
  const progress = ((currentStep + 1) / questions.length) * 100;

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <header className="mb-8 space-y-4">
        <Button variant="ghost" className="text-slate-400 hover:text-white -ml-4" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Abandonner le quiz
        </Button>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white line-clamp-1">{quiz?.title}</h1>
          <span className="text-sm font-mono text-primary bg-primary/10 px-3 py-1 rounded-full border border-primary/20">
            {currentStep + 1} / {questions.length}
          </span>
        </div>
        <Progress value={progress} className="h-2 bg-slate-800" />
      </header>

      <Card className="border-slate-800 bg-slate-900/40 shadow-xl overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-primary/50 via-primary to-primary/50" />
        <CardHeader className="p-8">
          <CardTitle className="text-xl md:text-2xl text-slate-100 leading-relaxed">
            {currentQuestion?.text}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-8 pb-8">
          <RadioGroup
            value={answers[currentQuestion?.id]?.toString()}
            onValueChange={(val) => handleAnswerSelect(parseInt(val, 10))}
            className="space-y-4"
          >
            {currentQuestion?.options.map((option, idx) => (
              <label
                key={idx}
                className={cn(
                  "flex items-center gap-4 p-5 rounded-xl border-2 cursor-pointer transition-all duration-200",
                  answers[currentQuestion.id] === idx
                    ? "bg-primary/10 border-primary shadow-[0_0_15px_rgba(79,70,229,0.1)]"
                    : "bg-slate-800/30 border-slate-700/50 hover:bg-slate-800/60 hover:border-slate-600"
                )}
              >
                <RadioGroupItem value={idx.toString()} className="h-5 w-5" />
                <span className="text-slate-200 font-medium">{option.text}</span>
              </label>
            ))}
          </RadioGroup>
        </CardContent>
        <CardFooter className="p-8 bg-slate-900/20 border-t border-slate-800/50 flex justify-end">
          <Button
            size="lg"
            className="h-12 px-10 font-bold text-base"
            disabled={answers[currentQuestion?.id] === undefined || isSubmitting}
            onClick={handleNext}
          >
            {isSubmitting ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : currentStep === questions.length - 1 ? (
              "Terminer le quiz"
            ) : (
              <>
                Question suivante
                <ChevronRight className="h-5 w-5 ml-2" />
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}