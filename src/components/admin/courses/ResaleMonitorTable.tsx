'use client';

/**
 * @fileOverview Table d'arbitrage du Marché Secondaire.
 * Permet aux admins de surveiller les actifs en vente et d'intervenir.
 */

import { useState, useMemo, useEffect } from 'react';
import { useCollection } from '@/firebase';
import { getFirestore, collection, query, where, getDocs, doc } from 'firebase/firestore';
import type { Course, NdaraUser } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, Ban, Loader2, ShieldAlert, History, User } from 'lucide-react';
import { toggleResaleRightsAction } from '@/actions/courseActions';
import { useRole } from '@/context/RoleContext';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export function ResaleMonitorTable() {
    const db = getFirestore();
    const { currentUser: adminUser } = useRole();
    const { toast } = useToast();
    const [isProcessing, setIsProcessing] = useState<string | null>(null);
    const [instructorsMap, setInstructorsMap] = useState<Map<string, NdaraUser>>(new Map());

    const resaleQuery = useMemo(() => query(collection(db, 'courses'), where('resaleRightsAvailable', '==', true)), [db]);
    const { data: courses, isLoading } = useCollection<Course>(resaleQuery);

    useEffect(() => {
        if (!courses || courses.length === 0) return;
        
        const fetchInstructors = async () => {
            const ids = [...new Set(courses.map(c => c.instructorId))];
            const usersSnap = await getDocs(query(collection(db, 'users'), where('uid', 'in', ids)));
            const newMap = new Map();
            usersSnap.forEach(d => newMap.set(d.id, d.data()));
            setInstructorsMap(newMap);
        };
        fetchInstructors();
    }, [courses, db]);

    const handleDelist = async (courseId: string) => {
        if (!adminUser) return;
        setIsProcessing(courseId);
        
        // Un admin peut forcer le retrait du marché secondaire
        const result = await toggleResaleRightsAction({
            courseId,
            price: 0,
            available: false,
            userId: adminUser.uid
        });

        if (result.success) {
            toast({ title: "Actif retiré du marché", description: "L'arbitrage a suspendu la vente de cette licence." });
        } else {
            toast({ variant: 'destructive', title: "Erreur arbitrage", description: result.error });
        }
        setIsProcessing(null);
    };

    return (
        <div className="space-y-6">
            <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl flex items-start gap-4">
                <ShieldAlert className="h-6 w-6 text-amber-500 shrink-0 mt-1" />
                <div>
                    <p className="text-sm font-black text-white uppercase tracking-tight">Poste d'Arbitrage Boursier</p>
                    <p className="text-xs text-amber-200/70 font-medium italic mt-1 leading-relaxed">
                        En tant qu'administrateur, vous supervisez les licences de revente actives. Vous avez le pouvoir de suspendre toute cotation qui ne respecte pas les standards de Ndara Afrique.
                    </p>
                </div>
            </div>

            <div className="border rounded-[2rem] bg-slate-900/50 border-slate-800 overflow-hidden shadow-2xl">
                <Table>
                    <TableHeader>
                        <TableRow className="border-slate-800 bg-slate-800/30">
                            <TableHead className="text-[10px] font-black uppercase tracking-widest py-4">Formation Cotée</TableHead>
                            <TableHead className="text-[10px] font-black uppercase tracking-widest">Propriétaire Actuel</TableHead>
                            <TableHead className="text-[10px] font-black uppercase tracking-widest">Prix de Licence</TableHead>
                            <TableHead className="text-right text-[10px] font-black uppercase tracking-widest pr-6">Action Arbitre</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            [...Array(3)].map((_, i) => (
                                <TableRow key={i} className="border-slate-800"><TableCell colSpan={4}><Skeleton className="h-12 w-full bg-slate-800/50 rounded-xl"/></TableCell></TableRow>
                            ))
                        ) : courses && courses.length > 0 ? (
                            courses.map(course => {
                                const instructor = instructorsMap.get(course.instructorId);
                                return (
                                    <TableRow key={course.id} className="group border-slate-800 hover:bg-slate-800/20">
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-bold text-sm text-white uppercase truncate max-w-[250px]">{course.title}</span>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <Badge className="bg-slate-800 text-slate-500 border-none text-[8px] font-black uppercase">Ref: {course.id.substring(0,8)}</Badge>
                                                    <span className="text-[9px] text-primary font-black uppercase">{(course.participantsCount || 0)} ÉLÈVES</span>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-8 w-8 border border-slate-700 shadow-lg">
                                                    <AvatarImage src={instructor?.profilePictureURL} />
                                                    <AvatarFallback className="bg-slate-800 text-[10px] font-black">{instructor?.fullName?.charAt(0)}</AvatarFallback>
                                                </Avatar>
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-bold text-slate-300">{instructor?.fullName || 'Chargement...'}</span>
                                                    {course.rightsChain && course.rightsChain.length > 0 && (
                                                        <span className="text-[8px] font-black text-slate-600 uppercase">Actif de 2ème main</span>
                                                    )}
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-baseline gap-1">
                                                <span className="text-sm font-black text-white">{(course.resaleRightsPrice || 0).toLocaleString('fr-FR')}</span>
                                                <span className="text-[9px] font-black text-slate-600 uppercase">XOF</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right pr-6">
                                            <Button 
                                                variant="ghost" 
                                                size="sm" 
                                                onClick={() => handleDelist(course.id)}
                                                disabled={isProcessing === course.id}
                                                className="h-9 px-4 rounded-xl font-black uppercase text-[9px] tracking-widest text-red-500 hover:bg-red-500/10"
                                            >
                                                {isProcessing === course.id ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-2"/> : <Ban className="h-3.5 w-3.5 mr-2" />}
                                                Suspendre Cotation
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        ) : (
                            <TableRow><TableCell colSpan={4} className="h-64 text-center opacity-20"><TrendingUp className="h-16 w-16 mx-auto mb-4" /><p className="font-black uppercase text-xs">Aucune licence en vente publique</p></TableCell></TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
