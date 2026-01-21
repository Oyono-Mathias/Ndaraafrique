
'use client';

import { Link, usePathname, useRouter } from "next-intl/navigation";
import Image from "next/image";
import { useRole } from "@/context/RoleContext";
import { Button } from "@/components/ui/button";
import {
  Book,
  Award,
  Bot,
  ClipboardCheck,
  MessageSquare,
  Users,
  User,
  Heart,
  LogIn,
  Shield,
  Star,
  Search,
  Play,
  Briefcase,
  Bell,
  Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { collection, query, where, onSnapshot, getFirestore, getDoc, doc } from "firebase/firestore";
import React, { useEffect, useState, useMemo } from "react";
import { Badge } from "../ui/badge";
import { Progress } from "../ui/progress";
import { OnboardingGuide } from "../onboarding-guide";
import { UserNav } from "./user-nav";
import { useToast } from "@/hooks/use-toast";


const SidebarItem = ({ href, icon: Icon, label, unreadCount, onClick, id, disabled }: { href: string, icon: React.ElementType, label: string, unreadCount?: number, onClick: () => void, id?: string, disabled?: boolean }) => {
  const pathname = usePathname();
  const { toast } = useToast();
  const isActive = (href === '/dashboard' && pathname === href) || (href !== '/dashboard' && pathname.startsWith(href));
  
  const handleClick = (e: React.MouseEvent) => {
    if (disabled) {
        e.preventDefault();
        toast({
            variant: "destructive",
            title: "Profil incomplet",
            description: "Veuillez compléter votre profil pour accéder à cette fonctionnalité.",
        });
    } else {
      onClick();
    }
  };

  return (
    <Link
      href={href}
      onClick={handleClick}
      id={id}
      aria-disabled={disabled}
      className={cn(
        "flex items-center justify-between px-4 py-2.5 my-1 cursor-pointer transition-all duration-200 rounded-lg mx-3 group relative",
        isActive
          ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
          : 'text-slate-300 hover:bg-slate-800',
        disabled && "opacity-50 cursor-not-allowed hover:bg-transparent"
      )}
    >
      <div className="flex items-center">
        <Icon className={cn(
          "w-5 h-5 mr-4 text-slate-500 group-hover:text-primary transition-colors duration-300",
          isActive && "text-primary-foreground",
          disabled && "text-slate-600 group-hover:text-slate-600"
        )} />
        <span className="font-medium text-sm">{label}</span>
      </div>
      {unreadCount !== undefined && unreadCount > 0 && (
        <Badge className="bg-red-500 text-white h-5 px-1.5 text-xs">{unreadCount}</Badge>
      )}
       {disabled && <Lock className="h-3 w-3 text-slate-500"/>}
       {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 bg-primary-foreground rounded-r-full"></div>}
    </Link>
  );
};


export function StudentSidebar({ siteName, logoUrl, onLinkClick }: { siteName?: string, logoUrl?: string, onLinkClick: () => void }) {
  const router = useRouter();
  const { switchRole, availableRoles, user, currentUser } = useRole();
  const isInstructor = availableRoles.includes('instructor');
  const isAdmin = availableRoles.includes('admin');
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadNotifs, setUnreadNotifs] = useState(0);
  const db = getFirestore();
  const [showInstructorSignup, setShowInstructorSignup] = useState(true);
  const isProfileComplete = currentUser?.isProfileComplete || false;

  const studentMenu = [
    {
      label: "Personnel",
      items: [
        { href: "/dashboard", icon: Star, label: "Pour vous", id: 'sidebar-nav-dashboard' },
        { href: "/search", icon: Search, label: "Rechercher", id: 'sidebar-nav-search' },
        { href: "/mes-formations", icon: Play, label: 'Mes Cours', id: 'sidebar-nav-mes-formations' },
        { href: "/tutor", icon: Bot, label: 'Tuteur MATHIAS', id: 'sidebar-nav-tutor' },
      ],
    },
    {
      label: "Suivi",
      items: [
        { href: "/mes-certificats", icon: Award, label: 'Mes Certificats', id: 'sidebar-nav-mes-certificats' },
        { href: "/liste-de-souhaits", icon: Heart, label: 'Liste de souhaits', id: 'sidebar-nav-liste-de-souhaits' },
        { href: "/mes-devoirs", icon: ClipboardCheck, label: 'Mes Devoirs', id: 'sidebar-nav-mes-devoirs' },
      ],
    },
    {
      label: "Communauté",
      items: [
        { href: "/annuaire", icon: Users, label: 'Annuaire', id: 'sidebar-nav-annuaire', disabled: !isProfileComplete },
        { href: "/messages", icon: MessageSquare, label: 'Messagerie', id: 'sidebar-nav-messages', disabled: !isProfileComplete, count: unreadMessages },
      ]
    },
    {
      label: "Compte",
      items: [
        { href: "/account", icon: User, label: 'Mon Compte', id: 'sidebar-nav-account' },
        { href: "/notifications", icon: Bell, label: 'Notifications', id: 'sidebar-nav-notifications', count: unreadNotifs },
      ],
    },
  ];

  useEffect(() => {
    const settingsRef = doc(db, 'settings', 'global');
    const unsubscribe = onSnapshot(settingsRef, (docSnap) => {
        if (docSnap.exists()) {
            setShowInstructorSignup(docSnap.data().platform?.allowInstructorSignup ?? true);
        }
    });
    return () => unsubscribe();
  }, [db]);


  useEffect(() => {
    if (!user?.uid) return;

    const chatsQuery = query(collection(db, 'chats'), where('unreadBy', 'array-contains', user.uid));
    const unsubChats = onSnapshot(chatsQuery, (snapshot) => {
        setUnreadMessages(snapshot.size);
    });

    const notifsQuery = query(collection(db, `users/${user.uid}/notifications`), where('read', '==', false));
    const unsubNotifs = onSnapshot(notifsQuery, (snapshot) => {
        setUnreadNotifs(snapshot.size);
    });

    return () => {
      unsubChats();
      unsubNotifs();
    };
  }, [user, db]);
  
  const handleSwitchToAdmin = () => {
    switchRole('admin');
    router.push('/admin');
  }
  
  const profileProgress = useMemo(() => {
      let progress = 0;
      if (currentUser?.username) progress += 50;
      if (currentUser?.careerGoals?.interestDomain) progress += 50;
      return progress;
  }, [currentUser]);

  return (
    <>
      <OnboardingGuide />
      <div className="w-full h-full bg-[#111827] border-r border-white/10 flex flex-col shadow-sm">
        <header className="p-4 border-b border-white/10">
          <Link href="/dashboard" className="flex items-center gap-2">
              <Image src={logoUrl || "/icon.svg"} width={32} height={32} alt="Ndara Afrique Logo" className="rounded-full" />
              <span className="font-bold text-lg text-white">Ndara Afrique</span>
          </Link>
        </header>
        
        {!isProfileComplete && (
            <div className="p-4 space-y-2 border-b border-slate-800">
                <Link href="/account" className="block text-center">
                    <p className="text-sm font-semibold text-white">Complète ton profil</p>
                    <Progress value={profileProgress} className="h-1.5 mt-2" />
                    <p className="text-xs text-slate-400 mt-1">Débloque la messagerie et l'annuaire !</p>
                </Link>
            </div>
        )}

        <nav className="flex-1 py-2 overflow-y-auto">
          {studentMenu.map((group) => (
            <div key={group.label} className="py-2">
              <p className="px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">{group.label}</p>
              {group.items.map((item: any) => (
                <SidebarItem
                  key={item.href}
                  href={item.href}
                  icon={item.icon}
                  label={item.label}
                  id={item.id}
                  unreadCount={item.count}
                  disabled={item.disabled}
                  onClick={onLinkClick}
                />
              ))}
            </div>
          ))}
        </nav>

        <footer className="p-4 mt-auto border-t border-white/10 space-y-2">
           <UserNav />
          {isInstructor ? (
              <Button variant="outline" className="w-full justify-center bg-slate-800 border-slate-700 hover:bg-slate-700 text-white" onClick={() => switchRole('instructor')}>
                  <LogIn className="mr-2 h-4 w-4" />
                  Passer en mode Instructeur
              </Button>
          ) : showInstructorSignup && (
              <Button variant="outline" className="w-full justify-center bg-slate-800 border-slate-700 hover:bg-slate-700 text-white" asChild>
                  <Link href="/devenir-instructeur">
                      <Briefcase className="mr-2 h-4 w-4" />
                      Devenir Formateur
                  </Link>
              </Button>
          )}
          {isAdmin && (
              <Button variant="secondary" className="w-full justify-center" onClick={handleSwitchToAdmin}>
                  <Shield className="mr-2 h-4 w-4" />
                  Mode Admin
              </Button>
          )}
        </footer>
      </div>
    </>
  );
}
