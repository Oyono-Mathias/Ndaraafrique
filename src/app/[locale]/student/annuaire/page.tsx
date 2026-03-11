'use client';

/**
 * @fileOverview Annuaire communautaire Ndara Afrique.
 * Permet aux étudiants de trouver leurs collègues de formation et de démarrer des échanges.
 */

import { useState, useMemo, useEffect } from 'react';
import { useRole } from '@/context/RoleContext';
import { getFirestore, collection, query, where, getDocs, documentId, limit } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { startChat } from '@/lib/chat';
import { useToast } from '@/hooks/use-toast';
import type { NdaraUser } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, MessageSquare, Loader2, Users, BookOpen, GraduationCap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function AnnuairePage() {
    const { currentUser, isUserLoading } = useRole();
    const db = getFirestore();
    const router = useRouter();
    const { toast } = useToast();

    const [searchTerm, setSearchTerm] = useState('');
    const [isContacting, setIsContacting] = useState<string | null>(null);
    const [classmates, setClassmates] = useState<NdaraUser[]>([]);
    const [isLoadingData, setIsLoadingData] = useState(true);

    useEffect(() => {
        if (!currentUser?.uid) return;

        const fetchClassmates = async () => {
            setIsLoadingData(true);
            try {
                // 1. Récupérer les IDs des cours de l'utilisateur actuel
                const myEnrollmentsSnap = await getDocs(query(
                    collection(db, 'enrollments'),
                    where('studentId', '==', currentUser.uid)
                ));
                
                const myCourseIds = myEnrollmentsSnap.docs.map(d => d.data().courseId);

                if (myCourseIds.length === 0) {
                    setClassmates([]);
                    setIsLoadingData(false);
                    return;
                }

                // 2. Trouver les autres inscrits dans ces mêmes cours (limité à 10 cours pour le 'in')
                const othersEnrollmentsSnap = await getDocs(query(
                    collection(db, 'enrollments'),
                    where('courseId', 'in', myCourseIds.slice(0, 10)),
                    limit(100)
                ));

                const otherStudentIds = [...new Set(othersEnrollmentsSnap.docs
                    .map(d => d.data().studentId)
                    .filter(id => id !== currentUser.uid)
                )];

                if (otherStudentIds.length === 0) {
                    setClassmates([]);
                    setIsLoadingData(false);
                    return;
                }

                // 3. Récupérer les profils des collègues
                const usersSnap = await getDocs(query(
                    collection(db, 'users'),
                    where(documentId(), 'in', otherStudentIds.slice(0, 30))
                ));

                setClassmates(usersSnap.docs.map(d => ({ uid: d.id, ...d.data() } as NdaraUser)));
            } catch (error) {
                console.error("Error fetching classmates:", error);
            } finally {
                setIsLoadingData(false);
            }
        };

        fetchClassmates();
    }, [currentUser?.uid, db]);

    const filteredClassmates = useMemo(() => {
        return classmates.filter(m => 
            m.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            m.careerGoals?.interestDomain?.toLowerCase().includes(searchTerm.toLowerCase())
        ).sort((a, b) => (a.fullName || "").localeCompare(b.fullName || ""));
    }, [classmates, searchTerm]);

    const handleContact = async (memberId: string) => {
        if (!currentUser) return;
        setIsContacting(memberId);
        try {
            const chatId = await startChat(currentUser.uid, memberId);
            router.push(`/student/messages?chatId=${chatId}`);
        } catch (error: any) {
            toast({ variant: 'destructive', title: "Erreur", description: error.message });
        } finally {
            setIsContacting(null);
        }
    };

    const isLoading = isUserLoading || isLoadingData;

    return (
        <div className="flex flex-col gap-8 pb-24 bg-slate-950 min-h-screen bg-grainy">
            <header className="px-4 pt-8 space-y-6">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-primary mb-2">
                        <Users className="h-5 w-5" />
                        <span className="text-[10px] font-black uppercase tracking-[0.3em]">Réseau de Savoir</span>
                    </div>
                    <h1 className="text-3xl font-black text-white uppercase tracking-tight">Mes Collègues</h1>
                </div>
                
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-600" />
                    <Input
                        placeholder="Chercher un nom ou un domaine..."
                        className="h-14 pl-12 bg-slate-900 border-slate-800 rounded-2xl text-white placeholder:text-slate-600 focus-visible:ring-primary/30"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
            </header>

            <div className="px-4 space-y-4">
                {isLoading ? (
                    <div className="space-y-4">
                        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-[2rem] bg-slate-900 border border-slate-800" />)}
                    </div>
                ) : filteredClassmates.length > 0 ? (
                    <div className="grid gap-4 animate-in fade-in duration-700">
                        {filteredClassmates.map(member => (
                            <div key={member.uid} className="bg-slate-900/50 border border-slate-800 rounded-[2.5rem] p-5 flex items-center gap-4 group active:scale-[0.98] transition-all shadow-xl">
                                <Avatar className="h-16 w-16 border-2 border-slate-800 shadow-2xl">
                                    <AvatarImage src={member.profilePictureURL} className="object-cover" />
                                    <AvatarFallback className="bg-slate-800 text-slate-500 font-black uppercase">{member.fullName?.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-bold text-white text-base truncate">{member.fullName}</h3>
                                    <Badge className="bg-primary/10 text-primary border-none text-[9px] font-black uppercase tracking-widest mt-1">
                                        <GraduationCap className="h-2.5 w-2.5 mr-1" />
                                        {member.careerGoals?.interestDomain || 'Apprenant'}
                                    </Badge>
                                </div>
                                <Button 
                                    size="icon" 
                                    className="h-12 w-12 rounded-2xl bg-slate-800 hover:bg-primary text-slate-400 hover:text-white transition-all shadow-lg border-none"
                                    onClick={() => handleContact(member.uid)}
                                    disabled={isContacting === member.uid}
                                >
                                    {isContacting === member.uid ? <Loader2 className="h-5 w-5 animate-spin" /> : <MessageSquare className="h-5 w-5" />}
                                </Button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="py-24 text-center flex flex-col items-center opacity-30 animate-in zoom-in duration-500">
                        <Users className="h-16 w-16 mb-4 text-slate-600" />
                        <p className="text-sm font-black uppercase tracking-widest text-slate-500 max-w-[250px] leading-relaxed">
                            Inscrivez-vous à des formations pour rencontrer d'autres Ndara.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
