
"use client";

/**
 * @fileOverview Barre latérale Étudiant Ndara Afrique - Version Audit Final.
 * ✅ DESIGN : Style "Android System Settings" épuré.
 * ✅ NAVIGATION : Groupements logiques et indicateurs de progression intégrés.
 */

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
  Bell,
  Lock,
  LayoutDashboard,
  Trophy,
  CreditCard,
  ArrowLeftRight,
  Shield,
  BookOpen,
  BadgeEuro,
  Briefcase,
  ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { collection, query, where, onSnapshot, getFirestore, doc } from "firebase/firestore";
import React, { useEffect, useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { UserNav } from "@/components/layout/user-nav";
import { useToast } from "@/hooks/use-toast";
import type { CourseProgress } from "@/lib/types";
import { useLocale } from 'next-intl';

const SidebarItem = ({ href, icon: Icon, label, unreadCount, onClick, id, disabled, highlight }: { href: string, icon: React.ElementType, label: string, unreadCount?: number, onClick: () => void, id?: string, disabled?: boolean, highlight?: boolean }) => {
  const pathname = usePathname() || '';
  const { toast } = useToast();
  const locale = useLocale();
  
  const cleanPath = pathname.replace(/^\/(en|fr)/, '') || '/';
  const cleanHref = href.replace(/^\/(en|fr)/, '') || '/';
  
  const isActive = (cleanHref === '/student/dashboard' && cleanPath.includes('/dashboard')) || (cleanHref !== '/student/dashboard' && cleanPath.startsWith(cleanHref));
  
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
        "flex items-center justify-between px-4 py-3 my-0.5 cursor-pointer transition-all duration-200 rounded-2xl mx-2 group relative",
        isActive
          ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
          : 'text-slate-400 hover:bg-white/5 hover:text-white',
        disabled && "opacity-40 cursor-not-allowed grayscale",
        highlight && !isActive && "text-primary bg-primary/5 border border-primary/10"
      )}
    >
      <div className="flex items-center">
        <Icon className={cn(
          "w-5 h-5 mr-3 transition-colors duration-300",
          isActive ? "text-primary-foreground" : "text-slate-500 group-hover:text-primary",
          highlight && !isActive && "text-primary"
        )} />
        <span className={cn("text-[13px] uppercase tracking-wider font-bold", highlight && !isActive && "font-black")}>{label}</span>
      </div>
      
      {unreadCount !== undefined && unreadCount > 0 ? (
        <Badge className="bg-primary text-slate-950 h-5 px-1.5 text-[10px] font-black border-none unread-badge">{unreadCount}</Badge>
      ) : (
          !disabled && !isActive && <ChevronRight className="h-3 w-3 text-slate-700 group-hover:text-slate-500 transition-all" />
      )}
      
      {disabled && <Lock className="h-3 w-3 text-slate-700"/>}
    </Link>
  );
};

