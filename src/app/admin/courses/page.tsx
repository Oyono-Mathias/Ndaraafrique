
'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useRole } from '@/context/RoleContext';
import { useCollection, useMemoFirebase } from '@/firebase';
import { getFirestore, collection, query, orderBy } from 'firebase/firestore';
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
import { MoreHorizontal, Search, BookOpen, Eye } from 'lucide-react';
import type { Course } from '@/lib/types';
import { useDebounce } from '@/hooks/use-debounce';

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
                <DropdownMenuItem onSelect={() => router.push(`/instructor/courses/edit/${course.id}`)}>
                    Modifier le cours
                </DropdownMenuItem>
                 <DropdownMenuItem onSelect={() => window.open(`/course/${course.id}`, '_blank')}>
                    <Eye className="mr-2 h-4 w-4" />
                    Aperçu public
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
};

export default function AdminCoursesPage() {
  const { formaAfriqueUser: adminUser, isUserLoading } = useRole();
  const db = getFirestore();
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const coursesQuery = useMemoFirebase(
    () => query(collection(db, 'courses'), orderBy('createdAt', 'desc')),
    [db]
  );
  const { data: courses, isLoading: coursesLoading } = useCollection<Course>(coursesQuery);

  const filteredCourses = useMemo(() => {
    if (!courses) return [];
    if (!debouncedSearchTerm) return courses;
    return courses.filter(course =>
      course.title?.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
    );
  }, [courses, debouncedSearchTerm]);

  const isLoading = isUserLoading || coursesLoading;

  if (adminUser?.role !== 'admin') {
    return <div className="p-8 text-center">Accès non autorisé.</div>;
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4">
      <header>
        <h1 className="text-3xl font-bold dark:text-white">Gestion des Formations</h1>
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
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="dark:hover:bg-slate-700/50 dark:border-slate-700">
                  <TableHead className="dark:text-slate-400">Titre</TableHead>
                  <TableHead className="hidden md:table-cell dark:text-slate-400">Statut</TableHead>
                  <TableHead className="hidden lg:table-cell dark:text-slate-400">Prix</TableHead>
                  <TableHead className="text-right dark:text-slate-400">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  [...Array(5)].map((_, i) => (
                    <TableRow key={i} className="dark:border-slate-700">
                      <TableCell><Skeleton className="h-4 w-48 dark:bg-slate-700" /></TableCell>
                      <TableCell className="hidden md:table-cell"><Skeleton className="h-6 w-24 rounded-full dark:bg-slate-700" /></TableCell>
                      <TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-20 dark:bg-slate-700" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto dark:bg-slate-700" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredCourses.length > 0 ? (
                  filteredCourses.map((course) => (
                    <TableRow key={course.id} className="dark:hover:bg-slate-700/50 dark:border-slate-700">
                      <TableCell className="font-medium dark:text-slate-100">{course.title}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Badge variant={getStatusBadgeVariant(course.status)} className="capitalize">
                          {course.status === 'Pending Review' ? 'En révision' : course.status === 'Draft' ? 'Brouillon' : 'Publié'}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell font-mono dark:text-slate-300">
                        {course.price > 0 ? `${course.price.toLocaleString('fr-FR')} XOF` : 'Gratuit'}
                      </TableCell>
                      <TableCell className="text-right">
                          <CourseActions course={course} />
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow className="dark:border-slate-700">
                    <TableCell colSpan={4} className="h-48 text-center">
                      <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground dark:text-slate-400">
                          <BookOpen className="h-12 w-12" />
                          <p className="font-medium">Aucun cours trouvé</p>
                          <p className="text-sm">Il n'y a pas encore de cours sur la plateforme.</p>
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
