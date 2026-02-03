
'use client';

/**
 * @fileOverview Profil Étudiant Android-First.
 * Priorise la simplicité et les paramètres essentiels pour mobile.
 */

import { useRole } from '@/context/RoleContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LogOut, User, Settings, ShieldCheck, Globe, Milestone } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function StudentProfileAndroid() {
  const { currentUser, secureSignOut } = useRole();
  const router = useRouter();

  if (!currentUser) return null;

  return (
    <div className="flex flex-col gap-6 p-4 pb-24">
      <header className="flex flex-col items-center py-8 gap-4">
        <div className="relative">
          <Avatar className="h-24 w-24 border-4 border-slate-800 shadow-xl">
            <AvatarImage src={currentUser.profilePictureURL} />
            <AvatarFallback className="bg-slate-800 text-3xl">{currentUser.fullName?.charAt(0)}</AvatarFallback>
          </Avatar>
          <Button size="icon" className="absolute bottom-0 right-0 h-8 w-8 rounded-full shadow-lg" variant="secondary" onClick={() => router.push('/account')}>
            <Settings className="h-4 w-4" />
          </Button>
        </div>
        <div className="text-center">
          <h1 className="text-xl font-bold text-white">{currentUser.fullName}</h1>
          <p className="text-primary text-sm font-medium">@{currentUser.username}</p>
        </div>
      </header>

      <div className="space-y-4">
        {/* --- OBJECTIFS --- */}
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Milestone className="h-4 w-4 text-primary" /> Mon parcours
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-[10px] uppercase text-slate-500 font-bold tracking-widest">Domaine visé</p>
              <p className="text-sm text-slate-200">{currentUser.careerGoals?.interestDomain || 'Non défini'}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase text-slate-500 font-bold tracking-widest">Langue</p>
              <p className="text-sm text-slate-200 flex items-center gap-2">
                <Globe className="h-3 w-3" /> {currentUser.preferredLanguage === 'fr' ? 'Français' : 'Anglais'}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* --- ACTIONS --- */}
        <div className="grid gap-2">
          <Button variant="outline" className="w-full justify-start h-14 bg-slate-900 border-slate-800 text-slate-300" onClick={() => router.push('/account')}>
            <User className="mr-3 h-5 w-5" /> Modifier mon profil
          </Button>
          <Button variant="outline" className="w-full justify-start h-14 bg-slate-900 border-slate-800 text-slate-300">
            <ShieldCheck className="mr-3 h-5 w-5" /> Sécurité & Mot de passe
          </Button>
          <Button variant="destructive" className="w-full justify-start h-14 mt-4" onClick={secureSignOut}>
            <LogOut className="mr-3 h-5 w-5" /> Se déconnecter
          </Button>
        </div>
      </div>
    </div>
  );
}
