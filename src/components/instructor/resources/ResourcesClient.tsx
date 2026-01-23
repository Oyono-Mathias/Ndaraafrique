'use client';

import { useState, useMemo } from 'react';
import { useCollection } from '@/firebase';
import { getFirestore, collection, query, where, orderBy } from 'firebase/firestore';
import { useRole } from '@/context/RoleContext';
import { useToast } from '@/hooks/use-toast';
import { deleteResourceAction } from '@/actions/resourceActions';
import type { Resource, Course } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { PlusCircle, FileText, Link as LinkIcon, Video, Image as ImageIcon, Download, Trash2, MoreVertical, Folder, Frown } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ResourceFormModal } from './ResourceFormModal';

const typeIcons: Record<Resource['type'], React.ElementType> = {
    pdf: FileText,
    video: Video,
    image: ImageIcon,
    link: LinkIcon,
    file: Folder,
};

export function ResourcesClient() {
    const db = getFirestore();
    const { currentUser } = useRole();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const { toast } = useToast();

    const coursesQuery = useMemo(() => currentUser ? query(collection(db, 'courses'), where('instructorId', '==', currentUser.uid)) : null, [db, currentUser]);
    const { data: courses, isLoading: coursesLoading } = useCollection<Course>(coursesQuery);

    const resourcesQuery = useMemo(() => currentUser ? query(collection(db, 'resources'), where('instructorId', '==', currentUser.uid), orderBy('createdAt', 'desc')) : null, [db, currentUser]);
    const { data: resources, isLoading: resourcesLoading, error } = useCollection<Resource>(resourcesQuery);
    
    const coursesMap = useMemo(() => {
        const map = new Map<string, string>();
        courses?.forEach(c => map.set(c.id, c.title));
        return map;
    }, [courses]);
    
    const handleDelete = async (resourceId: string) => {
        if(!currentUser) return;
        const result = await deleteResourceAction({ resourceId, instructorId: currentUser.uid });
        if(result.success) {
            toast({ title: 'Ressource supprimée' });
        } else {
            toast({ variant: 'destructive', title: 'Erreur', description: result.error });
        }
    }

    const isLoading = coursesLoading || resourcesLoading;

    return (
        <>
            <ResourceFormModal isOpen={isModalOpen} onOpenChange={setIsModalOpen} courses={courses || []} onFormSubmit={() => {}} />
            <div className="flex justify-end mb-4">
                <Button onClick={() => setIsModalOpen(true)}><PlusCircle className="mr-2 h-4 w-4"/>Ajouter une ressource</Button>
            </div>
            <div className="border rounded-lg dark:border-slate-700">
                <Table>
                    <TableHeader><TableRow><TableHead>Titre</TableHead><TableHead>Type</TableHead><TableHead>Cours</TableHead><TableHead>Ajoutée le</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                    <TableBody>
                        {isLoading ? (
                             [...Array(3)].map((_, i) => <TableRow key={i}><TableCell colSpan={5}><Skeleton className="h-10 w-full"/></TableCell></TableRow>)
                        ) : resources && resources.length > 0 ? (
                            resources.map(res => {
                                const Icon = typeIcons[res.type] || Folder;
                                return (
                                <TableRow key={res.id}>
                                    <TableCell className="font-medium text-white">{res.title}</TableCell>
                                    <TableCell><div className="flex items-center gap-2"><Icon className="h-4 w-4 text-muted-foreground"/><span className="capitalize">{res.type}</span></div></TableCell>
                                    <TableCell>{coursesMap.get(res.courseId) || 'Cours inconnu'}</TableCell>
                                    <TableCell>{res.createdAt ? formatDistanceToNow(res.createdAt.toDate(), { locale: fr, addSuffix: true }) : ''}</TableCell>
                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4"/></Button></DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem asChild><a href={res.url} target="_blank" rel="noopener noreferrer"><Download className="mr-2 h-4 w-4"/>Télécharger / Ouvrir</a></DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleDelete(res.id)} className="text-destructive focus:text-destructive"><Trash2 className="mr-2 h-4 w-4"/>Supprimer</DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            )})
                        ) : (
                            <TableRow><TableCell colSpan={5} className="h-48 text-center text-muted-foreground">
                                <div className="flex flex-col items-center gap-2"><Frown className="h-8 w-8" /><p>Aucune ressource partagée pour le moment.</p></div>
                            </TableCell></TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </>
    );
}
