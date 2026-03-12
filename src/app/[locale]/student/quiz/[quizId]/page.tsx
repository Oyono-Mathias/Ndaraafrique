'use client';

/**
 * @fileOverview Interface de passage de quiz immersive (Style Android Native).
 * ✅ DESIGN : Plein écran, barre de progression lumineuse, feedback tactile.
 * ✅ RÉSOLU : UX fluide pour mobile.
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
import { Loader2, ArrowLeft, Award, CheckCircle2, AlertCircle, Sparkles, X } from 'lucide-react';
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
          router.back();
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
  }, [quizId, db, toast, router]);

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
      toast({ variant: 'destructive', title: 'Attention', description: 'Répondez à toutes les questions avant de valider.' });
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
    
    if (percentageScore >= 70) {
        confetti({
            particleCount: 150,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#10b981', '#ffffff']
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

  if (isQuizLoading || (questions.length === 0 && !finalScore)) {
    return (
        <div className="h-screen bg-[#050505] flex flex-col items-center justify-center gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Initialisation de l'évaluation...</p>
        </div>
    );
  }
  
  if (finalScore !== null) {
      return (
          <div className="h-screen bg-[#050505] flex flex-col items-center justify-center p-6 relative overflow-hidden bg-grainy">
              <div className="absolute inset-0 bg-primary/5 blur-[120px] rounded-full pointer-events-none" />
              
              <Card className="w-full max-w-sm text-center bg-slate-900 border-white/5 rounded-[3rem] overflow-hidden shadow-2xl animate-in zoom-in duration-500 z-10">
                  <div className="pt-12 pb-6">
                      <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                          <Award className={cn("h-12 w-12", finalScore >= 70 ? "text-primary" : "text-amber-500")} />
                      </div>
                      <h3 className="text-2xl font-black text-white uppercase tracking-tight">Résultats</h3>
                      <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">{quizData?.title}</p>
                  </div>
                  
                  <CardContent className="space-y-4 pb-10">
                      <div className="relative inline-block">
                          <p className={cn(
                              "text-8xl font-black tracking-tighter",
                              finalScore >= 70 ? "text-primary" : "text-amber-500"
                          )}>
                              {finalScore}<span className="text-2xl opacity-30">%</span>
                          </p>
                      </div>
                      <p className="text-slate-400 font-medium italic text-sm">
                          {finalScore >= 70 
                            ? "Félicitations Ndara, ton savoir est validé !" 
                            : "Tu peux faire mieux. Réexamine tes erreurs avec Mathias."}
                      </p>
                  </CardContent>
                  
                  <CardFooter className="flex flex-col gap-3 p-6 bg-black/40">
                      <Button 
                        onClick={() => router.push(`/courses/${quizData?.courseId}`)} 
                        className="w-full h-16 rounded-2xl bg-primary hover:bg-primary/90 text-slate-950 font-black uppercase text-xs tracking-widest shadow-xl transition-all active:scale-95"
                      >
                          Continuer l'étude
                      </Button>
                      <button 
                        onClick={() => { setFinalScore(null); setCurrentQuestionIndex(0); setAnswers({}); }}
                        className="text-[10px] font-black text-slate-500 uppercase tracking-widest py-2 hover:text-white transition"
                      >
                        Recommencer le test
                      </button>
                  </CardFooter>
              </Card>
          </div>
      )
  }

  const currentQuestion = questions[currentQuestionIndex];

  return (
    <div className="h-screen flex flex-col bg-[#050505] font-sans relative">
      <div className="grain-overlay" />
      
      {/* Header Immersif */}
      <header className="px-4 py-6 border-b border-white/5 flex items-center justify-between z-20 bg-black/40 backdrop-blur-md safe-area-pt">
        <button onClick={() => router.back()} className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center text-slate-500 active:scale-90 transition">
          <X className="h-5 w-5" />
        </button>
        <div className="text-center">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Évaluation</p>
            <h1 className="text-xs font-bold text-white uppercase tracking-widest mt-0.5 truncate max-w-[180px]">{quizData?.title}</h1>
        </div>
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-black text-[10px]">
            {currentQuestionIndex + 1}/{questions.length}
        </div>
      </header>
      
      {/* Barre de Progression Glowy */}
      <div className="h-1 w-full bg-slate-900 overflow-hidden z-20">
        <div 
            className="h-full bg-primary transition-all duration-500 shadow-[0_0_15px_rgba(16,185,129,0.6)]" 
            style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }} 
        />
      </div>

      <main className="flex-1 overflow-y-auto px-6 py-12 z-10 flex flex-col max-w-2xl mx-auto w-full">
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <h2 className="text-2xl md:text-3xl font-black text-white leading-tight uppercase tracking-tight">
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
                            "flex items-center gap-4 p-6 rounded-[2rem] border-2 transition-all active:scale-[0.98] cursor-pointer",
                            answers[currentQuestion.id] === index 
                                ? "border-primary bg-primary/5 shadow-[0_0_30px_rgba(16,185,129,0.1)]" 
                                : "border-white/5 bg-slate-900/40 hover:bg-slate-900/60"
                        )}
                    >
                        <RadioGroupItem value={index.toString()} id={`opt-${index}`} className="h-6 w-6 border-slate-700 data-[state=checked]:border-primary data-[state=checked]:bg-primary" />
                        <span className={cn(
                            "text-base font-bold leading-relaxed",
                            answers[currentQuestion.id] === index ? "text-white" : "text-slate-400"
                        )}>
                            {option.text}
                        </span>
                    </label>
                ))}
            </RadioGroup>
        </div>
      </main>

      {/* Action Bar */}
      <footer className="p-6 bg-black/80 backdrop-blur-xl border-t border-white/5 z-20 safe-area-pb">
        <div className="max-w-2xl mx-auto">
            {currentQuestionIndex < questions.length - 1 ? (
                <Button 
                    onClick={handleNext} 
                    disabled={answers[currentQuestion?.id] === undefined} 
                    className="w-full h-16 rounded-[2rem] bg-primary hover:bg-primary/90 text-slate-950 font-black uppercase text-xs tracking-widest shadow-2xl shadow-primary/20 active:scale-95 transition-all"
                >
                    Question suivante
                </Button>
            ) : (
                <Button 
                    onClick={handleSubmit} 
                    disabled={isSubmitting || answers[currentQuestion?.id] === undefined} 
                    className="w-full h-16 rounded-[2rem] bg-primary hover:bg-primary/90 text-slate-950 font-black uppercase text-xs tracking-widest shadow-2xl shadow-primary/20 active:scale-95 transition-all"
                >
                    {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <><CheckCircle2 className="mr-2 h-4 w-4" /> Valider mon Quiz</>}
                </Button>
            )}
        </div>
      </footer>
    </div>
  );
}
