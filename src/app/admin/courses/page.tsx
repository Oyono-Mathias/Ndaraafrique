
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useRole } from '@/context/RoleContext';
import { getFirestore, collection, query, orderBy, where, getDocs, onSnapshot } from 'firebase/firestore';
import Image from 'next/image';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { MoreHorizontal, Search, BookOpen, Eye, Edit, Trash2, Loader2 } from 'lucide-react';
import type { Course, NdaraUser } from '@/lib/types';
import { useDebounce } from '@/hooks/use-debounce';
import { cn } from '@/lib/utils';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { deleteCourse } from '@/actions/supportActions';
import { useToast } from '@/hooks/use-toast';


const getStatusBadgeVariant = (status?: Course['status']) => {
  switch (status) {
    case 'Published':
      return 'default';
    case 'Pending Review':
      return 'secondary';
    case 'Draft':
    default:
      return 'outline';
  }
};

const CourseActions = ({ course }: { course: Course }) => {
    const router = useRouter();
    const [isAlertOpen, setIsAlertOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const { toast } = useToast();
    const { currentUser } = useRole();

    const handleActionClick = (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent card click from firing
    };

    const handleDelete = async () => {
        if (!currentUser) {
            toast({ variant: 'destructive', title: 'Erreur', description: 'Vous n\'êtes pas authentifié.' });
            return;
        }
        setIsDeleting(true);
        const result = await deleteCourse({ courseId: course.id, adminId: currentUser.uid });
        if (result.success) {
            toast({ title: 'Cours supprimé', description: `Le cours "${course.title}" a été supprimé.` });
        } else {
            toast({ variant: 'destructive', title: 'Erreur', description: result.error });
        }
        setIsDeleting(false);
        setIsAlertOpen(false);
    };

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0" onClick={handleActionClick}>
                        <span className="sr-only">Ouvrir le menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="dark:bg-slate-800 dark:border-slate-700" onClick={handleActionClick}>
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuItem onSelect={() => window.open(`/course/${course.id}`, '_blank')}>
                        <Eye className="mr-2 h-4 w-4" />
                        Voir la page du cours
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => router.push(`/instructor/courses/edit/${course.id}`)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Éditer le cours
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setIsAlertOpen(true)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Supprimer
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
              <AlertDialogContent>
                  <AlertDialogHeader>
                      <AlertDialogTitle>Confirmer la suppression ?</AlertDialogTitle>
                      <AlertDialogDescription>
                          Cette action est irréversible et supprimera le cours "{course.title}". Les données associées (leçons, inscriptions) pourraient devenir orphelines. Êtes-vous sûr ?
                      </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                      <AlertDialogCancel>Annuler</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
                          {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                          Supprimer
                      </AlertDialogAction>
                  </AlertDialogFooter>
              </AlertDialogContent>
          </AlertDialog>
        </>
    );
};

const CourseCard = ({ course, instructorName }: { course: Course, instructorName: string }) => {
    const router = useRouter();
    const getStatusText = (status: Course['status'] = 'Draft') => {
        switch(status) {
            case 'Published': return 'Publié';
            case 'Pending Review': return 'En révision';
            case 'Draft': return 'Brouillon';
            default: return status;
        }
    }

    return (
    <Card 
        className="dark:bg-[#1e293b] dark:border-slate-700 flex flex-col cursor-pointer transition-all duration-300 hover:scale-[1.03] hover:shadow-primary/10 hover:shadow-lg"
        onClick={() => router.push(`/instructor/courses/edit/${course.id}`)}
    >
        <div className="relative aspect-video">
            <Image
                src={course.imageUrl || `https://picsum.photos/seed/${course.id}/400/225`}
                alt={course.title}
                fill
                className="object-cover rounded-t-lg"
            />
        </div>
        <CardHeader className="flex-grow">
            <CardTitle className="text-base line-clamp-2 leading-tight dark:text-white">{course.title}</CardTitle>
            <CardDescription className="text-xs pt-1 dark:text-slate-400">Par {instructorName}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col justify-end pt-0">
             <div className="flex justify-between items-center text-xs text-muted-foreground dark:text-slate-400">
                <span>{course.category}</span>
                <Badge variant={getStatusBadgeVariant(course.status)} className="capitalize dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600">
                    {getStatusText(course.status)}
                </Badge>
            </div>
            <div className="flex justify-between items-center mt-2 pt-2 border-t dark:border-slate-700">
                 <p className="font-bold text-lg dark:text-white">
                    {course.price > 0 ? `${course.price.toLocaleString('fr-FR')} XOF` : "Gratuit"}
                </p>
                <CourseActions course={course} />
            </div>
        </CardContent>
    </Card>
)};


export default function AdminCoursesPage() {
  const { currentUser: adminUser, isUserLoading } = useRole();
  const db = getFirestore();
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [courses, setCourses] = useState<Course[]>([]);
  const [instructors, setInstructors] = useState<Map<string, NdaraUser>>(new Map());
  const [dataLoading, setDataLoading] = useState(true);

  // Subscribe to courses in real-time
  useEffect(() => {
    const coursesQuery = query(collection(db, 'courses'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(coursesQuery, (snapshot) => {
        const coursesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course));
        setCourses(coursesData);
        setDataLoading(false); // Initial load done
    }, (error) => {
        console.error("Error fetching courses:", error);
        setDataLoading(false);
    });

    return () => unsubscribe();
  }, [db]);

  // Fetch instructors for the loaded courses
  useEffect(() => {
    const fetchInstructors = async () => {
        if (courses.length === 0) return;
        
        const instructorIds = [...new Set(courses.map(c => c.instructorId))];
        const newIdsToFetch = instructorIds.filter(id => id && !instructors.has(id));

        if (newIdsToFetch.length > 0) {
            // Firestore 'in' query has a limit of 30, for larger sets, chunking is needed.
            const usersQuery = query(collection(db, 'users'), where('uid', 'in', newIdsToFetch.slice(0, 30)));
            const usersSnap = await getDocs(usersQuery);
            
            const newInstructors = new Map(instructors);
            usersSnap.forEach(doc => newInstructors.set(doc.data().uid, doc.data() as NdaraUser));
            setInstructors(newInstructors);
        }
    };
    fetchInstructors();
  }, [courses, db, instructors]);

  const filteredCourses = useMemo(() => {
    if (!debouncedSearchTerm) return courses;
    return courses.filter(course =>
      course.title?.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
    );
  }, [courses, debouncedSearchTerm]);

  const isLoading = isUserLoading || dataLoading;
  
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold dark:text-white">Gestion des cours</h1>
        <p className="text-muted-foreground dark:text-slate-400">Consultez et gérez toutes les formations de la plateforme.</p>
      </header>

      <Card className="dark:bg-slate-800 dark:border-slate-700">
        <CardHeader>
          <CardTitle className="dark:text-white">Catalogue complet</CardTitle>
          <CardDescription className="dark:text-slate-400">
            Liste de tous les cours, quel que soit leur statut.
          </CardDescription>
          <div className="relative pt-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un cours par titre..."
              className="max-w-sm pl-10 dark:bg-slate-700 dark:border-slate-600"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {isLoading ? (
                    [...Array(8)].map((_, i) => <Skeleton key={i} className="h-80 w-full dark:bg-slate-700"/>)
                ) : filteredCourses.length > 0 ? (
                    filteredCourses.map(course => (
                       <CourseCard key={course.id} course={course} instructorName={instructors.get(course.instructorId)?.fullName || 'Anonyme'} />
                    ))
                ) : (
                    <div className="col-span-full text-center py-10">
                        <BookOpen className="mx-auto h-12 w-12 text-slate-400" />
                        <p className="mt-4 font-medium">Aucun cours trouvé</p>
                    </div>
                )}
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
