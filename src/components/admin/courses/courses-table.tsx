'use client';

/**
 * @fileOverview Table de gestion des cours pour les administrateurs.
 * Supporte la recherche, le changement de statut et la suppression.
 */

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
  DropdownMenuPortal,
  DropdownMenuSubContent,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { MoreHorizontal, Search, Edit, Trash2, Loader2, Eye, ShieldCheck, Clock, Archive, BookOpen } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useRole } from '@/context/RoleContext';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
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
            toast({ title: 'Statut mis à jour', description: `La formation est maintenant en mode ${status}.` });
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
            toast({ title: 'Cours supprimé', description: "La formation a été retirée du catalogue." });
        } else {
            toast({ variant: 'destructive', title: 'Erreur', description: result.error });
        }
        setIsDeleting(false);
    };

    return (
        <TableRow className="group border-slate-800 hover:bg-slate-800/20">
            <TableCell>
                <div className="flex items-center gap-4">
                    <div className="relative h-12 w-20 rounded-xl overflow-hidden bg-slate-800 shadow-lg border border-white/5">
                        <Image src={course.imageUrl || `https://picsum.photos/seed/${course.id}/160/90`} alt={course.title} fill className="object-cover group-hover:scale-110 transition-transform duration-500" />
                    </div>
                    <div className="flex flex-col">
                        <span className="font-bold text-sm text-white line-clamp-1 uppercase tracking-tight">{course.title}</span>
                        <span className="text-[10px] font-black text-primary uppercase tracking-widest">{course.category}</span>
                    </div>
                </div>
            </TableCell>
            <TableCell className="hidden md:table-cell">
                <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8 border border-slate-700 shadow-sm">
                        <AvatarImage src={instructor?.profilePictureURL} />
                        <AvatarFallback className="bg-slate-800 text-slate-500 text-[10px] font-black">
                            {instructor?.fullName?.charAt(0)}
                        </AvatarFallback>
                    </Avatar>
                    <span className="text-xs font-bold text-slate-300">{instructor?.fullName || 'N/A'}</span>
                </div>
            </TableCell>
            <TableCell>
                <div className="flex flex-col">
                    <span className="text-sm font-black text-white">{course.price > 0 ? `${course.price.toLocaleString('fr-FR')} XOF` : 'OFFERT'}</span>
                    <span className="text-[9px] font-bold text-slate-600 uppercase tracking-tighter">Prix public</span>
                </div>
            </TableCell>
            <TableCell>
                <Badge variant={getStatusVariant(course.status)} className="font-black text-[9px] uppercase border-none px-2 py-0">
                    {course.status}
                </Badge>
            </TableCell>
            <TableCell className="text-right">
                <AlertDialog>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-all active:scale-90">
                                <MoreHorizontal className="h-5 w-5" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56 bg-slate-900 border-slate-800 text-slate-300">
                            <DropdownMenuLabel className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">Actions Admin</DropdownMenuLabel>
                            <DropdownMenuSeparator className="bg-slate-800" />
                            
                            <DropdownMenuItem onClick={() => router.push(`/instructor/courses/edit/${course.id}`)} className="cursor-pointer gap-2 py-2.5">
                                <Edit className="h-4 w-4 text-primary" />
                                <span className="font-bold text-xs uppercase tracking-tight">Éditer le contenu</span>
                            </DropdownMenuItem>

                            <DropdownMenuItem onClick={() => router.push(`/courses/${course.id}`)} className="cursor-pointer gap-2 py-2.5">
                                <Eye className="h-4 w-4 text-blue-400" />
                                <span className="font-bold text-xs uppercase tracking-tight">Aperçu public</span>
                            </DropdownMenuItem>

                            <DropdownMenuSeparator className="bg-slate-800" />

                            <DropdownMenuSub>
                                <DropdownMenuSubTrigger className="cursor-pointer gap-2 py-2.5" disabled={isStatusChanging}>
                                    {isStatusChanging ? <Loader2 className="h-4 w-4 animate-spin text-primary"/> : <Clock className="h-4 w-4 text-amber-400" />}
                                    <span className="font-bold text-xs uppercase tracking-tight">Changer le statut</span>
                                </DropdownMenuSubTrigger>
                                <DropdownMenuPortal>
                                    <DropdownMenuSubContent className="bg-slate-900 border-slate-800 text-slate-300">
                                        <DropdownMenuItem onClick={() => handleStatusUpdate('Published')} className="cursor-pointer font-bold text-xs uppercase text-emerald-400">
                                            <ShieldCheck className="mr-2 h-4 w-4" /> Publier
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleStatusUpdate('Pending Review')} className="cursor-pointer font-bold text-xs uppercase text-amber-400">
                                            <Clock className="mr-2 h-4 w-4" /> Mettre en examen
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleStatusUpdate('Draft')} className="cursor-pointer font-bold text-xs uppercase text-slate-400">
                                            <Archive className="mr-2 h-4 w-4" /> Passer en brouillon
                                        </DropdownMenuItem>
                                    </DropdownMenuSubContent>
                                </DropdownMenuPortal>
                            </DropdownMenuSub>

                            <DropdownMenuSeparator className="bg-slate-800" />
                            
                            <AlertDialogTrigger asChild>
                                <DropdownMenuItem className="cursor-pointer gap-2 py-2.5 text-red-500">
                                    <Trash2 className="h-4 w-4" />
                                    <span className="font-bold text-xs uppercase tracking-tight">Supprimer</span>
                                </DropdownMenuItem>
                            </AlertDialogTrigger>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <AlertDialogContent className="bg-slate-900 border-slate-800 rounded-[2rem]">
                        <AlertDialogHeader>
                            <AlertDialogTitle className="text-xl font-black text-white uppercase tracking-tight">Attention</AlertDialogTitle>
                            <AlertDialogDescription className="text-slate-400">
                                Supprimer définitivement la formation <b>"{course.title}"</b> ? Cette action est irréversible et supprimera tout le contenu associé.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter className="p-6 pt-0">
                            <AlertDialogCancel className="bg-slate-800 border-none rounded-xl font-bold uppercase text-[10px]">Annuler</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-red-600 font-bold uppercase text-[10px] rounded-xl">
                                {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Supprimer
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
            course.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            course.category?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [courses, searchTerm]);

    const isLoading = coursesLoading || instructorsLoading;

    return (
        <div className="space-y-6">
            <div className="relative max-w-sm">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <Input
                    placeholder="Chercher par titre ou catégorie..."
                    className="h-12 pl-12 bg-slate-900 border-slate-800 rounded-2xl text-white shadow-xl focus-visible:ring-primary/30"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="border rounded-[2rem] bg-slate-900/50 border-slate-800 overflow-hidden shadow-2xl">
                <Table>
                    <TableHeader>
                        <TableRow className="border-slate-800 bg-slate-800/30">
                            <TableHead className="text-[10px] font-black uppercase tracking-widest py-4">Formation</TableHead>
                            <TableHead className="text-[10px] font-black uppercase tracking-widest hidden md:table-cell">Instructeur</TableHead>
                            <TableHead className="text-[10px] font-black uppercase tracking-widest">Investissement</TableHead>
                            <TableHead className="text-[10px] font-black uppercase tracking-widest">État</TableHead>
                            <TableHead className="text-right text-[10px] font-black uppercase tracking-widest pr-6">Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            [...Array(5)].map((_, i) => (
                                <TableRow key={i} className="border-slate-800"><TableCell colSpan={5}><Skeleton className="h-12 w-full bg-slate-800/50 rounded-xl"/></TableCell></TableRow>
                            ))
                        ) : filteredCourses.length > 0 ? (
                            filteredCourses.map(course => (
                                <CourseRow key={course.id} course={course} instructor={instructorsMap.get(course.instructorId)} />
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={5} className="h-64 text-center opacity-20">
                                    <BookOpen className="h-16 w-16 mx-auto mb-4" />
                                    <p className="font-black uppercase text-xs">Aucune formation trouvée</p>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
