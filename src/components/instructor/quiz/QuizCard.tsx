
'use client';

import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, FileQuestion, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { Quiz } from '@/lib/types';
import { deleteQuiz } from '@/actions/quizActions';
import { useToast } from '@/hooks/use-toast';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle, 
  AlertDialogTrigger 
} from '@/components/ui/alert-dialog';

interface QuizCardProps {
  quiz: Quiz;
  onEdit: () => void;
}

export function QuizCard({ quiz, onEdit }: QuizCardProps) {
  const { toast } = useToast();
  const createdAt = (quiz.createdAt as any)?.toDate?.() || new Date();

  const handleDelete = async () => {
    // Note: deleteQuiz attendait courseId et sectionId auparavant. 
    // On s'assure que les props sont présentes ou on adapte l'action.
    const result = await deleteQuiz({ 
      courseId: quiz.courseId, 
      sectionId: quiz.sectionId, 
      quizId: quiz.id 
    });

    if (result.success) {
      toast({ title: "Quiz supprimé" });
    } else {
      toast({ variant: 'destructive', title: "Erreur", description: result.error });
    }
  };

  return (
    <Card className="bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 hover:shadow-lg transition-all duration-300 group">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start gap-2">
          <CardTitle className="text-lg font-bold text-slate-900 dark:text-white line-clamp-2">
            {quiz.title}
          </CardTitle>
          <div className="p-2 bg-primary/10 rounded-lg">
            <FileQuestion className="h-5 w-5 text-primary" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="pb-3 space-y-3">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Calendar className="h-3.5 w-3.5" />
          <span>Créé le {format(createdAt, 'd MMMM yyyy', { locale: fr })}</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300">
            {quiz.questionsCount || 0} Questions
          </Badge>
        </div>
      </CardContent>
      <CardFooter className="pt-3 border-t border-slate-100 dark:border-slate-700 gap-2">
        <Button variant="outline" size="sm" className="flex-1" onClick={onEdit}>
          <Edit className="h-4 w-4 mr-2" /> Modifier
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10">
              <Trash2 className="h-4 w-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Supprimer ce quiz ?</AlertDialogTitle>
              <AlertDialogDescription>
                Cette action supprimera définitivement le quiz "{quiz.title}" ainsi que toutes ses questions.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
                Supprimer
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardFooter>
    </Card>
  );
}
