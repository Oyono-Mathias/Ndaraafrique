'use client';

/**
 * @fileOverview Mon Profil - Espace Personnel Étudiant Ndara Afrique.
 * ✅ WALLET UPDATE : Affichage du solde et lien vers le portefeuille.
 */

import { useState, useEffect, useMemo } from 'react';
import { useRole } from '@/context/RoleContext';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { useTheme } from 'next-themes';
import { getFirestore, collection, query, where, onSnapshot } from 'firebase/firestore';
import Link from 'next/link';
import { 
    Settings, 
    ShieldCheck, 
    Rocket, 
    Code, 
    ChevronRight, 
    UserCircle, 
    Wallet, 
    Lock, 
    LifeBuoy, 
    Languages, 
    Moon, 
    Bell, 
    LogOut,
    Check,
    Loader2,
    Trophy,
    Star,
    MapPin,
    ArrowUpRight
} from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from '@/lib/utils';
import { africanCountries } from '@/lib/countries';

export default function StudentProfilePage() {
  const { currentUser, isUserLoading, secureSignOut, user } = useRole();
  const router = useRouter();
  const locale = useLocale();
  const { theme, setTheme } = useTheme();
  const db = getFirestore();
  
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [counters, setCounters] = useState({ enrollments: 0, certificates: 0, reviews: 0 });

  useEffect(() => {
    if (!user?.uid) return;

    const unsubEnroll = onSnapshot(query(collection(db, 'enrollments'), where('studentId', '==', user.uid)), (snap) => {
        const total = snap.size;
        const certs = snap.docs.filter(d => d.data().progress === 100).length;
        setCounters(prev => ({ ...prev, enrollments: total, certificates: certs }));
    });

    const unsubReviews = onSnapshot(query(collection(db, 'course_reviews'), where('studentId', '==', user.uid)), (snap) => {
        setCounters(prev => ({ ...prev, reviews: snap.size }));
    });

    return () => { unsubEnroll(); unsubReviews(); };
  }, [user?.uid, db]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await secureSignOut();
  };

  const countryEmoji = useMemo(() => {
      if (!currentUser?.countryCode) return "🌍";
      const country = africanCountries.find(c => c.code === currentUser.countryCode);
      return country?.emoji || "🌍";
  }, [currentUser?.countryCode]);

  if (isUserLoading) {
    return (
        <div className="h-screen flex items-center justify-center bg-[#0f172a]">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
    );
  }

  if (!currentUser) return null;

  return (
    <div className="flex flex-col gap-0 pb-32 bg-[#0f172a] min-h-screen relative">
      <div className="grain-overlay" />
      
      <header className="fixed top-0 w-full max-w-md z-50 bg-[#0f172a]/95 backdrop-blur-md border-b border-white/5 safe-area-pt">
        <div className="flex items-center justify-between px-6 py-4">
            <h1 className="font-black text-xl text-white uppercase tracking-tight">Mon Profil</h1>
            <Button variant="ghost" size="icon" className="rounded-full bg-slate-900 text-slate-400" onClick={() => router.push('/account')}>
                <Settings className="h-5 w-5" />
            </Button>
        </div>
      </header>

      <main className="flex-1 px-6 pt-24 space-y-8 animate-in fade-in duration-700">
        
        {/* --- USER HEADER --- */}
        <Card className="bg-slate-900 rounded-[2.5rem] border-white/5 overflow-hidden shadow-2xl relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -mr-10 -mt-10" />
            <CardContent className="p-8 text-center flex flex-col items-center relative z-10">
                <div className="relative mb-4">
                    <div className="p-[3px] rounded-full bg-gradient-to-tr from-primary via-blue-500 to-purple-500">
                        <Avatar className="h-24 w-24 border-4 border-slate-900 shadow-2xl">
                            <AvatarImage src={currentUser.profilePictureURL} className="object-cover" />
                            <AvatarFallback className="bg-slate-800 text-3xl font-black text-slate-500 uppercase">
                                {currentUser.fullName?.charAt(0)}
                            </AvatarFallback>
                        </Avatar>
                    </div>
                    <div className="absolute bottom-1 right-1 w-6 h-6 bg-primary rounded-full border-4 border-slate-900 flex items-center justify-center shadow-lg">
                        <Check className="text-slate-950 h-3 w-3 stroke-[4px]" />
                    </div>
                </div>

                <h2 className="font-black text-2xl text-white uppercase tracking-tight leading-none mb-1">
                    {currentUser.fullName}
                </h2>
                <p className="text-primary font-bold text-sm tracking-widest mb-4">@{currentUser.username}</p>
                
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-6 shadow-inner">
                    <span className="text-lg">{countryEmoji}</span>
                    <span className="text-slate-300 text-[10px] font-black uppercase tracking-widest">
                        {currentUser.countryName || 'Explorateur Ndara'}
                    </span>
                </div>

                <div className="flex flex-wrap justify-center gap-2">
                    <Badge className="bg-primary/20 text-primary border border-primary/30 rounded-full px-3 py-1 text-[9px] font-black uppercase tracking-widest">
                        <ShieldCheck className="h-3 w-3 mr-1.5" /> Vérifié
                    </Badge>
                    <Badge className="bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-full px-3 py-1 text-[9px] font-black uppercase tracking-widest">
                        <Code className="h-3 w-3 mr-1.5" /> Apprenant
                    </Badge>
                </div>
            </CardContent>
        </Card>

        {/* --- WALLET SHORTCUT --- */}
        <Link href="/student/wallet" className="block active:scale-[0.98] transition-all">
            <div className="bg-slate-900 border border-white/5 rounded-[2rem] p-6 shadow-xl flex items-center justify-between relative overflow-hidden group">
                <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-primary" />
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-inner">
                        <Wallet size={24} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-0.5">Solde Ndara</p>
                        <p className="text-2xl font-black text-white">{(currentUser?.balance || 0).toLocaleString()} <span className="text-xs">XOF</span></p>
                    </div>
                </div>
                <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-slate-600 group-hover:text-primary transition-colors">
                    <ArrowUpRight size={20} />
                </div>
            </div>
        </Link>

        {/* --- DYNAMIC STATS --- */}
        <section className="grid grid-cols-3 gap-3">
            <StatBox label="Cours" value={counters.enrollments.toString()} color="text-primary" />
            <StatBox label="Diplômes" value={counters.certificates.toString()} color="text-orange-400" />
            <StatBox label="Avis" value={counters.reviews.toString()} color="text-blue-400" />
        </section>

        <div className="bg-slate-900 rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-white/5 bg-white/5">
                <h3 className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em]">Gestion du Compte</h3>
            </div>
            
            <div className="divide-y divide-white/5">
                <MenuLink 
                    icon={UserCircle} 
                    label="Identité & Bio" 
                    desc="Modifier votre profil" 
                    color="bg-blue-500/10 text-blue-400"
                    href="/account"
                />
                <MenuLink 
                    icon={Wallet} 
                    label="Portefeuille" 
                    desc="Gérer mes avoirs" 
                    color="bg-emerald-500/10 text-emerald-400"
                    href="/student/wallet"
                />
                <MenuLink 
                    icon={Lock} 
                    label="Sécurité" 
                    desc="Mot de passe et 2FA" 
                    color="bg-red-500/10 text-red-400"
                    href="/forgot-password"
                />
                <MenuLink 
                    icon={LifeBuoy} 
                    label="Centre d'Assistance" 
                    desc="FAQ et Support Ndara" 
                    color="bg-purple-500/10 text-purple-400"
                    href="/student/support"
                />
            </div>
        </div>

        <div className="bg-slate-900 rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-white/5 bg-white/5">
                <h3 className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em]">Préférences</h3>
            </div>
            
            <div className="p-6 space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-2xl bg-slate-800 flex items-center justify-center text-slate-400">
                            <Languages className="h-5 w-5" />
                        </div>
                        <span className="font-bold text-white text-sm uppercase tracking-tight">Langue</span>
                    </div>
                    <Select defaultValue={locale}>
                        <SelectTrigger className="w-32 h-10 bg-slate-950 border-white/10 rounded-full text-[10px] font-black uppercase tracking-widest text-primary">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 border-white/10 text-white">
                            <SelectItem value="fr" className="font-bold py-3 uppercase text-[10px]">Français</SelectItem>
                            <SelectItem value="en" className="font-bold py-3 uppercase text-[10px]">English</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-2xl bg-slate-800 flex items-center justify-center text-slate-400">
                            <Moon className="h-5 w-5" />
                        </div>
                        <span className="font-bold text-white text-sm uppercase tracking-tight">Mode Sombre</span>
                    </div>
                    <Switch 
                        checked={theme === 'dark'} 
                        onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')} 
                        className="data-[state=checked]:bg-primary"
                    />
                </div>
            </div>
        </div>

        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button className="w-full h-16 rounded-[2rem] bg-gradient-to-br from-red-500 to-red-700 hover:from-red-600 hover:to-red-800 text-white font-black uppercase text-xs tracking-[0.2em] shadow-2xl shadow-red-500/20 active:scale-[0.98] transition-all gap-2 mb-12">
                    <LogOut className="h-5 w-5" />
                    Se Déconnecter
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-slate-900 border-white/10 rounded-[2.5rem] p-8 max-w-[90%] sm:max-w-md mx-auto">
                <AlertDialogHeader className="items-center text-center space-y-4">
                    <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center text-red-500">
                        <LogOut size={40} />
                    </div>
                    <AlertDialogTitle className="text-2xl font-black text-white uppercase tracking-tight leading-none">Déconnexion ?</AlertDialogTitle>
                    <AlertDialogDescription className="text-slate-400 text-sm font-medium leading-relaxed italic">
                        "Mo ye ti sigi na yâ ti compte ti mo ?" <br/>Êtes-vous sûr de vouloir quitter votre session ?
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="mt-8 flex-col sm:flex-row gap-3">
                    <AlertDialogCancel className="bg-slate-950 border-white/10 text-white rounded-2xl h-14 font-black uppercase text-[10px] tracking-widest flex-1">Annuler</AlertDialogCancel>
                    <AlertDialogAction onClick={handleLogout} className="bg-red-600 hover:bg-red-700 text-white rounded-2xl h-14 font-black uppercase text-[10px] tracking-widest flex-1 shadow-lg shadow-red-600/20">
                        {isLoggingOut ? <Loader2 className="animate-spin" /> : "Oui, me déconnecter"}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

        <div className="pb-12 text-center">
            <p className="text-[9px] font-black text-slate-700 uppercase tracking-[0.4em]">Ndara Afrique v2.5 • Fintech Education</p>
        </div>
      </main>
    </div>
  );
}

function StatBox({ label, value, color }: { label: string, value: string, color: string }) {
    return (
        <div className="bg-slate-900 border border-white/5 rounded-[2rem] p-4 text-center shadow-xl active:scale-95 transition-transform">
            <p className={cn("text-2xl font-black leading-none mb-2", color)}>{value}</p>
            <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest">{label}</p>
        </div>
    );
}

function MenuLink({ icon: Icon, label, desc, color, href }: { icon: any, label: string, desc: string, color: string, href: string }) {
    return (
        <Link href={href} className="flex items-center justify-between p-5 hover:bg-white/5 active:scale-[0.98] transition-all group">
            <div className="flex items-center gap-4">
                <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110" , color)}>
                    <Icon className="h-6 w-6" />
                </div>
                <div>
                    <p className="font-black text-white text-sm uppercase tracking-tight leading-none mb-1 group-hover:text-primary transition-colors">{label}</p>
                    <p className="text-slate-500 text-[10px] font-medium">{desc}</p>
                </div>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-700 group-hover:text-primary group-hover:translate-x-1 transition-all" />
        </Link>
    );
}
