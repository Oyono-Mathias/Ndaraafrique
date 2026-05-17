'use client';

/**
 * @fileOverview Modal unifié de gestion d'accès et de permissions (Design Elite Qwen).
 * ✅ FUSION : Regroupe l'attribution de cours, l'historique et les permissions spéciales.
 * ✅ ANDROID-FIRST : Interface tactile haute-fidélité.
 */

import { useState, useEffect, useMemo } from 'react';
import { getFirestore, collection, query, where, getDocs, orderBy, doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { useRole } from '@/context/RoleContext';
import { useToast } from '@/hooks/use-toast';
import { grantCourseAccess } from '@/actions/userActions';
import { updateSpecialPermissionsAction } from '@/actions/adminActions';
import type { NdaraUser, Course, Enrollment } from '@/lib/types';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
    Loader2, 
    ShieldCheck, 
    BookOpen, 
    Clock, 
    History, 
    Shield, 
    Download, 
    Users, 
    Check, 
    X,
    UserCheck,
    CheckCircle2
} from 'lucide-react';
import { cn } from '@/lib/utils';

const DURATION_OPTIONS = [
    { label: '3 Mois', value: 90 },
    { label: '6 Mois', value: 180 },
    { label: '1 An', value: 365 },
    { label: 'À Vie', value: 0 },
];

interface ManageAccessModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  user: NdaraUser | null;
}

