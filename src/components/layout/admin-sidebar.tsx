'use client';

/**
 * @fileOverview Barre latérale Administrateur Ndara Afrique.
 * Harmonisée avec le design Elite Qwen.
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from "next/image";
import { useRole } from "@/context/RoleContext";
import {
  LayoutDashboard,
  Users,
  BookOpen,
  CreditCard,
  MessageSquare,
  HelpCircle,
  Settings,
  ShieldAlert,
  Sparkles,
  UserCheck,
  Landmark,
  BarChart3,
  MessageCircleQuestion,
  GalleryHorizontal,
  History,
  Shield,
  Zap,
  ArrowLeftRight,
  Activity,
  Target,
  Mail,
  Trophy,
  Globe,
  Share2,
  X,
  LogOut,
  ChevronRight,
  Rocket
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useMemo, useState, useEffect } from 'react';
import { collection, query, where, getFirestore, onSnapshot } from "firebase/firestore";
import { Badge } from "@/components/ui/badge";
import { useLocale } from 'next-intl';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface AdminSidebarProps {
  siteName?: string;
  logoUrl?: string;
  onLinkClick: () => void;
}

interface NavItem {
  href: string;
  icon: React.ElementType;
  label: string;
  badge?: string;
  countId?: string;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const SidebarItem = ({ href, icon: Icon, label, count, onClick, badge }: { 
  href: string, 
  icon: React.ElementType, 
  label: string, 
  count?: number, 
  onClick: () => void,
  badge?: string
}) => {
  const pathname = usePathname() || '';
  const cleanPath = pathname.replace(/^\/(en|fr)/, '') || '/';
  const cleanHref = href.replace(/^\/(en|fr)/, '') || '/';
  const isActive = cleanPath === cleanHref || (cleanHref !== '/admin' && cleanPath.startsWith(cleanHref));

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


export function AdminSidebar({ onLinkClick, siteName, logoUrl }: AdminSidebarProps) {
  const db = getFirestore();
  const locale = useLocale();
  const { currentUser, switchRole, availableRoles, secureSignOut } = useRole();
  const isInstructor = availableRoles.includes('instructor');

  const [counts, setCounts] = useState({
      pendingInstructors: 0,
      pendingCourses: 0,
      pendingPayouts: 0,
      openTickets: 0,
  });

  useEffect(() => {
    if (currentUser?.role !== 'admin') return;

    const unsubInstructors = onSnapshot(query(collection(db, 'users'), where('role', '==', 'instructor'), where('isInstructorApproved', '==', false)), (snap) => setCounts(prev => ({ ...prev, pendingInstructors: snap.size })));
    const unsubCourses = onSnapshot(query(collection(db, 'courses'), where('status', '==', 'Pending Review')), (snap) => setCounts(prev => ({ ...prev, pendingCourses: snap.size })));
    const unsubPayouts = onSnapshot(query(collection(db, 'payout_requests'), where('status', '==', 'pending')), (snap) => setCounts(prev => ({ ...prev, pendingPayouts: snap.size })));
    const unsubTickets = onSnapshot(query(collection(db, 'support_tickets'), where('status', '==', 'ouvert')), (snap) => setCounts(prev => ({ ...prev, openTickets: snap.size })));

    return () => { unsubInstructors(); unsubCourses(); unsubPayouts(); unsubTickets(); };
  }, [db, currentUser]);

  const groups: NavGroup[] = [
    {
      label: "COCKPIT",
      items: [
        { href: `/${locale}/admin`, icon: LayoutDashboard, label: "Dashboard" },
        { href: `/${locale}/admin/statistiques`, icon: BarChart3, label: "Statistiques" },
        { href: `/${locale}/admin/monitoring`, icon: Activity, label: "Monitoring" },
        { href: `/${locale}/admin/assistant`, icon: Sparkles, label: "Mathias Admin", badge: 'IA' },
      ]
    },
    {
      label: "MARKETING",
      items: [
        { href: `/${locale}/admin/ads-factory`, icon: Rocket, label: "Ads Factory", badge: "NEW" },
        { href: `/${locale}/admin/carousel`, icon: GalleryHorizontal, label: "Carrousel" },
        { href: `/${locale}/admin/faq`, icon: MessageCircleQuestion, label: "FAQ" },
      ]
    },
    {
      label: "OPÉRATIONS",
      items: [
        { href: `/${locale}/admin/users`, icon: Users, label: "Utilisateurs" },
        { href: `/${locale}/admin/moderation`, icon: ShieldAlert, label: "Modération", countId: 'pendingCourses' },
        { href: `/${locale}/admin/instructors`, icon: UserCheck, label: "Candidatures", countId: 'pendingInstructors' },
        { href: `/${locale}/admin/support`, icon: HelpCircle, label: "Support", countId: 'openTickets' },
      ]
    },
    {
      label: "FINANCES",
      items: [
        { href: `/${locale}/admin/payments`, icon: CreditCard, label: "Transactions" },
        { href: `/${locale}/admin/payouts`, icon: Landmark, label: "Retraits", countId: 'pendingPayouts' },
      ]
    },
    {
      label: "CONFIGURATION",
      items: [
        { href: `/${locale}/admin/settings`, icon: Settings, label: "Paramètres" },
        { href: `/${locale}/admin/roles`, icon: Shield, label: "Rôles" },
        { href: `/${locale}/admin/logs`, icon: History, label: "Audit Logs" },
      ]
    }
  ];

  return (
    <aside className="w-full h-full bg-[#0f172a] border-r border-white/5 flex flex-col shadow-2xl relative overflow-hidden font-sans">
      <div className="grain-overlay opacity-[0.03]" />

      <header className="px-6 py-8 border-b border-white/5">
        <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-lg shadow-amber-500/20">
                    N
                </div>
                <div>
                    <h2 className="font-black text-lg text-white tracking-tighter uppercase leading-none">{siteName || 'ADMIN'}</h2>
                    <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mt-1">Ndara Afrique</p>
                </div>
            </div>
            <button onClick={() => onLinkClick()} className="md:hidden w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-slate-500">
                <X size={20} />
            </button>
        </div>

        <div className="bg-[#1e293b] rounded-[2rem] p-4 border border-white/5 shadow-xl">
            <div className="flex items-center gap-4">
                <Avatar className="h-14 w-14 border-2 border-amber-500/30 shadow-2xl">
                    <AvatarImage src={currentUser?.profilePictureURL} className="object-cover" />
                    <AvatarFallback className="bg-slate-800 text-slate-500 font-black uppercase">
                        {currentUser?.fullName?.charAt(0)}
                    </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                    <h3 className="font-black text-white text-sm truncate uppercase tracking-tight">{currentUser?.fullName}</h3>
                    <div className="flex items-center gap-1.5 mt-1">
                        <Shield className="h-3 w-3 text-amber-500" />
                        <span className="text-amber-500 text-[9px] font-black uppercase tracking-widest">Super Admin</span>
                    </div>
                </div>
            </div>
        </div>
      </header>

      <div className="px-6 py-4 border-b border-white/5 space-y-3">
          <p className="text-slate-600 text-[9px] font-black uppercase tracking-[0.2em] ml-1">Navigation Rôles</p>
          <div className="grid grid-cols-2 gap-2">
              <button 
                  onClick={() => { switchRole('student'); onLinkClick(); }}
                  className="flex items-center justify-center gap-2 py-3 rounded-xl bg-[#1e293b] border border-white/5 text-slate-400 text-[9px] font-black uppercase tracking-widest hover:bg-primary hover:text-slate-950 transition-all active:scale-95 shadow-lg"
              >
                  <ArrowLeftRight size={12} />
                  <span>Étudiant</span>
              </button>
              {isInstructor && (
                  <button 
                      onClick={() => { switchRole('instructor'); onLinkClick(); }}
                      className="flex items-center justify-center gap-2 py-3 rounded-xl bg-[#1e293b] border border-white/5 text-slate-400 text-[9px] font-black uppercase tracking-widest hover:bg-primary hover:text-slate-950 transition-all active:scale-95 shadow-lg"
                  >
                      <ArrowLeftRight size={12} />
                      <span>Formateur</span>
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
                    badge={item.badge}
                    count={item.countId ? (counts as any)[item.countId] : undefined}
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
