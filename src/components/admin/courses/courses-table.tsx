'use client';

/**
 * @fileOverview Gestionnaire du Catalogue Admin - Optimisé pour +10k cours.
 * ✅ PAGINATION : Chargement incrémental par lots de 20.
 * ✅ PERFORMANCE : Fenêtre de synchronisation limitée pour économiser les lectures.
 */

import { useState, useMemo, useEffect } from 'react';
import { useCollection } from '@/firebase';
import { getFirestore, collection, query, orderBy, where, getDocs, documentId, limit } from 'firebase/firestore';
import type { Course, NdaraUser } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
    MoreVertical, 
    Search, 
    Edit, 
    Trash2, 
    Loader2, 
    Eye, 
    ShieldCheck, 
    Clock, 
    Archive, 
    UserPlus,
    TrendingUp,
    CheckCircle2,
    XCircle,
    AlertCircle,
    FileText,
    LayoutGrid,
    BookOpen,
    ChevronDown
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useRole } from '@/context/RoleContext';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { updateCourseStatusByAdmin, deleteCourseByAdmin } from '@/actions/courseActions';
import { 
    AlertDialog, 
    AlertDialogTrigger, 
    AlertDialogContent, 
    AlertDialogHeader, 
    AlertDialogFooter, 
    AlertDialogTitle, 
    AlertDialogDescription, 
    AlertDialogAction, 
    AlertDialogCancel 
} from "@/components/ui/alert-dialog";
import Image from 'next/image';
import { AssignInstructorModal } from './AssignInstructorModal';

const PAGE_SIZE = 20;