export function ManageAccessModal({ isOpen, onOpenChange, user }: ManageAccessModalProps) {
  const { currentUser: admin } = useRole();
  const { toast } = useToast();
  const db = getFirestore();

  const [courses, setCourses] = useState<Course[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
  const [selectedDuration, setSelectedDuration] = useState<number>(180);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [showSuccess, setShowSuccess] = useState(false);

  // Écouteur des données en temps réel
  useEffect(() => {
    if (!isOpen || !user) return;

    setIsLoadingData(true);
    const fetchCourses = async () => {
        const q = query(collection(db, 'courses'), where('status', '==', 'Published'), orderBy('title'));
        const snap = await getDocs(q);
        setCourses(snap.docs.map(d => ({ id: d.id, ...d.data() } as Course)));
    };

    const qEnroll = query(collection(db, 'enrollments'), where('studentId', '==', user.uid));
    const unsubEnroll = onSnapshot(qEnroll, (snap) => {
        setEnrollments(snap.docs.map(d => ({ id: d.id, ...d.data() } as Enrollment)));
        setIsLoadingData(false);
    });

    fetchCourses();
    return () => unsubEnroll();
  }, [isOpen, user, db]);

  const stats = useMemo(() => ({
      total: enrollments.length,
      completed: enrollments.filter(e => e.progress === 100).length,
      active: enrollments.filter(e => e.accessStatus === 'active' && e.progress < 100).length
  }), [enrollments]);

  const handleToggleCourse = (id: string) => {
      setSelectedCourses(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);
  };

  const handleSave = async () => {
    if (!admin || !user || (selectedCourses.length === 0 && !isProcessing)) return;
    setIsProcessing(true);

    try {
        // 1. Attribution des cours sélectionnés
        const promises = selectedCourses.map(courseId => 
            grantCourseAccess({
                studentId: user.uid,
                courseId,
                adminId: admin.uid,
                reason: 'Attribution manuelle (Admin)',
                expirationInDays: selectedDuration > 0 ? selectedDuration : undefined
            })
        );

        await Promise.all(promises);

        setShowSuccess(true);
        setSelectedCourses([]);
    } catch (e) {
        toast({ variant: 'destructive', title: 'Erreur', description: 'Échec de la mise à jour.' });
    } finally {
        setIsProcessing(false);
    }
  };

  const toggleSpecialPermission = async (key: 'canDownloadOffline' | 'hasPremiumCommunityAccess', value: boolean) => {
      if (!admin || !user) return;
      const result = await updateSpecialPermissionsAction({
          adminId: admin.uid,
          targetUserId: user.uid,
          permissions: { [key]: value }
      });
      if (!result.success) toast({ variant: 'destructive', title: "Erreur permission" });
  };

  if (!user) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md h-[95vh] flex flex-col p-0 bg-[#0F172A] border-none rounded-t-[2.5rem] overflow-hidden fixed bottom-0 top-auto translate-y-0 sm:relative sm:rounded-[2.5rem]">
        <div className="grain-overlay opacity-[0.04]" />
        
        {/* --- HEADER --- */}
        <header className="px-4 py-4 bg-[#1E293B]/70 backdrop-blur-xl border-b border-white/5 z-40 safe-top">
            <div className="flex items-center gap-3">
                <button onClick={() => onOpenChange(false)} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-slate-400 active:scale-90 transition">
                    <X size={20} />
                </button>
                <div className="flex-1">
                    <h1 className="font-black text-lg text-white tracking-wide uppercase">GÉRER L'ACCÈS</h1>
                    <p className="text-slate-500 text-[10px] uppercase font-bold tracking-widest">Formations & Permissions</p>
                </div>
            </div>
        </header>

        <ScrollArea className="flex-1 z-10">
            <div className="px-4 pt-6 space-y-8 pb-32">
                
                {/* --- USER INFO CARD --- */}
                <div className="bg-[#1E293B]/50 backdrop-blur-md rounded-4xl p-5 border border-white/5 shadow-2xl animate-in slide-in-from-bottom-4 duration-500">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="relative">
                            <Avatar className="h-16 w-16 border-2 border-primary shadow-xl">
                                <AvatarImage src={user.profilePictureURL} className="object-cover" />
                                <AvatarFallback className="bg-slate-800 text-slate-500 font-black">{user.fullName?.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-primary/20 rounded-full flex items-center justify-center text-primary border-2 border-[#1E293B]">
                                <UserCheck size={12} />
                            </div>
                        </div>
                        <div className="flex-1">
                            <h2 className="font-black text-white text-base uppercase truncate">{user.fullName}</h2>
                            <p className="text-primary text-[10px] font-black uppercase tracking-widest">@{user.username}</p>
                            <p className="text-slate-500 text-[9px] mt-1 font-mono">{user.email}</p>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2 pt-4 border-t border-white/5">
                        <StatBox label="Cours" value={stats.total} />
                        <StatBox label="Finis" value={stats.completed} color="text-primary" />
                        <StatBox label="En Cours" value={stats.active} color="text-amber-500" />
                    </div>
                </div>

                {/* --- AVAILABLE COURSES --- */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between px-1">
                        <h2 className="font-black text-white text-[10px] uppercase tracking-[0.3em] flex items-center gap-2">
                            <BookOpen size={14} className="text-primary" />
                            Catalogue Disponible
                        </h2>
                        <button 
                            onClick={() => setSelectedCourses(courses.map(c => c.id))}
                            className="text-primary text-[9px] font-black uppercase tracking-widest hover:text-white transition"
                        >
                            TOUT SÉLECTIONNER
                        </button>
                    </div>

                    <div className="grid gap-3">
                        {isLoadingData ? (
                            [...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-3xl bg-slate-900" />)
                        ) : (
                            courses.map(course => {
                                const isSelected = selectedCourses.includes(course.id);
                                const isAlreadyEnrolled = enrollments.some(e => e.courseId === course.id && e.accessStatus === 'active');

                                return (
                                    <button
                                        key={course.id}
                                        disabled={isAlreadyEnrolled}
                                        onClick={() => handleToggleCourse(course.id)}
                                        className={cn(
                                            "w-full text-left p-4 rounded-3xl border transition-all flex items-center gap-4 active:scale-[0.98]",
                                            isSelected ? "bg-primary/10 border-primary" : "bg-slate-900/50 border-white/5",
                                            isAlreadyEnrolled && "opacity-40 grayscale cursor-not-allowed"
                                        )}
                                    >
                                        <div className={cn(
                                            "w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors",
                                            isSelected ? "bg-primary border-primary" : "border-slate-700"
                                        )}>
                                            {isSelected && <Check size={14} className="text-slate-950 stroke-[4px]" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-white text-sm uppercase truncate tracking-tight">{course.title}</p>
                                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-0.5">Par Expert Ndara • {course.category}</p>
                                        </div>
                                        {isAlreadyEnrolled ? (
                                            <Badge className="bg-emerald-500/10 text-emerald-500 border-none text-[7px] font-black px-1.5 h-4">ACQUIS</Badge>
                                        ) : (
                                            <p className="text-primary font-black text-sm uppercase">{course.price.toLocaleString()} F</p>
                                        )}
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* --- DURATION SELECTOR --- */}
                <div className="space-y-4">
                    <h2 className="font-black text-white text-[10px] uppercase tracking-[0.3em] flex items-center gap-2 px-1">
                        <Clock size={14} className="text-amber-500" />
                        Durée de l'attribution
                    </h2>
                    <div className="grid grid-cols-4 gap-2">
                        {DURATION_OPTIONS.map(opt => (
                            <button
                                key={opt.value}
                                onClick={() => setSelectedDuration(opt.value)}
                                className={cn(
                                    "py-3 rounded-2xl border text-[9px] font-black uppercase tracking-widest transition-all active:scale-95",
                                    selectedDuration === opt.value 
                                        ? "bg-primary text-slate-950 border-primary shadow-lg shadow-primary/20" 
                                        : "bg-slate-900 border-white/5 text-slate-500"
                                )}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* --- CURRENT ACCESS HISTORY --- */}
                <div className="space-y-4">
                    <h2 className="font-black text-white text-[10px] uppercase tracking-[0.3em] flex items-center gap-2 px-1">
                        <History size={14} className="text-slate-600" />
                        Droits en cours
                    </h2>
                    <div className="grid gap-2">
                        {enrollments.length > 0 ? (
                            enrollments.map(enroll => (
                                <div key={enroll.id} className="bg-slate-900/40 border border-white/5 p-4 rounded-3xl flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-inner">
                                            <Check size={16} />
                                        </div>
                                        <div>
                                            <p className="font-bold text-white text-[13px] uppercase truncate max-w-[150px]">{enroll.courseTitle || 'Formation'}</p>
                                            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter">
                                                Expire le {enroll.expiresAt ? new Date((enroll.expiresAt as any).seconds * 1000).toLocaleDateString() : 'Jamais'}
                                            </p>
                                        </div>
                                    </div>
                                    <Badge className={cn(
                                        "font-black text-[8px] uppercase border-none px-2 h-4",
                                        enroll.accessStatus === 'active' ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"
                                    )}>
                                        {enroll.accessStatus === 'active' ? 'ACTIF' : 'RÉVOQUÉ'}
                                    </Badge>
                                </div>
                            ))
                        ) : (
                            <p className="text-center py-8 text-[9px] font-black text-slate-700 uppercase tracking-widest italic">Aucun droit historique</p>
                        )}
                    </div>
                </div>

                {/* --- SPECIAL PERMISSIONS --- */}
                <div className="space-y-4">
                    <h2 className="font-black text-white text-[10px] uppercase tracking-[0.3em] flex items-center gap-2 px-1">
                        <Shield size={14} className="text-blue-500" />
                        Privilèges Spéciaux
                    </h2>
                    <div className="grid gap-3">
                        <PermissionToggle 
                            icon={Download} 
                            label="Téléchargement Hors-Ligne" 
                            desc="Autoriser le stockage local des cours" 
                            color="bg-purple-500/10 text-purple-400"
                            checked={user.restrictions?.canDownloadOffline ?? true}
                            onChange={(v) => toggleSpecialPermission('canDownloadOffline', v)}
                        />
                        <PermissionToggle 
                            icon={Users} 
                            label="Communauté Premium" 
                            desc="Accès aux cercles privés d'experts" 
                            color="bg-blue-500/10 text-blue-400"
                            checked={user.restrictions?.hasPremiumCommunityAccess ?? false}
                            onChange={(v) => toggleSpecialPermission('hasPremiumCommunityAccess', v)}
                        />
                    </div>
                </div>
            </div>
        </ScrollArea>

        {/* --- STICKY FOOTER --- */}
        <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-[#0F172A] via-[#0F172A]/90 to-transparent z-40 safe-area-pb">
            <div className="flex gap-3">
                <button 
                    onClick={() => onOpenChange(false)}
                    className="flex-1 bg-slate-900 border border-white/5 text-slate-400 py-4 rounded-[2rem] font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition active:scale-95 shadow-xl"
                >
                    Fermer
                </button>
                <Button 
                    onClick={handleSave}
                    disabled={isProcessing || selectedCourses.length === 0}
                    className="flex-1 bg-primary hover:bg-emerald-400 text-slate-950 py-4 h-auto rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-2xl shadow-primary/30 transition-all active:scale-95 animate-pulse-glow border-none"
                >
                    {isProcessing ? <Loader2 className="animate-spin h-5 w-5" /> : <><Check size={18} className="mr-2" /> <span>Enregistrer</span></>}
                </Button>
            </div>
        </div>

        {/* --- SUCCESS MODAL --- */}
        {showSuccess && (
            <div className="absolute inset-0 z-[100] flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-8 animate-in fade-in duration-500">
                <div className="bg-slate-900 border border-primary/20 rounded-4xl p-10 text-center space-y-6 shadow-[0_0_50px_rgba(16,185,129,0.2)] animate-in zoom-in duration-500">
                    <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center mx-auto shadow-[0_0_25px_#10B981]">
                        <Check size={40} className="text-slate-950 stroke-[4px]" />
                    </div>
                    <div>
                        <h3 className="text-2xl font-black text-white uppercase tracking-tight">Accès mis à jour !</h3>
                        <p className="text-slate-500 text-sm mt-2 leading-relaxed italic">"Les privilèges de {user.fullName} ont été synchronisés."</p>
                    </div>
                    <Button 
                        onClick={() => setShowSuccess(false)}
                        className="w-full h-14 rounded-2xl bg-white text-slate-950 font-black uppercase text-[10px] tracking-widest"
                    >
                        Continuer
                    </Button>
                </div>
            </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function StatBox({ label, value, color = "text-white" }: { label: string, value: number, color?: string }) {
    return (
        <div className="text-center py-2">
            <p className={cn("text-2xl font-black leading-none mb-1", color)}>{value}</p>
            <p className="text-slate-600 text-[8px] font-black uppercase tracking-widest">{label}</p>
        </div>
    );
}

function PermissionToggle({ icon: Icon, label, desc, color, checked, onChange }: any) {
    return (
        <div className="bg-slate-900/60 rounded-3xl p-4 border border-white/5 flex items-center justify-between transition-all active:scale-[0.98]">
            <div className="flex items-center gap-4">
                <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-inner", color)}>
                    <Icon size={20} />
                </div>
                <div className="min-w-0">
                    <p className="font-bold text-white text-[13px] uppercase tracking-tight">{label}</p>
                    <p className="text-[9px] text-slate-500 font-medium uppercase tracking-tighter truncate max-w-[160px]">{desc}</p>
                </div>
            </div>
            <Switch checked={checked} onCheckedChange={onChange} className="data-[state=checked]:bg-primary" />
        </div>
    );
}
