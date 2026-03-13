'use client';

/**
 * @fileOverview Annuaire communautaire Ndara Afrique - Redesign Android-First.
 * ✅ GÉO : Rendu du drapeau dynamique basé sur le pays du collègue.
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
import { 
    Search, 
    MessageSquare, 
    Loader2, 
    Users, 
    GraduationCap, 
    Filter, 
    Mic, 
    Activity, 
    Globe,
    Leaf,
    ChartLine,
    Coins,
    Cpu,
    Code,
    CheckCircle2,
    MapPin
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { africanCountries } from '@/lib/countries';

const CATEGORIES = [
    { id: 'all', name: "Tous", icon: Users },
    { id: 'FinTech', name: "FinTech", icon: ChartLine, color: 'text-blue-400 bg-blue-400/10' },
    { id: 'AgriTech', name: "AgriTech", icon: Leaf, color: 'text-emerald-400 bg-emerald-400/10' },
    { id: 'Trading', name: "Trading", icon: Coins, color: 'text-orange-400 bg-orange-400/10' },
    { id: 'Mécatronique', name: "MécaTech", icon: Cpu, color: 'text-purple-400 bg-purple-400/10' },
    { id: 'Développement Web', name: "Dév Web", icon: Code, color: 'text-pink-400 bg-pink-400/10' }
];

export default function AnnuairePage() {
    const { currentUser, isUserLoading } = useRole();
    const db = getFirestore();
    const router = useRouter();
    const { toast } = useToast();

    const [searchTerm, setSearchTerm] = useState('');
    const [selectedDomain, setSelectedDomain] = useState('all');
    const [isContacting, setIsContacting] = useState<string | null>(null);
    const [classmates, setClassmates] = useState<NdaraUser[]>([]);
    const [isLoadingData, setIsLoadingData] = useState(true);

    useEffect(() => {
        if (!currentUser?.uid) return;

        const fetchClassmates = async () => {
            setIsLoadingData(true);
            try {
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
        return classmates.filter(m => {
            const matchesSearch = m.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                 m.careerGoals?.interestDomain?.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesDomain = selectedDomain === 'all' || m.careerGoals?.interestDomain === selectedDomain;
            return matchesSearch && matchesDomain;
        }).sort((a, b) => (a.fullName || "").localeCompare(b.fullName || ""));
    }, [classmates, searchTerm, selectedDomain]);

    const stats = useMemo(() => {
        const onlineCount = classmates.filter(c => c.isOnline).length;
        const countries = new Set(classmates.map(c => c.countryName).filter(Boolean));
        return {
            total: classmates.length,
            online: onlineCount,
            countries: countries.size || 1
        };
    }, [classmates]);

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

    const getFlagEmoji = (code?: string) => {
        if (!code) return "🌍";
        return africanCountries.find(c => c.code === code)?.emoji || "🌍";
    }

    const isLoading = isUserLoading || isLoadingData;

    return (
        <div className="flex flex-col gap-0 pb-24 bg-[#0f172a] min-h-screen relative">
            <div className="grain-overlay" />
            
            <header className="sticky top-0 z-40 bg-[#0f172a]/95 backdrop-blur-md border-b border-white/5 safe-area-pt">
                <div className="px-6 py-6 flex items-center justify-between">
                    <div>
                        <h1 className="font-black text-3xl text-white mb-1 uppercase tracking-tight">Communauté</h1>
                        <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">{stats.total} Ndara connectés</p>
                    </div>
                    <Button variant="ghost" size="icon" className="rounded-full bg-[#1e293b] text-slate-400">
                        <Filter className="h-5 w-5" />
                    </Button>
                </div>

                <div className="px-6 pb-4">
                    <div className="relative group">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <Search className="h-4 w-4 text-primary" />
                        </div>
                        <Input 
                            placeholder="Chercher un membre, un domaine..." 
                            className="h-14 pl-14 pr-12 bg-[#1e293b] border-white/5 rounded-[2rem] text-white placeholder:text-slate-600 focus-visible:ring-primary/30 shadow-xl"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                        <button className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary active:scale-90 transition-transform">
                            <Mic className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                <div className="px-6 pb-4 overflow-hidden">
                    <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
                        {CATEGORIES.map(cat => (
                            <button 
                                key={cat.id}
                                onClick={() => setSelectedDomain(cat.id)}
                                className={cn(
                                    "flex-shrink-0 px-5 py-2.5 rounded-full border text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 flex items-center gap-2",
                                    selectedDomain === cat.id 
                                        ? "bg-primary text-[#0f172a] border-primary shadow-lg shadow-primary/20" 
                                        : "bg-[#1e293b] border-white/5 text-slate-500"
                                )}
                            >
                                {cat.icon && <cat.icon className="h-3 w-3" />}
                                {cat.name}
                            </button>
                        ))}
                    </div>
                </div>
            </header>

            <main className="px-6 pt-6 space-y-8">
                <section className="grid grid-cols-3 gap-3">
                    <div className="bg-[#1e293b] rounded-3xl p-4 border border-white/5 text-center shadow-xl">
                        <p className="text-2xl font-black text-primary leading-none">{stats.total}</p>
                        <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest mt-2">Membres</p>
                    </div>
                    <div className="bg-[#1e293b] rounded-3xl p-4 border border-white/5 text-center shadow-xl">
                        <p className="text-2xl font-black text-blue-400 leading-none">{stats.online}</p>
                        <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest mt-2">En Ligne</p>
                    </div>
                    <div className="bg-[#1e293b] rounded-3xl p-4 border border-white/5 text-center shadow-xl">
                        <p className="text-2xl font-black text-purple-400 leading-none">{stats.countries}</p>
                        <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest mt-2">Pays</p>
                    </div>
                </section>

                <div className="space-y-4">
                    <h2 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em] px-1">Membres Récents</h2>
                    
                    {isLoading ? (
                        <div className="space-y-4">
                            {[...Array(4)].map((_, i) => (
                                <div key={i} className="p-5 flex items-center gap-4 bg-[#1e293b]/50 rounded-[2.5rem] border border-white/5">
                                    <Skeleton className="h-14 w-14 rounded-full bg-slate-800 shrink-0" />
                                    <div className="flex-1 space-y-2">
                                        <Skeleton className="h-4 w-1/2 bg-slate-800" />
                                        <Skeleton className="h-3 w-1/3 bg-slate-800" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : filteredClassmates.length > 0 ? (
                        <div className="grid gap-4 animate-in fade-in duration-700">
                            {filteredClassmates.map(member => {
                                const domainInfo = CATEGORIES.find(c => c.id === member.careerGoals?.interestDomain) || CATEGORIES[0];
                                
                                return (
                                    <div key={member.uid} className="bg-[#1e293b] rounded-[2.5rem] p-4 border border-white/5 flex items-center gap-4 shadow-xl active:scale-[0.97] transition-all group">
                                        <div className="relative flex-shrink-0">
                                            <Avatar className="h-14 w-14 border-2 border-white/10 shadow-2xl">
                                                <AvatarImage src={member.profilePictureURL} className="object-cover" />
                                                <AvatarFallback className="bg-slate-800 text-slate-500 font-black uppercase">
                                                    {member.fullName?.charAt(0)}
                                                </AvatarFallback>
                                            </Avatar>
                                            {member.isOnline && (
                                                <div className="absolute bottom-0 right-0 w-4 h-4 bg-primary rounded-full border-2 border-[#0f172a] shadow-[0_0_10px_rgba(16,185,129,0.5)] animate-pulse" />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-black text-white text-base truncate group-hover:text-primary transition-colors">{member.fullName}</h3>
                                            <div className="flex items-center gap-2 mt-1">
                                                <Badge className={cn("border px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tighter", domainInfo.color || 'bg-slate-800 text-slate-400 border-slate-700')}>
                                                    {member.careerGoals?.interestDomain || 'Apprenant'}
                                                </Badge>
                                                <span className="text-[11px] flex items-center gap-1 font-bold text-slate-600">
                                                    <span>{getFlagEmoji(member.countryCode)}</span>
                                                    <span className="uppercase tracking-tighter truncate max-w-[80px]">{member.countryName || 'Afrique'}</span>
                                                </span>
                                            </div>
                                        </div>
                                        <Button 
                                            size="icon" 
                                            className="h-12 w-12 rounded-full bg-primary/10 hover:bg-primary text-primary hover:text-[#0f172a] transition-all shadow-lg border border-primary/20 shrink-0"
                                            onClick={() => handleContact(member.uid)}
                                            disabled={isContacting === member.uid}
                                        >
                                            {isContacting === member.uid ? <Loader2 className="h-5 w-5 animate-spin" /> : <MessageSquare className="h-5 w-5" />}
                                        </Button>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="py-24 text-center flex flex-col items-center opacity-30 animate-in zoom-in duration-500">
                            <Users className="h-16 w-16 mb-4 text-slate-600" />
                            <h3 className="text-xl font-black text-white uppercase tracking-tight">Aucun membre</h3>
                            <p className="text-sm font-medium text-slate-500 mt-2 max-w-[220px] mx-auto">
                                Aucun camarade ne correspond à vos critères de recherche.
                            </p>
                        </div>
                    )}
                </div>

                <section className="bg-primary/5 border border-primary/10 rounded-[2.5rem] p-8 text-center space-y-4">
                    <Globe className="h-10 w-10 text-primary mx-auto opacity-50" />
                    <h3 className="text-lg font-black text-white uppercase tracking-tight">Le Savoir se partage</h3>
                    <p className="text-[10px] text-slate-500 leading-relaxed font-bold uppercase tracking-widest">
                        N'hésitez pas à contacter vos collègues pour échanger sur vos cours ou collaborer sur des projets réels.
                    </p>
                </section>
            </main>
        </div>
    );
}
