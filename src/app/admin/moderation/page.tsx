
'use client';

import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Eye, CheckCircle, XCircle, Clock, ShieldAlert, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';


// --- MOCK DATA (to be replaced with Firestore logic) ---
const MOCK_COURSES = [
  { id: '1', title: 'Introduction à l\'IA Générative avec Gemini', instructor: 'Amina Diallo', submittedAt: new Date(Date.now() - 86400000 * 1), status: 'Pending Review' },
  { id: '2', title: 'Créer un business en ligne profitable en Afrique', instructor: 'Kwame Nkrumah', submittedAt: new Date(Date.now() - 86400000 * 3), status: 'Pending Review' },
  { id: '3', title: 'Le guide complet du Design UI/UX pour les nuls', instructor: 'Fanta Kébé', submittedAt: new Date(Date.now() - 86400000 * 5), status: 'Pending Review' },
];

type CourseForReview = typeof MOCK_COURSES[0];

// --- REFUSAL MODAL COMPONENT ---
const RefusalModal = ({ course, onConfirm }: { course: CourseForReview, onConfirm: (reason: string) => void }) => {
    const [reason, setReason] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleConfirm = () => {
        if (reason.trim().length < 10) {
            // Basic validation
            return;
        }
        setIsSubmitting(true);
        // Simulate async action
        setTimeout(() => {
            onConfirm(reason);
            setIsSubmitting(false);
        }, 1000);
    }
    
    return (
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Refuser le cours : "{course.title}" ?</DialogTitle>
                <DialogDescription>
                    Veuillez fournir une raison claire et constructive pour le refus. L'instructeur sera notifié.
                </DialogDescription>
            </DialogHeader>
            <div className="py-4">
                <Textarea
                    placeholder="Ex: Le contenu de la leçon 3 n'est pas assez approfondi..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={5}
                />
                 {reason.trim().length < 10 && <p className="text-xs text-destructive mt-2">La raison doit contenir au moins 10 caractères.</p>}
            </div>
            <DialogFooter>
                <DialogClose asChild>
                    <Button type="button" variant="ghost">Annuler</Button>
                </DialogClose>
                <Button type="button" variant="destructive" onClick={handleConfirm} disabled={isSubmitting || reason.trim().length < 10}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                    Confirmer le refus
                </Button>
            </DialogFooter>
        </DialogContent>
    );
};


export default function AdminModerationPage() {
  const [courses, setCourses] = useState<CourseForReview[]>(MOCK_COURSES);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { t } = useTranslation();

  // Simulate loading
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1500);
    return () => clearTimeout(timer);
  }, []);

  const handleApprove = (courseId: string) => {
    toast({ title: "Cours approuvé", description: "Le cours est maintenant publié et visible par tous." });
    setCourses(prev => prev.filter(c => c.id !== courseId));
  };

  const handleRefuse = (courseId: string, reason: string) => {
     toast({ title: "Cours refusé", description: "L'instructeur a été notifié de la décision.", variant: 'destructive' });
     setCourses(prev => prev.filter(c => c.id !== courseId));
  };


  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold dark:text-white">Modération</h1>
        <p className="text-muted-foreground dark:text-slate-400">Validez les cours soumis par les instructeurs avant leur publication.</p>
      </header>

      <Card className="dark:bg-slate-800 dark:border-slate-700">
        <CardHeader>
          <CardTitle className="dark:text-white">Cours en attente de révision</CardTitle>
          <CardDescription className="dark:text-slate-400">
            Examinez chaque cours attentivement avant de prendre une décision.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="dark:hover:bg-slate-700/50 dark:border-slate-700">
                  <TableHead className="dark:text-slate-400">Titre du cours</TableHead>
                  <TableHead className="hidden md:table-cell dark:text-slate-400">Instructeur</TableHead>
                  <TableHead className="hidden lg:table-cell dark:text-slate-400">Soumission</TableHead>
                  <TableHead className="text-center dark:text-slate-400">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  [...Array(3)].map((_, i) => (
                    <TableRow key={i} className="dark:border-slate-700">
                      <TableCell><Skeleton className="h-5 w-48 dark:bg-slate-700" /></TableCell>
                      <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-24 dark:bg-slate-700" /></TableCell>
                      <TableCell className="hidden lg:table-cell"><Skeleton className="h-5 w-28 dark:bg-slate-700" /></TableCell>
                      <TableCell className="text-right"><div className="flex justify-center gap-2"><Skeleton className="h-8 w-24 dark:bg-slate-700" /><Skeleton className="h-8 w-24 dark:bg-slate-700" /><Skeleton className="h-8 w-24 dark:bg-slate-700" /></div></TableCell>
                    </TableRow>
                  ))
                ) : courses && courses.length > 0 ? (
                  courses.map((course) => (
                    <TableRow key={course.id} className="dark:hover:bg-slate-700/50 dark:border-slate-700">
                      <TableCell className="font-medium">
                        <div className="flex flex-col">
                            <span className="dark:text-slate-100">{course.title}</span>
                            <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 w-fit mt-1 lg:hidden">
                                <Clock className="mr-1.5 h-3 w-3"/>
                                En révision
                            </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground hidden md:table-cell dark:text-slate-400">
                          {course.instructor}
                      </TableCell>
                       <TableCell className="hidden lg:table-cell text-muted-foreground dark:text-slate-400">
                          {formatDistanceToNow(course.submittedAt, { addSuffix: true, locale: fr })}
                      </TableCell>
                      <TableCell className="text-center">
                         <div className="flex justify-center gap-2">
                             <Button variant="outline" size="sm" className="dark:bg-slate-700 dark:border-slate-600 dark:hover:bg-slate-600">
                                <Eye className="mr-2 h-4 w-4"/> Aperçu
                            </Button>
                             <Dialog>
                                <DialogTrigger asChild>
                                     <Button variant="destructive" size="sm">
                                        <XCircle className="mr-2 h-4 w-4"/> Refuser
                                    </Button>
                                </DialogTrigger>
                                <RefusalModal course={course} onConfirm={(reason) => handleRefuse(course.id, reason)} />
                             </Dialog>
                             <Button onClick={() => handleApprove(course.id)} size="sm" variant="default" className="bg-green-600 hover:bg-green-700">
                                <CheckCircle className="mr-2 h-4 w-4"/> Approuver
                            </Button>
                         </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow className="dark:border-slate-700">
                    <TableCell colSpan={4} className="h-48 text-center">
                       <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground dark:text-slate-400">
                          <ShieldAlert className="h-12 w-12" />
                          <p className="font-medium">Aucun cours en attente</p>
                          <p className="text-sm">Toutes les soumissions ont été traitées.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
