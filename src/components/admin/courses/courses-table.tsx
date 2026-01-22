
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useCollection } from '@/firebase';
import { getFirestore, collection, query, orderBy, where, getDocs } from 'firebase/firestore';
import type { Course, NdaraUser } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { MoreHorizontal, Search, Edit, Trash2, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useRole } from '@/context/RoleContext';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next-intl/navigation';
import { updateCourseStatusByAdmin, deleteCourseByAdmin } from '@/actions/courseActions';
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogFooter, AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel } from "@/components/ui/alert-dialog";
import Image from 'next/image';

const getStatusVariant = (status: Course['status']) => {
  switch (status) {
    case 'Published': return 'success';
    case 'Pending Review': return 'warning';
    case 'Draft': return 'secondary';
    default: return 'outline';
  }
};

const CourseRow = ({ course, instructor }: { course: Course; instructor?: Partial<NdaraUser> }) => {
    const { currentUser: adminUser } = useRole();
    const { toast } = useToast();
    const router = useRouter();
    const [isDeleting, setIsDeleting] = useState(false);
    const [isStatusChanging, setIsStatusChanging] = useState(false);

    const handleStatusUpdate = async (status: Course['status']) => {
        if (!adminUser || status === course.status) return;
        setIsStatusChanging(true);
        const result = await updateCourseStatusByAdmin({ courseId: course.id, status, adminId: adminUser.uid });
        if (result.success) {
            toast({ title: 'Statut du cours mis à jour.' });
        } else {
            toast({ variant: 'destructive', title: 'Erreur', description: result.error });
        }
        setIsStatusChanging(false);
    };

    const handleDelete = async () => {
        if (!adminUser) return;
        setIsDeleting(true);
        const result = await deleteCourseByAdmin({ courseId: course.id, adminId: adminUser.uid });
        if (result.success) {
            toast({ title: 'Cours supprimé avec succès.' });
        } else {
            toast({ variant: 'destructive', title: 'Erreur', description: result.error });
        }
        setIsDeleting(false);
    };

    return (
        <TableRow>
            <TableCell>
                <div className="flex items-center gap-3">
                    <div className="relative h-10 w-16 rounded-md overflow-hidden bg-slate-700">
                        <Image src={course.imageUrl || `https://picsum.photos/seed/${course.id}/160/90`} alt={course.title} fill className="object-cover" />
                    </div>
                    <span className="font-medium text-white">{course.title}</span>
                </div>
            </TableCell>
            <TableCell>
                <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                        <AvatarImage src={instructor?.profilePictureURL} />
                        <AvatarFallback>{instructor?.fullName?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm">{instructor?.fullName || 'N/A'}</span>
                </div>
            </TableCell>
            <TableCell>{course.category}</TableCell>
            <TableCell>{course.price > 0 ? `${course.price.toLocaleString('fr-FR')} XOF` : 'Gratuit'}</TableCell>
            <TableCell><Badge variant={getStatusVariant(course.status)}>{course.status}</Badge></TableCell>
            <TableCell className="text-right">
                <AlertDialog>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => router.push(`/instructor/courses/edit/${course.id}`)}>
                                <Edit className="mr-2 h-4 w-4" /> Éditer
                            </DropdownMenuItem>
                            <DropdownMenuSub>
                                <DropdownMenuSubTrigger disabled={isStatusChanging}>
                                    {isStatusChanging ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Edit className="mr-2 h-4 w-4" />}
                                    Changer le statut
                                </DropdownMenuSubTrigger>
                                <DropdownMenuPortal>
                                    <DropdownMenuSubContent>
                                        <DropdownMenuItem onClick={() => handleStatusUpdate('Published')}>Publié</DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleStatusUpdate('Pending Review')}>En attente</DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleStatusUpdate('Draft')}>Brouillon</DropdownMenuItem>
                                    </DropdownMenuSubContent>
                                </DropdownMenuPortal>
                            </DropdownMenuSub>
                            <DropdownMenuSeparator />
                            <AlertDialogTrigger asChild>
                                <DropdownMenuItem className="text-destructive focus:text-destructive">
                                    <Trash2 className="mr-2 h-4 w-4" /> Supprimer
                                </DropdownMenuItem>
                            </AlertDialogTrigger>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle>Confirmer la suppression?</AlertDialogTitle><AlertDialogDescription>La suppression de "{course.title}" est irréversible.</AlertDialogDescription></AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
                                {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Oui, supprimer
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </TableCell>
        </TableRow>
    );
};

export function CoursesTable() {
    const db = getFirestore();
    const coursesQuery = useMemo(() => query(collection(db, 'courses'), orderBy('createdAt', 'desc')), [db]);
    const { data: courses, isLoading: coursesLoading } = useCollection<Course>(coursesQuery);

    const [instructorsMap, setInstructorsMap] = useState<Map<string, Partial<NdaraUser>>>(new Map());
    const [instructorsLoading, setInstructorsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (coursesLoading || !courses) return;

        const fetchInstructors = async () => {
            const instructorIds = [...new Set(courses.map(c => c.instructorId).filter(Boolean))];
            if (instructorIds.length === 0) {
                setInstructorsLoading(false);
                return;
            }
            
            const newInstructors = new Map<string, Partial<NdaraUser>>();
            const idsToFetch = instructorIds.filter(id => !instructorsMap.has(id));

            if (idsToFetch.length > 0) {
                for (let i = 0; i < idsToFetch.length; i += 30) {
                    const chunk = idsToFetch.slice(i, i + 30);
                    if (chunk.length === 0) continue;
                    const usersQuery = query(collection(db, 'users'), where('uid', 'in', chunk));
                    const usersSnapshot = await getDocs(usersQuery);
                    usersSnapshot.forEach(doc => {
                        const data = doc.data();
                        newInstructors.set(data.uid, { fullName: data.fullName, profilePictureURL: data.profilePictureURL });
                    });
                }
                setInstructorsMap(prev => new Map([...prev, ...newInstructors]));
            }
            setInstructorsLoading(false);
        };

        fetchInstructors();
    }, [courses, coursesLoading, db, instructorsMap]);

    const filteredCourses = useMemo(() => {
        if (!courses) return [];
        return courses.filter(course =>
            course.title?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [courses, searchTerm]);

    const isLoading = coursesLoading || instructorsLoading;

    return (
        <div className="space-y-4">
            <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Rechercher par titre..."
                    className="pl-10 dark:bg-slate-800"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            <div className="border rounded-lg dark:border-slate-700">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Cours</TableHead>
                            <TableHead>Instructeur</TableHead>
                            <TableHead>Catégorie</TableHead>
                            <TableHead>Prix</TableHead>
                            <TableHead>Statut</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            [...Array(5)].map((_, i) => (
                                <TableRow key={i}><TableCell colSpan={6}><Skeleton className="h-10 w-full bg-slate-800"/></TableCell></TableRow>
                            ))
                        ) : filteredCourses.length > 0 ? (
                            filteredCourses.map(course => (
                                <CourseRow key={course.id} course={course} instructor={instructorsMap.get(course.instructorId)} />
                            ))
                        ) : (
                            <TableRow><TableCell colSpan={6} className="h-24 text-center">Aucun cours trouvé.</TableCell></TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
