"use client";

/**
 * @fileOverview Barre latérale Étudiant Ndara Afrique.
 * ✅ CEO FEATURE : Ajout de l'Espace Ambassadeur.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { useRole } from "@/context/RoleContext";
import { Button } from "@/components/ui/button";
import {
  Award,
  Bot,
  ClipboardCheck,
  MessageSquare,
  Users,
  User,
  Heart,
  Search,
  Briefcase,
  Bell,
  Lock,
  LayoutDashboard,
  Trophy,
  CreditCard,
  ArrowLeftRight,
  Shield,
  MessageCircle,
  BookOpen,
  BadgeEuro,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { collection, query, where, onSnapshot, getFirestore, doc } from "firebase/firestore";
import React, { useEffect, useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { OnboardingGuide } from "@/components/onboarding-guide";
import { UserNav } from "@/components/layout/user-nav";
import { useToast } from "@/hooks/use-toast";
import type { CourseProgress } from "@/lib/types";


const SidebarItem = ({ href, icon: Icon, label, unreadCount, onClick, id, disabled, highlight }: { href: string, icon: React.ElementType, label: string, unreadCount?: number, onClick: () => void, id?: string, disabled?: boolean, highlight?: boolean }) => {
  const pathname = usePathname() || '';
  const { toast } = useToast();
  const isActive = (href === '/student/dashboard' && pathname.includes('/dashboard')) || (href !== '/student/dashboard' && pathname.startsWith(href));
  
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
      className={cn(
        "flex items-center justify-between px-4 py-2.5 my-1 cursor-pointer transition-all duration-200 rounded-lg mx-3 group relative",
        isActive
          ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
          : 'text-slate-300 hover:bg-slate-800',
        disabled && "opacity-50 cursor-not-allowed hover:bg-transparent",
        highlight && !isActive && "text-primary bg-primary/5"
      )}
    >
      <div className="flex items-center">
        <Icon className={cn(
          "w-5 h-5 mr-4 text-slate-500 group-hover:text-primary transition-colors duration-300",
          isActive && "text-primary-foreground",
          highlight && !isActive && "text-primary",
          disabled && "text-slate-600 group-hover:text-slate-600"
        )} />
        <span className={cn("font-medium text-sm", highlight && !isActive && "font-black")}>{label}</span>
      </div>
      {unreadCount !== undefined && unreadCount > 0 && (
        <Badge className="bg-red-500 text-white h-5 px-1.5 text-xs">{unreadCount}</Badge>
      )}
       {disabled && <Lock className="h-3 w-3 text-slate-500"/>}
       {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 bg-primary-foreground rounded-r-full"></div>}
    </Link>
  );
};


export function StudentSidebar({ onLinkClick }: { onLinkClick: () => void }) {
  const { switchRole, availableRoles, user, currentUser } = useRole();
  const isInstructor = availableRoles.includes('instructor');
  const isAdmin = availableRoles.includes('admin');
  
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadNotifs, setUnreadNotifs] = useState(0);
  const [globalProgress, setGlobalProgress] = useState(0);
  const db = getFirestore();
  const [showInstructorSignup, setShowInstructorSignup] = useState(true);
  
  const isProfileComplete = currentUser?.isProfileComplete || false;
  
  const profileProgress = useMemo(() => {
      let progress = 0;
      if (currentUser?.username) progress += 50;
      if (currentUser?.careerGoals?.interestDomain) progress += 50;
      return progress;
  }, [currentUser]);

  const studentMenu = [
    {
      label: "Personnel",
      items: [
        { href: "/student/dashboard", icon: LayoutDashboard, label: "Tableau de Bord", id: 'sidebar-nav-dashboard' },
        { href: "/search", icon: Search, label: "Catalogue", id: 'sidebar-nav-search' },
        { href: "/student/courses", icon: BookOpen, label: 'Mes Formations', id: 'sidebar-nav-mes-formations' },
        { href: "/student/tutor", icon: Bot, label: 'Tuteur MATHIAS', id: 'sidebar-nav-tutor' },
      ],
    },
    {
      label: "Croissance",
      items: [
        { href: "/student/ambassadeur", icon: BadgeEuro, label: "Gagner des XOF", id: 'sidebar-nav-ambassador', highlight: true },
        { href: "/student/annuaire", icon: Users, label: 'Annuaire', id: 'sidebar-nav-annuaire', disabled: !isProfileComplete },
        { href: "/student/messages", icon: MessageSquare, label: 'Messagerie', id: 'sidebar-nav-messages', disabled: !isProfileComplete, count: unreadMessages },
      ]
    },
    {
      label: "Suivi",
      items: [
        { href: "/student/results", icon: Trophy, label: 'Mes Résultats', id: 'sidebar-nav-results' },
        { href: "/student/mes-certificats", icon: Award, label: 'Mes Certificats', id: 'sidebar-nav-mes-certificats' },
        { href: "/student/devoirs", icon: ClipboardCheck, label: 'Mes Devoirs', id: 'sidebar-nav-devoirs' },
        { href: "/student/liste-de-souhaits", icon: Heart, label: 'Favoris', id: 'sidebar-nav-wishlist' },
      ],
    },
    {
      label: "Compte",
      items: [
        { href: "/account", icon: User, label: 'Mon Profil', id: 'sidebar-nav-account' },
        { href: "/student/paiements", icon: CreditCard, label: 'Finances', id: 'sidebar-nav-paiements' },
        { href: "/student/notifications", icon: Bell, label: 'Alertes', id: 'sidebar-nav-notifications', count: unreadNotifs },
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

    const progressQuery = query(collection(db, 'course_progress'), where('userId', '==', user.uid));
    const unsubProgress = onSnapshot(progressQuery, (snapshot) => {
        const progressDocs = snapshot.docs.map(d => d.data() as CourseProgress);
        const total = progressDocs.reduce((acc, curr) => acc + (curr.progressPercent || 0), 0);
        const avg = progressDocs.length > 0 ? Math.round(total / progressDocs.length) : 0;
        setGlobalProgress(avg);
    });

    return () => {
      unsubChats();
      unsubNotifs();
      unsubProgress();
    };
  }, [user, db]);

  const handleSwitchRole = (newRole: 'instructor' | 'admin') => {
    switchRole(newRole);
    onLinkClick?.();
  };

  return (
    <>
      <OnboardingGuide />
      <div className="w-full h-full bg-[#111827] border-r border-white/10 flex flex-col shadow-sm">
        <header className="p-4 border-b border-white/10">
          <Link href="/student/dashboard" className="flex items-center gap-2" onClick={onLinkClick}>
              <Image src="/logo.png" width={32} height={32} alt="Ndara Afrique Logo" className="rounded-full" />
              <span className="font-bold text-lg text-white tracking-tighter uppercase">Ndara <span className="text-primary">Afrique</span></span>
          </Link>
        </header>
        
        {!isProfileComplete && (
            <div className="p-4 space-y-2 border-b border-slate-800">
                <Link href="/account" className="block text-center" onClick={onLinkClick}>
                    <p className="text-sm font-semibold text-white leading-none">Complète ton profil</p>
                    <Progress value={profileProgress} className="h-1.5 mt-2" />
                    <p className="text-[10px] text-slate-500 mt-1 italic">Active l'annuaire & le chat !</p>
                </Link>
            </div>
        )}

        <nav className="flex-1 py-2 overflow-y-auto custom-scrollbar">
          {studentMenu.map((group) => (
            <div key={group.label} className="py-2">
              <p className="px-4 text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2">{group.label}</p>
              {group.items.map((item: any) => (
                <SidebarItem
                  key={item.href}
                  href={item.href}
                  icon={item.icon}
                  label={item.label}
                  id={item.id}
                  unreadCount={item.count}
                  disabled={item.disabled}
                  highlight={item.highlight}
                  onClick={onLinkClick}
                />
              ))}
            </div>
          ))}
        </nav>

        <div className="p-4 border-t border-white/10">
            <div className="bg-slate-800/40 rounded-xl p-4 border border-slate-700/50">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Savoir cumulé</span>
                    <span className="text-xs font-bold text-primary">{globalProgress}%</span>
                </div>
                <Progress value={globalProgress} className="h-1.5 bg-slate-700" indicatorClassName="bg-primary shadow-[0_0_10px_hsl(var(--primary))]" />
            </div>
        </div>

        <footer className="p-4 mt-auto border-t border-white/10 space-y-2">
           <UserNav />
          
          <div className="space-y-2">
            {isAdmin && (
                <Button variant="secondary" className="w-full justify-center gap-2 font-black uppercase text-[10px] tracking-widest h-11 rounded-xl" onClick={() => handleSwitchRole('admin')}>
                    <Shield className="h-4 w-4" />
                    Cockpit Admin
                </Button>
            )}
            
            {isInstructor ? (
                <Button variant="outline" className="w-full justify-center bg-slate-800 border-slate-700 hover:bg-slate-700 text-white gap-2 font-black uppercase text-[10px] tracking-widest h-11 rounded-xl" onClick={() => handleSwitchRole('instructor')}>
                    <ArrowLeftRight className="h-4 w-4 text-primary" />
                    Mode Formateur
                </Button>
            ) : showInstructorSignup && (
                <Button variant="outline" className="w-full justify-center bg-slate-800 border-slate-700 hover:bg-slate-700 text-white h-11 rounded-xl font-black uppercase text-[10px] tracking-widest" asChild onClick={onLinkClick}>
                    <Link href="/devenir-instructeur">
                        <Briefcase className="mr-2 h-4 w-4 text-primary" />
                        Devenir Formateur
                    </Link>
                </Button>
            )}
          </div>
        </footer>
      </div>
    </>
  );
}
