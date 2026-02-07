'use client';

/**
 * @fileOverview Profil Étudiant Android-First.
 * Priorise la simplicité, les statistiques et les paramètres de sécurité.
 */

import { useRole } from '@/context/RoleContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LogOut, User, Settings, ShieldCheck, Globe, Milestone, KeyRound, CheckCircle2, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { getAuth, sendPasswordResetEmail } from 'firebase/auth';
import { cn } from '@/lib/utils';

export default function StudentProfileAndroid() {
  const { currentUser, secureSignOut } = useRole();
  const router = useRouter();
  const { toast } = useToast();

  if (!currentUser) return null;

  const handlePasswordReset = async () => {
    const auth = getAuth();
    if (!currentUser.email) return;
    
    try {
        await sendPasswordResetEmail(auth, currentUser.email);
        toast({ 
            title: "Email envoyé !", 
            description: "Consultez votre boîte mail pour réinitialiser votre mot de passe." 
        });
    } catch (error) {
        toast({ 
            variant: 'destructive', 
            title: "Erreur", 
            description: "Impossible d'envoyer l'email de réinitialisation." 
        });
    }
  };

  return (
    <div className="flex flex-col gap-8 pb-24 bg-slate-950 min-h-screen bg-grainy">
      
      {/* --- HEADER PROFIL --- */}
      <header className="flex flex-col items-center pt-12 px-4 gap-4 animate-in fade-in slide-in-from-top-4 duration-700">
        <div className="relative">
          <div className="absolute -inset-1 bg-gradient-to-tr from-primary to-blue-400 rounded-full blur opacity-20" />
          <Avatar className="h-32 w-32 border-4 border-slate-900 shadow-2xl relative">
            <AvatarImage src={currentUser.profilePictureURL} className="object-cover" />
            <AvatarFallback className="bg-slate-800 text-4xl font-black text-slate-500 uppercase">
                {currentUser.fullName?.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <Button 
            size="icon" 
            className="absolute bottom-1 right-1 h-9 w-9 rounded-full shadow-xl bg-primary hover:bg-primary/90 border-2 border-slate-950" 
            onClick={() => router.push('/account')}
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-black text-white uppercase tracking-tight">{currentUser.fullName}</h1>
          <div className="flex items-center justify-center gap-2">
            <span className="text-primary text-xs font-black uppercase tracking-widest">@{currentUser.username}</span>
            <span className="h-1 w-1 rounded-full bg-slate-700" />
            <span className="text-slate-500 text-xs font-bold uppercase">{currentUser.countryName || 'Ndara Member'}</span>
          </div>
        </div>
      </header>

      <div className="px-4 space-y-6">
        
        {/* --- STATUTS & BADGES --- */}
        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
            <Badge className="bg-primary/10 text-primary border-none text-[9px] font-black uppercase tracking-widest py-1.5 px-3 shrink-0">
                <CheckCircle2 className="h-3 w-3 mr-1.5" /> Compte Vérifié
            </Badge>
            <Badge className="bg-slate-900 text-slate-400 border border-slate-800 text-[9px] font-black uppercase tracking-widest py-1.5 px-3 shrink-0">
                Membre depuis {new Date(currentUser.createdAt as any)?.getFullYear() || 2024}
            </Badge>
        </div>

        {/* --- INFOS PARCOURS --- */}
        <Card className="bg-slate-900/50 border-slate-800 rounded-3xl overflow-hidden shadow-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 flex items-center gap-2">
              <Milestone className="h-4 w-4" /> Mon parcours
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-slate-950/50 rounded-2xl border border-white/5">
              <p className="text-[9px] uppercase text-slate-600 font-black tracking-widest mb-1">Domaine d'intérêt</p>
              <p className="text-sm font-bold text-slate-200">{currentUser.careerGoals?.interestDomain || 'Non défini'}</p>
            </div>
            <div className="p-4 bg-slate-950/50 rounded-2xl border border-white/5 flex justify-between items-center">
              <div>
                <p className="text-[9px] uppercase text-slate-600 font-black tracking-widest mb-1">Langue préférée</p>
                <p className="text-sm font-bold text-slate-200 flex items-center gap-2">
                    <Globe className="h-3.5 w-3.5 text-primary" /> 
                    {currentUser.preferredLanguage === 'fr' ? 'Français' : 'English'}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-800" />
            </div>
          </CardContent>
        </Card>

        {/* --- ACTIONS SÉCURITÉ --- */}
        <section className="space-y-3">
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 ml-2">Sécurité & Compte</h3>
            <div className="grid gap-2">
                <Button 
                    variant="outline" 
                    className="w-full justify-start h-16 bg-slate-900 border-slate-800 rounded-2xl text-slate-300 hover:bg-slate-800 group"
                    onClick={handlePasswordReset}
                >
                    <div className="p-2.5 bg-slate-800 group-hover:bg-primary/10 rounded-xl mr-4 transition-colors">
                        <KeyRound className="h-5 w-5 text-slate-500 group-hover:text-primary" />
                    </div>
                    <div className="text-left">
                        <p className="text-sm font-bold">Changer mon mot de passe</p>
                        <p className="text-[10px] text-slate-500 uppercase font-medium tracking-tighter">Recevoir un lien par email</p>
                    </div>
                </Button>

                <Button 
                    variant="destructive" 
                    className="w-full justify-start h-16 rounded-2xl mt-4 shadow-xl active:scale-95 transition-all" 
                    onClick={secureSignOut}
                >
                    <div className="p-2.5 bg-white/10 rounded-xl mr-4">
                        <LogOut className="h-5 w-5" />
                    </div>
                    <span className="font-bold text-sm uppercase tracking-widest">Se déconnecter</span>
                </Button>
            </div>
        </section>

        <div className="py-8 text-center">
            <p className="text-[9px] font-black text-slate-700 uppercase tracking-[0.4em]">Ndara Afrique v1.0</p>
        </div>
      </div>
    </div>
  );
}
