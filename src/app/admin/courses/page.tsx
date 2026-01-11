'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useRole } from '@/context/RoleContext';
import { useCollection, useMemoFirebase } from '@/firebase';
import { getFirestore, collection, query, orderBy, where, getDocs } from 'firebase/firestore';
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
import { MoreHorizontal, Search, BookOpen, Eye, Edit, Trash2 } from 'lucide-react';
import type { Course } from '@/lib/types';
import type { FormaAfriqueUser } from '@/context/RoleContext';
import { useDebounce } from '@/hooks/use-debounce';
import { useTranslation } from 'react-i18next';

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

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                    <span className="sr-only">Ouvrir le menu</span>
                    <MoreHorizontal className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="dark:bg-slate-800 dark:border-slate-700">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuItem onSelect={() => window.open(`/course/${course.id}`, '_blank')}>
                    <Eye className="mr-2 h-4 w-4" />
                    Voir la page du cours
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => router.push(`/instructor/courses/edit/${course.id}`)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Éditer le cours
                </DropdownMenuItem>
                <DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/10">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Supprimer
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
};

const CourseCard = ({ course, instructorName, t }: { course: Course, instructorName: string, t: (key: string) => string }) => {
    
    const getStatusText = (status: Course['status'] = 'Draft') => {
        switch(status) {
            case 'Published': return t('published');
            case 'Pending Review': return t('review');
            case 'Draft': return t('draft');
            default: return status;
        }
    }

    return (
    <Card className="dark:bg-slate-800 dark:border-slate-700 flex flex-col">
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
        <CardContent className="flex flex-col justify-end">
             <div className="flex justify-between items-center text-xs text-muted-foreground dark:text-slate-400">
                <span>{course.category}</span>
                <Badge variant={getStatusBadgeVariant(course.status)} className="capitalize">
                    {getStatusText(course.status)}
                </Badge>
            </div>
            <div className="flex justify-between items-center mt-2 pt-2 border-t dark:border-slate-700">
                 <p className="font-bold text-lg dark:text-white">
                    {course.price > 0 ? `${course.price.toLocaleString('fr-FR')} XOF` : 'Gratuit'}
                </p>
                <CourseActions course={course} />
            </div>
        </CardContent>
    </Card>
)};

const CourseRow = ({ course, instructorName, t }: { course: Course, instructorName: string, t: (key: string) => string }) => {
    
    const getStatusText = (status: Course['status'] = 'Draft') => {
        switch(status) {
            case 'Published': return t('published');
            case 'Pending Review': return t('review');
            case 'Draft': return t('draft');
            default: return status;
        }
    }
    
    return (
     <div className="flex items-center gap-4 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/50">
        <Image
            src={course.imageUrl || `https://picsum.photos/seed/${course.id}/160/90`}
            alt={course.title}
            width={100}
            height={56}
            className="rounded-md aspect-video object-cover"
        />
        <div className="flex-1">
            <p className="font-bold text-sm line-clamp-1 dark:text-white">{course.title}</p>
            <p className="text-xs text-muted-foreground dark:text-slate-400">Par {instructorName}</p>
            <div className="flex items-center gap-2 mt-1">
                 <Badge variant={getStatusBadgeVariant(course.status)} className="capitalize text-xs">
                  {getStatusText(course.status)}
                </Badge>
                <p className="font-bold text-xs dark:text-white">
                    {course.price > 0 ? `${course.price.toLocaleString('fr-FR')} XOF` : 'Gratuit'}
                </p>
            </div>
        </div>
        <CourseActions course={course} />
     </div>
)};


export default function AdminCoursesPage() {
  const { formaAfriqueUser: adminUser, isUserLoading } = useRole();
  const db = getFirestore();
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [instructors, setInstructors] = useState<Map<string, FormaAfriqueUser>>(new Map());

  const coursesQuery = useMemoFirebase(
    () => query(collection(db, 'courses'), orderBy('createdAt', 'desc')),
    [db]
  );
  const { data: courses, isLoading: coursesLoading, error } = useCollection<Course>(coursesQuery);

  useEffect(() => {
    if (!courses) return;

    const fetchInstructors = async () => {
        const instructorIds = [...new Set(courses.map(c => c.instructorId))];
        if (instructorIds.length === 0) return;

        const newIdsToFetch = instructorIds.filter(id => !instructors.has(id));
        if (newIdsToFetch.length === 0) return;

        const usersQuery = query(collection(db, 'users'), where('uid', 'in', newIdsToFetch.slice(0, 30)));
        const usersSnap = await getDocs(usersQuery);
        
        const newInstructors = new Map(instructors);
        usersSnap.forEach(doc => newInstructors.set(doc.data().uid, doc.data() as FormaAfriqueUser));
        setInstructors(newInstructors);
    };
    fetchInstructors();
  }, [courses, db, instructors]);


  const filteredCourses = useMemo(() => {
    if (!courses) return [];
    if (!debouncedSearchTerm) return courses;
    return courses.filter(course =>
      course.title?.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
    );
  }, [courses, debouncedSearchTerm]);

  const isLoading = isUserLoading || coursesLoading;
  
  if (error) {
      return <div className="text-destructive p-4">Erreur: Impossible de charger les cours. L'index est peut-être manquant.</div>;
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold dark:text-white">{t('course_mgmt')}</h1>
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
            {/* Desktop & Tablet Grid View */}
            <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {isLoading ? (
                    [...Array(8)].map((_, i) => <Skeleton key={i} className="h-80 w-full dark:bg-slate-700"/>)
                ) : filteredCourses.length > 0 ? (
                    filteredCourses.map(course => (
                       <CourseCard key={course.id} course={course} instructorName={instructors.get(course.instructorId)?.fullName || 'Anonyme'} t={t} />
                    ))
                ) : (
                    <div className="col-span-full text-center py-10">
                        <BookOpen className="mx-auto h-12 w-12 text-slate-400" />
                        <p className="mt-4 font-medium">Aucun cours trouvé</p>
                    </div>
                )}
            </div>
            
            {/* Mobile List View */}
            <div className="block md:hidden space-y-2">
                {isLoading ? (
                    [...Array(5)].map((_, i) => <Skeleton key={i} className="h-20 w-full dark:bg-slate-700"/>)
                ) : filteredCourses.length > 0 ? (
                     filteredCourses.map(course => (
                       <CourseRow key={course.id} course={course} instructorName={instructors.get(course.instructorId)?.fullName || 'Anonyme'} t={t} />
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