export function StudentSidebar({ onLinkClick }: { onLinkClick: () => void }) {
  const { switchRole, availableRoles, user, currentUser } = useRole();
  const isAdmin = availableRoles.includes('admin');
  const isInstructor = availableRoles.includes('instructor');
  const locale = useLocale();
  const db = getFirestore();
  
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadNotifs, setUnreadNotifs] = useState(0);
  const [globalProgress, setGlobalProgress] = useState(0);
  const [allowInstructorSignup, setAllowInstructorSignup] = useState(true);
  
  const isProfileComplete = currentUser?.isProfileComplete || false;

  const menuGroups = [
    {
      label: "VOTRE UNIVERS",
      items: [
        { href: `/${locale}/student/dashboard`, icon: LayoutDashboard, label: "Tableau de Bord", id: 'sidebar-nav-dashboard' },
        { href: `/${locale}/search`, icon: Search, label: "Catalogue", id: 'sidebar-nav-search' },
        { href: `/${locale}/student/courses`, icon: BookOpen, label: 'Mes Cours', id: 'sidebar-nav-mes-formations' },
        { href: `/${locale}/student/tutor`, icon: Bot, label: 'Tuteur MATHIAS', id: 'sidebar-nav-tutor' },
      ],
    },
    {
      label: "CROISSANCE & RÉSEAU",
      items: [
        { href: `/${locale}/student/ambassadeur`, icon: BadgeEuro, label: "Gagner de l'argent", highlight: true },
        { href: `/${locale}/student/annuaire`, icon: Users, label: 'Communauté', disabled: !isProfileComplete },
        { href: `/${locale}/student/messages`, icon: MessageSquare, label: 'Messages', disabled: !isProfileComplete, count: unreadMessages },
      ]
    },
    {
      label: "SUIVI",
      items: [
        { href: `/${locale}/student/results`, icon: Trophy, label: 'Mes Résultats' },
        { href: `/${locale}/student/mes-certificats`, icon: Award, label: 'Mes Certificats' },
        { href: `/${locale}/student/devoirs`, icon: ClipboardCheck, label: 'Mes Devoirs' },
        { href: `/${locale}/student/wishlist`, icon: Heart, label: 'Favoris' },
      ],
    },
  ];

  useEffect(() => {
    if (!user?.uid) return;

    const unsubChats = onSnapshot(query(collection(db, 'chats'), where('unreadBy', 'array-contains', user.uid)), (snap) => setUnreadMessages(snap.size));
    const unsubNotifs = onSnapshot(query(collection(db, `users/${user.uid}/notifications`), where('read', '==', false)), (snap) => setUnreadNotifs(snap.size));
    const unsubProgress = onSnapshot(query(collection(db, 'course_progress'), where('userId', '==', user.uid)), (snap) => {
        const docs = snap.docs.map(d => d.data() as CourseProgress);
        const total = docs.reduce((acc, curr) => acc + (curr.progressPercent || 0), 0);
        setGlobalProgress(docs.length > 0 ? Math.round(total / docs.length) : 0);
    });
    const unsubSettings = onSnapshot(doc(db, 'settings', 'global'), (snap) => {
        if (snap.exists()) setAllowInstructorSignup(snap.data().platform?.allowInstructorSignup ?? true);
    });

    return () => { unsubChats(); unsubNotifs(); unsubProgress(); unsubSettings(); };
  }, [user, db]);

  return (
    <div className="w-full h-full bg-[#0f172a] border-r border-white/5 flex flex-col shadow-2xl relative overflow-hidden">
        <header className="p-6 border-b border-white/5">
          <Link href={`/${locale}/student/dashboard`} className="flex items-center gap-3 group" onClick={onLinkClick}>
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-primary to-teal-600 flex items-center justify-center text-white font-black text-xl shadow-lg group-active:scale-90 transition-transform">
                  N
              </div>
              <span className="font-black text-xl text-white tracking-tighter uppercase">NDARA</span>
          </Link>
        </header>
        
        <nav className="flex-1 py-4 overflow-y-auto hide-scrollbar">
          {menuGroups.map((group) => (
            <div key={group.label} className="mb-6">
              <p className="px-6 text-[10px] font-black text-slate-600 uppercase tracking-[0.3em] mb-3">{group.label}</p>
              <div className="space-y-0.5">
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
            </div>
          ))}
        </nav>

        <div className="p-4 mt-auto space-y-4">
            {/* Global Progress Card */}
            <div className="bg-slate-900/50 border border-white/5 rounded-3xl p-5 shadow-inner">
                <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Savoir cumulé</span>
                    <span className="text-xs font-black text-primary">{globalProgress}%</span>
                </div>
                <Progress value={globalProgress} className="h-1.5 bg-slate-800" indicatorClassName="bg-primary shadow-[0_0_10px_hsl(var(--primary))]" />
            </div>

            <UserNav />
          
            <div className="grid gap-2">
                {isAdmin && (
                    <button onClick={() => switchRole('admin')} className="w-full h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 hover:bg-amber-500/20 transition-all active:scale-95">
                        <Shield size={14} /> Cockpit Admin
                    </button>
                )}
                
                {isInstructor ? (
                    <button onClick={() => switchRole('instructor')} className="w-full h-12 rounded-2xl bg-primary/10 border border-primary/20 text-primary font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 hover:bg-primary/20 transition-all active:scale-95">
                        <ArrowLeftRight size={14} /> Mode Formateur
                    </button>
                ) : allowInstructorSignup && (
                    <Link href={`/${locale}/devenir-instructeur`} className="w-full h-12 rounded-2xl bg-white/5 border border-white/10 text-white font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 hover:bg-white/10 transition-all active:scale-95">
                        <Briefcase size={14} /> Devenir Formateur
                    </Link>
                )}
            </div>
        </div>
    </div>
  );
}
