"use client";

/**
 * @fileOverview Barre latérale Étudiant Ndara Afrique - Design Qwen Elite.
 * ✅ NAVIGATION : Inclusion de la Bourse du Savoir.
 */

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRole } from "@/context/RoleContext";
import { 
  LayoutDashboard, 
  BookOpen, 
  Trophy, 
  Award, 
  Users, 
  MessageSquare, 
  Bot, 
  Heart, 
  ClipboardCheck, 
  BadgeEuro, 
  ChevronRight, 
  Shield, 
  ArrowLeftRight, 
  LogOut, 
  X, 
  Search,
  Bell,
  LifeBuoy,
  UserCircle,
  TrendingUp
} from "lucide-react";
import { cn } from "@/lib/utils";
import { collection, query, where, onSnapshot, getFirestore } from "firebase/firestore";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useLocale } from 'next-intl';
import type { CourseProgress } from "@/lib/types";

interface SidebarItemProps {
  href: string;
  icon: React.ElementType;
  label: string;
  count?: number;
  badge?: string;
  onClick: () => void;
  highlight?: boolean;
}

const SidebarItem = ({ href, icon: Icon, label, count, badge, onClick, highlight }: SidebarItemProps) => {
  const pathname = usePathname() || '';
  const cleanPath = pathname.replace(/^\/(en|fr)/, '') || '/';
  const cleanHref = href.replace(/^\/(en|fr)/, '') || '/';
  
  const isActive = cleanPath === cleanHref || (cleanHref !== '/student/dashboard' && cleanPath.startsWith(cleanHref));

  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "flex items-center justify-between px-4 py-3.5 my-0.5 cursor-pointer transition-all duration-200 rounded-2xl mx-2 group relative",
        isActive
          ? 'bg-primary/10 border-l-0'
          : 'text-slate-400 hover:bg-white/5 hover:text-white',
        highlight && !isActive && "text-primary"
      )}
    >
      <div className="flex items-center">
        <div className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center transition-colors",
            isActive ? "bg-primary text-slate-950" : "bg-white/5 text-slate-500 group-hover:text-primary"
        )}>
            <Icon size={18} />
        </div>
        <span className={cn(
            "ml-4 text-[13px] font-bold uppercase tracking-tight",
            isActive ? "text-white" : "text-slate-400 group-hover:text-slate-200"
        )}>
            {label}
        </span>
      </div>
      
      <div className="flex items-center gap-2">
        {badge && (
            <Badge className="bg-primary/20 text-primary border-none text-[8px] font-black uppercase px-2 py-0.5">{badge}</Badge>
        )}
        {count !== undefined && count > 0 && (
            <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center shadow-lg shadow-red-500/20 animate-pulse">
                <span className="text-white text-[9px] font-black">{count}</span>
            </div>
        )}
        {!count && !isActive && (
            <ChevronRight size={14} className="text-slate-700 group-hover:text-slate-500 transition-all" />
        )}
      </div>
    </Link>
  );
};