const CourseAdminCard = ({ 
    course, 
    instructor,
    onAssignClick 
}: { 
    course: Course; 
    instructor?: Partial<NdaraUser>;
    onAssignClick: (course: Course) => void;
}) => {
    const { currentUser: adminUser } = useRole();
    const { toast } = useToast();
    const router = useRouter();
    const [isDeleting, setIsDeleting] = useState(false);
    const [isStatusChanging, setIsStatusChanging] = useState(false);

    const isPublished = course.status === 'Published';
    const isPending = course.status === 'Pending Review';
    const isDraft = course.status === 'Draft';
    const isInMarket = course.resaleRightsAvailable === true;

    const handleStatusUpdate = async (status: Course['status']) => {
        if (!adminUser || status === course.status) return;
        setIsStatusChanging(true);
        const result = await updateCourseStatusByAdmin({ courseId: course.id, status, adminId: adminUser.uid });
        if (result.success) {
            toast({ title: 'Statut mis à jour' });
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
            toast({ title: 'Formation supprimée' });
        } else {
            toast({ variant: 'destructive', title: 'Erreur', description: result.error });
        }
        setIsDeleting(false);
    };

    return (
        <div className={cn(
            "glass-card rounded-[2.5rem] overflow-hidden border transition-all active:scale-[0.98] group relative",
            isPending ? "border-amber-500/30 shadow-[0_0_20px_rgba(245,158,11,0.1)]" : "border-white/5 shadow-2xl",
            isDraft && "opacity-75"
        )}>
            {isInMarket && (
                <div className="absolute top-3 left-3 z-20 animate-in zoom-in duration-500">
                    <Badge className="bg-blue-600 hover:bg-blue-600 text-white border-none font-black text-[8px] uppercase px-2 py-1 flex items-center gap-1 shadow-[0_0_15px_rgba(37,99,235,0.4)]">
                        <TrendingUp size={10} />
                        EN BOURSE
                    </Badge>
                </div>
            )}

            <div className="flex p-4 gap-4 items-center">
                <div className="w-28 h-20 rounded-2xl overflow-hidden shrink-0 relative bg-slate-800 shadow-inner">
                    <Image src={course.imageUrl || `https://picsum.photos/seed/${course.id}/200/150`} alt={course.title} fill className="object-cover group-hover:scale-110 transition-transform duration-700" />
                    <div className="absolute inset-0 bg-black/20" />
                </div>

                <div className="flex-1 min-w-0 py-1">
                    <div className="flex justify-between items-start mb-1">
                        <h3 className="font-black text-white text-[13px] leading-tight uppercase tracking-tight truncate pr-2">{course.title}</h3>
                        
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-slate-500 hover:text-white transition active:scale-90">
                                    <MoreVertical size={16} />
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56 bg-slate-900 border-slate-800 text-slate-300">
                                <DropdownMenuLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Arbitrage Admin</DropdownMenuLabel>
                                <DropdownMenuSeparator className="bg-slate-800" />
                                
                                <DropdownMenuItem onClick={() => router.push(`/instructor/courses/edit/${course.id}`)} className="cursor-pointer gap-3 py-3">
                                    <Edit className="h-4 w-4 text-primary" />
                                    <span className="font-bold text-xs uppercase">Modifier le contenu</span>
                                </DropdownMenuItem>

                                <DropdownMenuItem onClick={() => onAssignClick(course)} className="cursor-pointer gap-3 py-3 text-primary">
                                    <UserPlus className="h-4 w-4" />
                                    <span className="font-bold text-xs uppercase">Réattribuer Expert</span>
                                </DropdownMenuItem>

                                <DropdownMenuSeparator className="bg-slate-800" />

                                {isPending ? (
                                    <DropdownMenuItem onClick={() => handleStatusUpdate('Published')} className="cursor-pointer gap-3 py-3 text-emerald-400">
                                        <CheckCircle2 className="h-4 w-4" />
                                        <span className="font-bold text-xs uppercase">Publier & Valider</span>
                                    </DropdownMenuItem>
                                ) : isPublished ? (
                                    <DropdownMenuItem onClick={() => handleStatusUpdate('Draft')} className="cursor-pointer gap-3 py-3">
                                        <Archive className="h-4 w-4" />
                                        <span className="font-bold text-xs uppercase">Retirer (Brouillon)</span>
                                    </DropdownMenuItem>
                                ) : (
                                    <DropdownMenuItem onClick={() => handleStatusUpdate('Published')} className="cursor-pointer gap-3 py-3 text-emerald-400">
                                        <ShieldCheck className="h-4 w-4" />
                                        <span className="font-bold text-xs uppercase">Forcer la Publication</span>
                                    </DropdownMenuItem>
                                )}

                                <DropdownMenuSeparator className="bg-slate-800" />
                                
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="cursor-pointer gap-3 py-3 text-red-500">
                                            <Trash2 className="h-4 w-4" />
                                            <span className="font-bold text-xs uppercase">Supprimer</span>
                                        </DropdownMenuItem>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent className="bg-slate-900 border-slate-800 rounded-[2rem]">
                                        <AlertDialogHeader>
                                            <AlertDialogTitle className="text-white font-black uppercase tracking-tight">Confirmer suppression</AlertDialogTitle>
                                            <AlertDialogDescription className="text-slate-400">
                                                Voulez-vous vraiment supprimer <b>"{course.title}"</b> ? Cette action est irréversible.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter className="p-6 pt-0">
                                            <AlertDialogCancel className="bg-slate-800 border-none rounded-xl font-bold text-[10px] uppercase">Annuler</AlertDialogCancel>
                                            <AlertDialogAction onClick={handleDelete} className="bg-red-600 text-white font-bold text-[10px] uppercase rounded-xl">Supprimer</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>

                    <div className="flex items-center gap-2 mb-3">
                        <Avatar className="h-4 w-4 border border-white/10">
                            <AvatarImage src={instructor?.profilePictureURL} />
                            <AvatarFallback className="text-[6px] font-black">{instructor?.fullName?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <span className="text-slate-500 text-[10px] font-bold uppercase tracking-widest truncate max-w-[120px]">{instructor?.fullName || 'Chargement...'}</span>
                    </div>

                    <div className="flex items-center justify-between mt-auto">
                        <Badge className={cn(
                            "text-[8px] font-black uppercase px-2 py-0.5 border-none rounded-md",
                            isPublished ? "bg-emerald-500/10 text-emerald-500" : 
                            isPending ? "bg-amber-500/10 text-amber-500 animate-pulse" : 
                            "bg-slate-800 text-slate-500"
                        )}>
                            {isPublished ? 'En Ligne' : isPending ? 'En Examen' : 'Brouillon'}
                        </Badge>

                        <div className="text-right">
                            <p className="text-[8px] font-black text-slate-600 uppercase tracking-tighter">
                                {isInMarket ? 'LICENCE BOURSE' : 'PRIX PUBLIC'}
                            </p>
                            <p className={cn(
                                "text-sm font-black",
                                isInMarket ? "text-blue-400" : "text-white"
                            )}>
                                {(isInMarket ? course.resaleRightsPrice : course.price || 0)?.toLocaleString('fr-FR')} <span className="text-[10px] opacity-50">F</span>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export function CoursesTable() {
    const db = getFirestore();
    const [searchTerm, setSearchTerm] = useState('');
    const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
    const { currentUser: adminUser } = useRole();

    const coursesQuery = useMemo(() => query(
        collection(db, 'courses'), 
        orderBy('createdAt', 'desc'),
        limit(visibleCount)
    ), [db, visibleCount]);

    const { data: courses, isLoading: coursesLoading } = useCollection<Course>(coursesQuery);

    const [instructorsMap, setInstructorsMap] = useState<Map<string, Partial<NdaraUser>>>(new Map());
    const [selectedCourseForAssign, setSelectedCourseForAssign] = useState<Course | null>(null);
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);

    useEffect(() => {
        if (!courses) return;
        const fetchInstructors = async () => {
            const ids = [...new Set(courses.map(c => c.instructorId).filter(Boolean))];
            const idsToFetch = ids.filter(id => !instructorsMap.has(id));
            if (idsToFetch.length === 0) return;

            const newMap = new Map(instructorsMap);
            for (let i = 0; i < idsToFetch.length; i += 30) {
                const chunk = idsToFetch.slice(i, i + 30);
                const q = query(collection(db, 'users'), where('uid', 'in', chunk));
                const snap = await getDocs(q);
                snap.forEach(d => newMap.set(d.id, d.data()));
            }
            setInstructorsMap(newMap);
        };
        fetchInstructors();
    }, [courses, db, instructorsMap]);

    const filtered = useMemo(() => {
        const list = (courses || []).filter(c => 
            c.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            instructorsMap.get(c.instructorId)?.fullName?.toLowerCase().includes(searchTerm.toLowerCase())
        );
        return {
            queue: list.filter(c => c.status === 'Pending Review'),
            rest: list.filter(c => c.status !== 'Pending Review')
        };
    }, [courses, searchTerm, instructorsMap]);

    const handleLoadMore = () => setVisibleCount(prev => prev + PAGE_SIZE);

    return (
        <div className="space-y-10">
            <AssignInstructorModal isOpen={isAssignModalOpen} onOpenChange={setIsAssignModalOpen} course={selectedCourseForAssign} />

            <div className="relative max-w-md">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
                <Input
                    placeholder="Chercher une formation, un expert..."
                    className="h-14 pl-12 bg-slate-900 border-white/5 rounded-[2rem] text-white shadow-xl focus-visible:ring-primary/30"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {filtered.queue.length > 0 && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between px-1">
                        <h2 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                            <AlertCircle className="text-amber-500 h-4 w-4" />
                            File de Modération
                        </h2>
                    </div>
                    <div className="grid gap-4">
                        {filtered.queue.map(course => (
                            <CourseAdminCard 
                                key={course.id} 
                                course={course} 
                                instructor={instructorsMap.get(course.instructorId)} 
                                onAssignClick={(c) => { setSelectedCourseForAssign(c); setIsAssignModalOpen(true); }}
                            />
                        ))}
                    </div>
                </div>
            )}

            <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                    <h2 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                        <LayoutGrid className="text-slate-500 h-4 w-4" />
                        Répertoire Complet
                    </h2>
                </div>
                
                {filtered.rest.length > 0 ? (
                    <div className="grid gap-4">
                        {filtered.rest.map(course => (
                            <CourseAdminCard 
                                key={course.id} 
                                course={course} 
                                instructor={instructorsMap.get(course.instructorId)} 
                                onAssignClick={(c) => { setSelectedCourseForAssign(c); setIsAssignModalOpen(true); }}
                            />
                        ))}
                        
                        {!searchTerm && courses && courses.length >= visibleCount && (
                            <div className="flex justify-center pt-4 pb-8">
                                <Button 
                                    onClick={handleLoadMore}
                                    variant="outline"
                                    className="h-12 px-8 rounded-2xl border-white/5 bg-slate-900 text-slate-400 font-black uppercase text-[10px] tracking-widest"
                                >
                                    {coursesLoading ? <Loader2 className="animate-spin h-4 w-4" /> : <ChevronDown className="h-4 w-4 mr-2" />}
                                    Afficher plus de cours
                                </Button>
                            </div>
                        )}
                    </div>
                ) : !coursesLoading && (
                    <div className="py-24 text-center bg-slate-900/20 border-2 border-dashed border-slate-800 rounded-[3rem] opacity-20">
                        <BookOpen className="h-16 w-16 mx-auto mb-4 text-slate-700" />
                        <p className="font-black uppercase tracking-widest text-xs">Aucune formation trouvée</p>
                    </div>
                )}
            </div>
        </div>
    );
}