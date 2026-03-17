
'use client';

/**
 * @fileOverview Centre de Diffusion & Notifications Push - Design Elite Qwen.
 * ✅ ANDROID-FIRST : Prévisualisation Lock-Screen réelle.
 * ✅ CONNECTÉ : Enregistre les campagnes dans Firestore.
 */

import { useState, useMemo, useEffect } from 'react';
import { useCollection } from '@/firebase';
import { getFirestore, collection, query, orderBy, limit, serverTimestamp } from 'firebase/firestore';
import { 
    Radio, 
    Send, 
    History, 
    Smartphone, 
    Clock, 
    Users, 
    Loader2, 
    CheckCircle2, 
    Lock, 
    Phone, 
    Camera, 
    Edit3,
    ArrowRight,
    Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { createPushCampaign } from '@/actions/notificationActions';
import type { PushCampaign } from '@/lib/types';

export function PushCenterClient() {
    const db = getFirestore();
    const { toast } = useToast();
    
    const [message, setMessage] = useState('');
    const [target, setTarget] = useState<'all' | 'instructor' | 'student'>('all');
    const [schedule, setSchedule] = useState<'now' | '1h' | 'morning'>('now');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [currentTime, setCurrentTime] = useState(new Date());

    const campaignsQuery = useMemo(() => query(collection(db, 'push_campaigns'), orderBy('createdAt', 'desc'), limit(10)), [db]);
    const { data: campaigns, isLoading: loadingHistory } = useCollection<PushCampaign>(campaignsQuery);

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const handleSendPush = async () => {
        if (!message.trim()) return;
        setIsSubmitting(true);

        const result = await createPushCampaign({
            message,
            target,
            status: schedule === 'now' ? 'sent' : 'scheduled',
            scheduledFor: serverTimestamp(), // À raffiner selon le choix du schedule
            sentAt: schedule === 'now' ? serverTimestamp() : undefined,
            stats: { delivered: 12450, clicked: 0 } // Simulation stats
        });

        if (result.success) {
            toast({ title: "Diffusion lancée !", description: "Vos membres recevront l'alerte sous peu." });
            setMessage('');
        } else {
            toast({ variant: 'destructive', title: "Erreur", description: result.error });
        }
        setIsSubmitting(false);
    };

    return (
        <div className="space-y-10 pb-20 animate-in fade-in duration-700 relative">
            <header>
                <div className="flex items-center gap-2 text-ndara-orange mb-1">
                    <Radio className="h-4 w-4" />
                    <span className="text-[10px] font-black uppercase tracking-[0.3em]">Communication de Masse</span>
                </div>
                <h1 className="text-3xl font-black text-white uppercase tracking-tight">Centre de Diffusion</h1>
                <p className="text-slate-500 text-sm font-medium mt-1">Faites vibrer les smartphones de votre communauté.</p>
            </header>

            <div className="grid lg:grid-cols-2 gap-10 items-start">
                
                {/* --- CONSOLE DE RÉDACTION --- */}
                <div className="space-y-6">
                    <h2 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em] flex items-center gap-2 px-1">
                        <Edit3 className="h-4 w-4 text-primary" />
                        Console de Rédaction
                    </h2>
                    
                    <div className="bg-slate-900/50 backdrop-blur-xl border border-white/5 rounded-4xl p-8 space-y-8 shadow-2xl">
                        {/* Target Selection */}
                        <div className="space-y-3">
                            <label className="text-[10px] font-black uppercase text-slate-600 tracking-widest ml-1">Audience Cible</label>
                            <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
                                <TargetPill active={target === 'all'} label="TOUS" onClick={() => setTarget('all')} />
                                <TargetPill active={target === 'instructor'} label="EXPERTS" onClick={() => setTarget('instructor')} />
                                <TargetPill active={target === 'student'} label="NDARA" onClick={() => setTarget('student')} />
                            </div>
                        </div>

                        {/* Message Input */}
                        <div className="space-y-3">
                            <div className="flex justify-between items-center px-1">
                                <label className="text-[10px] font-black uppercase text-slate-600 tracking-widest">Message Push</label>
                                <span className={cn("text-[10px] font-mono", message.length > 140 ? "text-amber-500" : "text-slate-700")}>
                                    {message.length}/160
                                </span>
                            </div>
                            <Textarea 
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                maxLength={160}
                                placeholder="Nouveau cours disponible ! Profitez de -20%..."
                                className="bg-slate-950/50 border-white/5 rounded-3xl p-5 text-white resize-none h-32 focus-visible:ring-primary/20 text-sm leading-relaxed"
                            />
                        </div>

                        {/* Scheduler */}
                        <div className="space-y-3">
                            <label className="text-[10px] font-black uppercase text-slate-600 tracking-widest ml-1">Planification</label>
                            <div className="grid grid-cols-3 gap-2">
                                <ScheduleBtn active={schedule === 'now'} label="Maintenant" onClick={() => setSchedule('now')} />
                                <ScheduleBtn active={schedule === '1h'} label="+1 Heure" onClick={() => setSchedule('1h')} />
                                <ScheduleBtn active={schedule === 'morning'} label="Demain 9h" onClick={() => setSchedule('morning')} />
                            </div>
                        </div>

                        <Button 
                            onClick={handleSendPush}
                            disabled={!message.trim() || isSubmitting}
                            className="w-full h-16 rounded-[2rem] bg-ndara-orange hover:bg-orange-600 text-white font-black uppercase text-xs tracking-widest shadow-2xl shadow-orange-500/20 transition-all active:scale-95 animate-pulse-glow border-none"
                        >
                            {isSubmitting ? <Loader2 className="animate-spin mr-2 h-5 w-5" /> : <Send className="mr-2 h-5 w-5" />}
                            Diffuser Maintenant
                        </Button>
                    </div>
                </div>

                {/* --- MOBILE PREVIEW --- */}
                <div className="space-y-6">
                    <h2 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em] flex items-center gap-2 px-1">
                        <Smartphone className="h-4 w-4 text-ndara-orange" />
                        Prévisualisation Live
                    </h2>

                    <div className="flex justify-center perspective-1000">
                        <div className="w-[280px] h-[520px] bg-slate-900 rounded-[3rem] border-[6px] border-slate-800 relative overflow-hidden shadow-2xl rotate-y-[-5deg] transition-transform duration-700 hover:rotate-y-0">
                            {/* Screen Background */}
                            <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-950"></div>
                            <div className="absolute inset-0 opacity-20 bg-[url('https://picsum.photos/seed/ndara-lock/400/800')] bg-cover"></div>
                            
                            {/* Lock Screen Header */}
                            <div className="pt-12 text-center relative z-10 space-y-1">
                                <Lock size={12} className="mx-auto text-white/40 mb-2" />
                                <p className="text-4xl font-black text-white/90 tracking-tighter">
                                    {format(currentTime, 'HH:mm')}
                                </p>
                                <p className="text-[10px] text-white/60 font-bold uppercase tracking-widest">
                                    {format(currentTime, 'EEEE d MMMM', { locale: fr })}
                                </p>
                            </div>

                            {/* Notification Bubble */}
                            <div className="mt-12 px-4 relative z-10">
                                <div className={cn(
                                    "bg-white/10 backdrop-blur-xl border border-white/10 p-4 rounded-3xl shadow-2xl transition-all duration-500",
                                    message ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-4 scale-95"
                                )}>
                                    <div className="flex items-start gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0 shadow-lg">
                                            <Radio size={16} className="text-slate-900" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-center mb-0.5">
                                                <p className="text-white text-[10px] font-black uppercase tracking-widest">NDARA AFRIQUE</p>
                                                <span className="text-white/40 text-[8px] font-bold">À L'INSTANT</span>
                                            </div>
                                            <p className="text-white/90 text-xs leading-tight font-medium line-clamp-3 italic">
                                                {message || "Votre message push apparaîtra ici..."}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Android Navigation Footer */}
                            <div className="absolute bottom-10 left-0 right-0 flex justify-around px-8 z-10">
                                <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/40">
                                    <Phone size={16} />
                                </div>
                                <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/40">
                                    <Camera size={16} />
                                </div>
                            </div>
                            
                            {/* Home Bar */}
                            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-24 h-1 bg-white/20 rounded-full"></div>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- HISTORIQUE --- */}
            <div className="space-y-6">
                <div className="flex items-center gap-2 text-slate-500 ml-1">
                    <History className="h-4 w-4" />
                    <h2 className="text-[11px] font-black uppercase tracking-[0.3em]">Archives de Diffusion</h2>
                </div>

                <div className="bg-slate-900/50 backdrop-blur-xl border border-white/5 rounded-4xl overflow-hidden shadow-2xl">
                    {loadingHistory ? (
                        <div className="p-8 space-y-4">
                            <Skeleton className="h-16 w-full rounded-2xl bg-slate-800" />
                            <Skeleton className="h-16 w-full rounded-2xl bg-slate-800" />
                        </div>
                    ) : campaigns && campaigns.length > 0 ? (
                        <div className="divide-y divide-white/5">
                            {campaigns.map(camp => (
                                <div key={camp.id} className="p-6 flex items-center justify-between hover:bg-white/[0.02] transition-all group">
                                    <div className="flex items-center gap-5">
                                        <div className={cn(
                                            "w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner",
                                            camp.status === 'sent' ? "bg-emerald-500/10 text-primary" : "bg-amber-500/10 text-amber-500"
                                        )}>
                                            {camp.status === 'sent' ? <CheckCircle2 size={24} /> : <Clock size={24} />}
                                        </div>
                                        <div>
                                            <p className="text-white text-sm font-bold leading-relaxed line-clamp-1 italic max-w-xs md:max-w-md">"{camp.message}"</p>
                                            <div className="flex items-center gap-3 mt-1.5 text-[9px] font-black uppercase tracking-widest text-slate-600">
                                                <Users size={10} className="text-slate-700" />
                                                <span>{camp.target === 'all' ? 'Toute la communauté' : camp.target === 'instructor' ? 'Experts uniquement' : 'Étudiants'}</span>
                                                <span className="text-slate-800">•</span>
                                                <span>Envoyé le {camp.createdAt && typeof (camp.createdAt as any).toDate === 'function' ? format((camp.createdAt as any).toDate(), 'dd MMM HH:mm', { locale: fr }) : '...'}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right hidden sm:block">
                                        <p className="text-primary font-black text-lg leading-none mb-1">{(camp.stats?.delivered || 0).toLocaleString()}</p>
                                        <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Délivrés</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="py-20 text-center opacity-20">
                            <Radio size={48} className="mx-auto mb-4 text-slate-600" />
                            <p className="text-xs font-black uppercase tracking-widest">Aucune diffusion enregistrée</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function TargetPill({ active, label, onClick }: { active: boolean, label: string, onClick: () => void }) {
    return (
        <button 
            onClick={onClick}
            className={cn(
                "flex-shrink-0 px-6 py-2.5 rounded-full border text-[10px] font-black uppercase tracking-widest transition-all active:scale-95",
                active ? "bg-primary text-slate-950 border-primary shadow-lg shadow-primary/20" : "bg-slate-950 border-white/5 text-slate-500 hover:text-white"
            )}
        >
            {label}
        </button>
    );
}

function ScheduleBtn({ active, label, onClick }: { active: boolean, label: string, onClick: () => void }) {
    return (
        <button 
            onClick={onClick}
            className={cn(
                "py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 border",
                active ? "bg-primary/10 border-primary/30 text-primary shadow-inner" : "bg-slate-950 border-white/5 text-slate-600 hover:bg-white/5"
            )}
        >
            {label}
        </button>
    );
}
