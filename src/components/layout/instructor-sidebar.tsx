
'use client';

/**
 * @fileOverview Barre latérale Instructeur Ndara Afrique.
 * Harmonisée avec le design Elite Qwen.
 */

import React from 'react';
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { 
  LayoutDashboard, 
  BookOpen, 
  Users, 
  MessageSquare, 
  BadgeEuro,
  ClipboardCheck,
  Folder,
  Award,
  Megaphone,
  Star,
  ArrowLeftRight,
  Shield,
  FileQuestion,
  Ticket,
  ChevronRight,
  LogOut,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useRole } from "@/context/RoleContext";
import { useLocale } from 'next-intl';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface SidebarProps {
  siteName?: string;
  logoUrl?: string;
  onLinkClick: () => void;
}

const SidebarItem = ({ href, icon: Icon, label, onClick }: { href: string, icon: React.ElementType, label: string, onClick: () => void }) => {
  const pathname = usePathname() || '';
  const cleanPath = pathname.replace(/^\/(en|fr)/, '') || '/';
  const cleanHref = href.replace(/^\/(en|fr)/, '') || '/';
  const isActive = cleanPath.startsWith(cleanHref);

  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "flex items-center justify-between px-4 py-3.5 my-0.5 cursor-pointer transition-all duration-200 rounded-2xl mx-2 group relative",
        isActive
          ? 'bg-primary/10 border-l-0'
          : 'text-slate-400 hover:bg-white/5 hover:text-white'
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
      {!isActive && (
          <ChevronRight size={14} className="text-slate-700 group-hover:text-slate-500 transition-all" />
      )}
    </Link>
  );
};

export function InstructorSidebar({ onLinkClick, siteName, logoUrl }: SidebarProps) {
  const { currentUser, switchRole, availableRoles, secureSignOut } = useRole();
  const isAdmin = availableRoles.includes('admin');
  const locale = useLocale();

  const groups = [
    {
      label: "GESTION",
      items: [
        { label: "Dashboard", icon: LayoutDashboard, href: `/${locale}/instructor/dashboard` },
        { label: "Mes formations", icon: BookOpen, href: `/${locale}/instructor/courses` },
        { label: "Ressources", icon: Folder, href: `/${locale}/instructor/ressources` },
      ]
    },
    {
      label: "PÉDAGOGIE",
      items: [
        { label: "Devoirs", icon: ClipboardCheck, href: `/${locale}/instructor/devoirs` },
        { label: "Quiz", icon: FileQuestion, href: `/${locale}/instructor/quiz` },
        { label: "Questions", icon: MessageSquare, href: `/${locale}/instructor/questions-reponses` },
        { label: "Annonces", icon: Megaphone, href: `/${locale}/instructor/annonces` },
        { label: "Avis", icon: Star, href: `/${locale}/instructor/avis` },
      ]
    },
    {
      label: "RÉSULTATS",
      items: [
        { label: "Étudiants", icon: Users, href: `/${locale}/instructor/students` },
        { label: "Finances", icon: BadgeEuro, href: `/${locale}/instructor/revenus` },
        { label: "Coupons", icon: Ticket, href: `/${locale}/instructor/coupons` },
        { label: "Diplômes", icon: Award, href: `/${locale}/instructor/certificats` },
      ]
    }
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
            <button onClick={() => onLinkClick?.()} className="md:hidden w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-slate-500">
                <X size={20} />
            </button>
        </div>

        <div className="bg-[#1e293b] rounded-[2rem] p-4 border border-white/5 shadow-xl">
            <div className="flex items-center gap-4">
                <Avatar className="h-14 w-14 border-2 border-primary/30 shadow-2xl">
                    <AvatarImage src={currentUser?.profilePictureURL} className="object-cover" />
                    <AvatarFallback className="bg-slate-800 text-slate-500 font-black uppercase">
                        {currentUser?.fullName?.charAt(0)}
                    </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                    <h3 className="font-black text-white text-sm truncate uppercase tracking-tight">{currentUser?.fullName}</h3>
                    <p className="text-slate-500 text-[10px] font-bold">@{currentUser?.username}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-xs">🇨🇫</span>
                        <span className="text-primary text-[9px] font-black uppercase tracking-widest">Expert Formateur</span>
                    </div>
                </div>
            </div>
        </div>
      </header>

      <div className="px-6 py-4 border-b border-white/5 space-y-3">
          <p className="text-slate-600 text-[9px] font-black uppercase tracking-[0.2em] ml-1">Changer de mode</p>
          <div className="grid grid-cols-2 gap-2">
              <button 
                  onClick={() => { switchRole('student'); onLinkClick?.(); }}
                  className="flex items-center justify-center gap-2 py-3 rounded-xl bg-[#1e293b] border border-white/5 text-slate-400 text-[9px] font-black uppercase tracking-widest hover:bg-primary hover:text-slate-950 transition-all active:scale-95 shadow-lg"
              >
                  <ArrowLeftRight size={12} />
                  <span>Étudiant</span>
              </button>
              {isAdmin && (
                  <button 
                      onClick={() => { switchRole('admin'); onLinkClick?.(); }}
                      className="flex items-center justify-center gap-2 py-3 rounded-xl bg-[#1e293b] border border-white/5 text-slate-400 text-[9px] font-black uppercase tracking-widest hover:bg-amber-500 hover:text-slate-950 transition-all active:scale-95 shadow-lg"
                  >
                      <Shield size={12} />
                      <span>Cockpit</span>
                  </button>
              )}
          </div>
      </div>

      <nav className="flex-1 py-4 overflow-y-auto hide-scrollbar">
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
                    onClick={() => onLinkClick?.()}
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