export function StudentSidebar({ onLinkClick, siteName, logoUrl }: { onLinkClick: () => void, siteName?: string, logoUrl?: string }) {
  const { currentUser, switchRole, availableRoles, secureSignOut, user } = useRole();
  const isAdmin = availableRoles.includes('admin');
  const isInstructor = availableRoles.includes('instructor');
  const locale = useLocale();
  const db = getFirestore();
  
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadNotifs, setUnreadNotifs] = useState(0);
  const [globalProgress, setGlobalProgress] = useState(0);

  useEffect(() => {
    if (!user?.uid) return;

    const unsubChats = onSnapshot(query(collection(db, 'chats'), where('unreadBy', 'array-contains', user.uid)), (snap) => setUnreadMessages(snap.size));
    const unsubNotifs = onSnapshot(query(collection(db, `users/${user.uid}/notifications`), where('read', '==', false)), (snap) => setUnreadNotifs(snap.size));
    const unsubProgress = onSnapshot(query(collection(db, 'course_progress'), where('userId', '==', user.uid)), (snap) => {
        const docs = snap.docs.map(d => d.data() as CourseProgress);
        const total = docs.reduce((acc, curr) => acc + (curr.progressPercent || 0), 0);
        setGlobalProgress(docs.length > 0 ? Math.round(total / docs.length) : 0);
    });

    return () => { unsubChats(); unsubNotifs(); unsubProgress(); };
  }, [user?.uid, db]);

  const groups = [
    {
      label: "VOTRE UNIVERS",
      items: [
        { href: `/${locale}/student/dashboard`, icon: LayoutDashboard, label: "Tableau de Bord" },
        { href: `/${locale}/search`, icon: Search, label: "Catalogue" },
        { href: `/${locale}/bourse`, icon: TrendingUp, label: "Bourse du Savoir", badge: "HOT" },
        { href: `/${locale}/student/courses`, icon: BookOpen, label: 'Mes Cours' },
        { href: `/${locale}/student/tutor`, icon: Bot, label: 'Mathias IA', badge: 'IA' },
      ],
    },
    {
      label: "RÉSEAU",
      items: [
        { href: `/${locale}/student/ambassadeur`, icon: BadgeEuro, label: "Ambassadeur", highlight: true },
        { href: `/${locale}/student/annuaire`, icon: Users, label: 'Communauté' },
        { href: `/${locale}/student/messages`, icon: MessageSquare, label: 'Messages', count: unreadMessages },
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
    {
        label: "PARAMÈTRES",
        items: [
          { href: `/${locale}/student/profile`, icon: UserCircle, label: 'Mon Profil' },
          { href: `/${locale}/student/notifications`, icon: Bell, label: 'Notifications', count: unreadNotifs },
          { href: `/${locale}/student/support`, icon: LifeBuoy, label: 'Centre d\'Aide' },
        ],
      },
  ];

  return (
    <aside className="w-full h-full bg-[#0f172a] border-r border-white/5 flex flex-col shadow-2xl relative overflow-hidden font-sans">
        <div className="grain-overlay opacity-[0.03]" />

        <header className="px-6 py-8 border-b border-white/5">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-primary to-teal-600 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-lg shadow-primary/20">
                        N
                    </div>
                    <div>
                        <h2 className="font-black text-lg text-white tracking-tighter uppercase leading-none">{siteName || 'NDARA'}</h2>
                        <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mt-1">Afrique</p>
                    </div>
                </div>
                <button onClick={onLinkClick} className="md:hidden w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-slate-500">
                    <X size={20} />
                </button>
            </div>

            <div className="bg-[#1e293b] rounded-[2rem] p-4 border border-white/5 shadow-xl">
                <div className="flex items-center gap-4 mb-4">
                    <div className="relative flex-shrink-0">
                        <Avatar className="h-14 w-14 border-2 border-primary/30 shadow-2xl">
                            <AvatarImage src={currentUser?.profilePictureURL} className="object-cover" />
                            <AvatarFallback className="bg-slate-800 text-slate-500 font-black uppercase">
                                {currentUser?.fullName?.charAt(0)}
                            </AvatarFallback>
                        </Avatar>
                        {currentUser?.isOnline && (
                            <div className="absolute bottom-0 right-0 w-4 h-4 bg-primary rounded-full border-2 border-[#1e293b] shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="font-black text-white text-sm truncate uppercase tracking-tight">{currentUser?.fullName}</h3>
                        <div className="flex items-center gap-1.5 mt-1">
                            <span className="text-xs">{currentUser?.countryCode === 'CF' ? '🇨🇫' : '🌍'}</span>
                            <span className="text-primary text-[9px] font-black uppercase tracking-widest">Étudiant</span>
                        </div>
                    </div>
                </div>

                <div className="bg-[#0f172a] rounded-2xl p-3 border border-white/5">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-slate-500 text-[8px] font-black uppercase tracking-wider">Savoir Cumulé</span>
                        <span className="text-primary text-[10px] font-black">{globalProgress}%</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                        <div className="bg-gradient-to-r from-primary to-teal-400 h-full rounded-full shadow-[0_0_10px_rgba(16,185,129,0.4)] transition-all duration-1000" style={{ width: `${globalProgress}%` }} />
                    </div>
                </div>
            </div>
        </header>

        <div className="px-6 py-4 border-b border-white/5 space-y-3">
            <p className="text-slate-600 text-[9px] font-black uppercase tracking-[0.2em] ml-1">Changer de mode</p>
            <div className="grid grid-cols-2 gap-2">
                {isInstructor && (
                    <button 
                        onClick={() => { switchRole('instructor'); onLinkClick(); }}
                        className="flex items-center justify-center gap-2 py-3 rounded-xl bg-[#1e293b] border border-white/5 text-slate-400 text-[9px] font-black uppercase tracking-widest hover:bg-primary hover:text-slate-950 transition-all active:scale-95 shadow-lg"
                    >
                        <ArrowLeftRight size={12} />
                        <span>Formateur</span>
                    </button>
                )}
                {isAdmin && (
                    <button 
                        onClick={() => { switchRole('admin'); onLinkClick(); }}
                        className="flex items-center justify-center gap-2 py-3 rounded-xl bg-[#1e293b] border border-white/5 text-slate-400 text-[9px] font-black uppercase tracking-widest hover:bg-amber-500 hover:text-slate-950 transition-all active:scale-95 shadow-lg"
                    >
                        <Shield size={12} />
                        <span>Cockpit</span>
                    </button>
                )}
            </div>
        </div>

        <nav className="flex-1 overflow-y-auto hide-scrollbar py-4">
            {groups.map((group) => (
                <div key={group.label} className="mb-6">
                    <p className="px-8 text-[9px] font-black text-slate-600 uppercase tracking-[0.3em] mb-3">{group.label}</p>
                    <div className="space-y-0.5">
                        {group.items.map((item) => (
                            <SidebarItem 
                                key={item.href}
                                href={item.href}
                                icon={item.icon}
                                label={item.label}
                                count={(item as any).count}
                                badge={(item as any).badge}
                                highlight={(item as any).highlight}
                                onClick={onLinkClick}
                            />
                        ))}
                    </div>
                </div>
            ))}
        </nav>

        <footer className="px-6 py-6 border-t border-white/5 bg-black/20">
            <button 
                onClick={() => secureSignOut()}
                className="w-full h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center gap-3 text-red-500 font-black uppercase text-[10px] tracking-widest hover:bg-red-500 hover:text-white transition-all active:scale-95 shadow-xl"
            >
                <LogOut size={16} />
                <span>Se Déconnecter</span>
            </button>
        </footer>
    </aside>
  );
}
