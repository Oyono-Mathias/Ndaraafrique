'use client';

/**
 * @fileOverview Classement Public des Experts Ndara Afrique (Leaderboard).
 * ✅ MOTIVATION : Affiche les top recruteurs, vendeurs et formateurs.
 * ✅ DESIGN : Immersion premium avec badges de distinction (Or, Argent, Bronze).
 */

import { useState, useMemo, useEffect } from 'react';
import { getFirestore, collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Trophy, Medal, Users, TrendingUp, Star, Crown, ChevronRight, Share2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { NdaraUser } from '@/lib/types';
import Link from 'next/link';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';

export default function LeaderboardPage() {
    const db = getFirestore();
    const [instructors, setInstructors] = useState<NdaraUser[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        setIsLoading(true);
        // Récupérer les instructeurs actifs ayant au moins une vente ou inscription
        const q = query(
            collection(db, 'users'),
            where('role', 'in', ['instructor', 'admin']),
            limit(50)
        );

        const unsubscribe = onSnapshot(q, (snap) => {
            const data = snap.docs.map(d => ({ uid: d.id, ...d.data() } as NdaraUser));
            setInstructors(data);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [db]);

    const topRecruiters = useMemo(() => {
        return [...instructors]
            .filter(u => (u.affiliateStats?.registrations || 0) > 0)
            .sort((a, b) => (b.affiliateStats?.registrations || 0) - (a.affiliateStats?.registrations || 0))
            .slice(0, 10);
    }, [instructors]);

    const topSellers = useMemo(() => {
        return [...instructors]
            .filter(u => (u.affiliateStats?.sales || 0) > 0)
            .sort((a, b) => (b.affiliateStats?.sales || 0) - (a.affiliateStats?.sales || 0))
            .slice(0, 10);
    }, [instructors]);

    const topRated = useMemo(() => {
        return [...instructors]
            .filter(u => (u.rating || 0) > 0)
            .sort((a, b) => (b.rating || 0) - (a.rating || 0))
            .slice(0, 10);
    }, [instructors]);

    return (
        <div className="min-h-screen bg-[#0f172a] text-white font-sans selection:bg-primary/30 bg-grainy">
            <Navbar />
            
            <main className="pt-24 pb-32 px-4 max-w-4xl mx-auto space-y-12">
                <header className="text-center space-y-4 animate-in fade-in slide-in-from-top-4 duration-1000">
                    <div className="inline-block p-2 px-4 bg-primary/10 border border-primary/20 rounded-full mb-2">
                        <p className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">Excellence & Mérite</p>
                    </div>
                    <h1 className="text-4xl md:text-6xl font-black text-white leading-tight uppercase tracking-tight">
                        La Bourse des <br/>
                        <span className="text-primary">Experts Ndara</span>
                    </h1>
                    <p className="text-slate-500 text-lg max-w-xl mx-auto font-medium italic">
                        Célébrons les bâtisseurs du savoir qui propulsent l'Afrique vers le futur.
                    </p>
                </header>

                <Tabs defaultValue="recruiters" className="w-full">
                    <TabsList className="grid w-full grid-cols-3 bg-slate-900 border border-slate-800 h-14 p-1 rounded-2xl mb-8 shadow-2xl">
                        <TabsTrigger value="recruiters" className="rounded-xl font-black uppercase text-[10px] tracking-widest gap-2">
                            <Users size={14} /> <span className="hidden sm:inline">Ambassadeurs</span>
                        </TabsTrigger>
                        <TabsTrigger value="sellers" className="rounded-xl font-black uppercase text-[10px] tracking-widest gap-2">
                            <TrendingUp size={14} /> <span className="hidden sm:inline">Vendeurs</span>
                        </TabsTrigger>
                        <TabsTrigger value="rated" className="rounded-xl font-black uppercase text-[10px] tracking-widest gap-2">
                            <Star size={14} /> <span className="hidden sm:inline">Pédagogues</span>
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="recruiters" className="mt-0 space-y-4 animate-in fade-in duration-500">
                        <LeaderboardGrid 
                            users={topRecruiters} 
                            isLoading={isLoading} 
                            metricLabel="Filleuls" 
                            metricKey="affiliateStats.registrations" 
                        />
                    </TabsContent>

                    <TabsContent value="sellers" className="mt-0 space-y-4 animate-in fade-in duration-500">
                        <LeaderboardGrid 
                            users={topSellers} 
                            isLoading={isLoading} 
                            metricLabel="Ventes" 
                            metricKey="affiliateStats.sales" 
                        />
                    </TabsContent>

                    <TabsContent value="rated" className="mt-0 space-y-4 animate-in fade-in duration-500">
                        <LeaderboardGrid 
                            users={topRated} 
                            isLoading={isLoading} 
                            metricLabel="Note" 
                            metricKey="rating" 
                        />
                    </TabsContent>
                </Tabs>

                <section className="bg-primary/5 border border-primary/10 rounded-[3rem] p-12 text-center space-y-6 shadow-2xl">
                    <div className="p-4 bg-primary/10 rounded-full inline-block mx-auto">
                        <Crown className="h-10 w-10 text-primary" />
                    </div>
                    <h2 className="text-2xl font-black text-white uppercase tracking-tight">Rejoignez l'Élite</h2>
                    <p className="text-slate-400 max-w-md mx-auto text-sm leading-relaxed">
                        Chaque formation partagée, chaque étudiant inscrit vous rapproche du sommet. Devenez un pilier de la communauté Ndara.
                    </p>
                    <Button asChild size="lg" className="h-14 px-10 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-primary/20">
                        <Link href="/devenir-instructeur">Commencer mon aventure</Link>
                    </Button>
                </section>
            </main>

            <Footer />
        </div>
    );
}

function LeaderboardGrid({ users, isLoading, metricLabel, metricKey }: { users: NdaraUser[], isLoading: boolean, metricLabel: string, metricKey: string }) {
    if (isLoading) {
        return (
            <div className="space-y-3">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-3xl bg-slate-900 border border-slate-800" />)}
            </div>
        );
    }

    if (users.length === 0) {
        return (
            <div className="py-20 text-center bg-slate-900/20 rounded-[2.5rem] border-2 border-dashed border-slate-800/50 opacity-30">
                <Medal className="h-12 w-12 mx-auto text-slate-700 mb-4" />
                <p className="font-black uppercase tracking-widest text-xs">Le classement se prépare...</p>
            </div>
        );
    }

    return (
        <div className="grid gap-3">
            {users.map((user, index) => {
                const isGold = index === 0;
                const isSilver = index === 1;
                const isBronze = index === 2;
                
                // Extraction de la valeur métrique
                let val: any = user;
                metricKey.split('.').forEach(k => { val = val?.[k]; });
                const displayVal = metricKey === 'rating' ? (val || 4.8).toFixed(1) : (val || 0);

                return (
                    <Link key={user.uid} href={`/fr/instructor/${user.uid}`}>
                        <Card className={cn(
                            "bg-slate-900 border-slate-800 rounded-3xl overflow-hidden transition-all active:scale-[0.98] group hover:border-primary/30 shadow-xl",
                            isGold && "border-primary/40 bg-gradient-to-r from-slate-900 to-primary/5"
                        )}>
                            <CardContent className="p-5 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className={cn(
                                        "h-10 w-10 rounded-xl flex items-center justify-center font-black text-sm transition-transform group-hover:scale-110",
                                        isGold ? "bg-yellow-500 text-black shadow-[0_0_15px_rgba(234,179,8,0.4)]" :
                                        isSilver ? "bg-slate-300 text-slate-950" :
                                        isBronze ? "bg-orange-600 text-white" : "bg-slate-800 text-slate-500"
                                    )}>
                                        {index + 1}
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Avatar className="h-12 w-12 border border-slate-800">
                                            <AvatarImage src={user.profilePictureURL} className="object-cover" />
                                            <AvatarFallback className="bg-slate-800 text-slate-500 font-bold">{user.fullName?.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <div className="min-w-0">
                                            <p className="font-bold text-white text-base truncate group-hover:text-primary transition-colors">{user.fullName}</p>
                                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{user.careerGoals?.currentRole || 'Expert Ndara'}</p>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="text-right flex items-center gap-4">
                                    <div>
                                        <p className={cn(
                                            "text-xl font-black leading-none",
                                            isGold ? "text-primary" : "text-white"
                                        )}>{displayVal}</p>
                                        <p className="text-[8px] font-black uppercase text-slate-600 tracking-tighter mt-1">{metricLabel}</p>
                                    </div>
                                    <ChevronRight className="h-4 w-4 text-slate-800 group-hover:text-primary transition-all" />
                                </div>
                            </CardContent>
                        </Card>
                    </Link>
                );
            })}
        </div>
    );
}
