
'use client';

/**
 * @fileOverview Barre latérale Administrateur Elite - Design Qwen.
 * ✅ I18N : Intégration complète des traductions Admin (FR/EN/SG).
 */

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRole } from "@/context/RoleContext";
import { useLocale, useTranslations } from 'next-intl';
import { getFirestore, collection, query, where, onSnapshot } from "firebase/firestore";
import { 
  LayoutDashboard, 
  Users, 
  BookOpen, 
  Wallet, 
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
  Activity, 
  LogOut, 
  X,
  ClipboardList,
  CreditCard,
  Radio,
  Globe
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

interface AdminSidebarProps {
  onLinkClick: () => void;
  siteName?: string;
  logoUrl?: string;
}

const SidebarItem = ({ href, icon: Icon, label, count, onClick }: { 
  href: string, 
  icon: React.ElementType, 
  label: string, 
  count?: number, 
  onClick: () => void 
}) => {
  const pathname = usePathname() || '';
  const cleanPath = pathname.replace(/^\/(en|fr|sg)/, '') || '/';
  const cleanHref = href.replace(/^\/(en|fr|sg)/, '') || '/';
  const isActive = cleanPath === cleanHref || (cleanHref !== '/admin' && cleanPath.startsWith(cleanHref));

  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "flex items-center justify-between px-4 py-3 rounded-2xl mx-2 my-0.5 transition-all duration-200 group",
        isActive
          ? 'bg-primary/10 text-primary shadow-lg shadow-primary/5'
          : 'text-slate-400 hover:bg-white/5 hover:text-white'
      )}
    >
        <div className="flex items-center gap-3">
            <Icon size={20} className={cn(
                "transition-transform group-hover:scale-110",
                isActive ? "text-primary" : "text-slate-500 group-hover:text-primary"
            )} />
            <span className={cn(
                "text-[13px] font-bold tracking-tight",
                isActive ? "text-white" : "text-slate-400"
            )}>
                {label}
            </span>
        </div>
        {count !== undefined && count > 0 && (
            <Badge className="bg-red-500 text-white border-none text-[9px] font-black h-5 px-1.5 min-w-[20px] justify-center">{count}</Badge>
        )}
    </Link>
  );
};

export function AdminSidebar({ onLinkClick, siteName, logoUrl }: AdminSidebarProps) {
  const db = getFirestore();
  const locale = useLocale();
  const t = useTranslations('Admin');
  const { currentUser, secureSignOut } = useRole();

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

  const menuGroups = [
    {
      label: t('groups.cockpit'),
      items: [
        { href: `/${locale}/admin`, icon: LayoutDashboard, label: "Tableau de Bord" },
        { href: `/${locale}/admin/statistiques`, icon: BarChart3, label: "Analytics" },
        { href: `/${locale}/admin/monitoring`, icon: Activity, label: "IA & Monitoring" },
      ]
    },
    {
      label: t('groups.operations'),
      items: [
        { href: `/${locale}/admin/users`, icon: Users, label: "Membres" },
        { href: `/${locale}/admin/courses`, icon: BookOpen, label: "Catalogue" },
        { href: `/${locale}/admin/moderation`, icon: ClipboardList, label: "Modération", count: counts.pendingCourses },
        { href: `/${locale}/admin/notifications`, icon: Radio, label: "Diffusion Push" },
        { href: `/${locale}/admin/countries`, icon: Globe, label: "Pays & Devises" },
      ]
    },
    {
      label: t('groups.finances'),
      items: [
        { href: `/${locale}/admin/payouts`, icon: Wallet, label: "Trésorerie", count: counts.pendingPayouts },
        { href: `/${locale}/admin/payments`, icon: CreditCard, label: "Transactions" },
        { href: `/${locale}/admin/marketing`, icon: Sparkles, label: "Growth Hub" },
      ]
    },
    {
      label: t('groups.support'),
      items: [
        { href: `/${locale}/admin/support`, icon: HelpCircle, label: "Centre d'Aide", count: counts.openTickets },
        { href: `/${locale}/admin/messages`, icon: MessageSquare, label: "Modération Messagerie" },
        { href: `/${locale}/admin/faq`, icon: MessageCircleQuestion, label: "FAQ & Base" },
      ]
    },
    {
      label: t('groups.interface'),
      items: [
        { href: `/${locale}/admin/carousel`, icon: GalleryHorizontal, label: "Carrousel Accueil" },
        { href: `/${locale}/admin/templates`, icon: GalleryHorizontal, label: "Bibliothèque Visuels" },
        { href: `/${locale}/admin/seo`, icon: Globe, label: "SEO & Social" },
      ]
    },
    {
      label: t('groups.security'),
      items: [
        { href: `/${locale}/admin/settings`, icon: Settings, label: "Réglages Globaux" },
        { href: `/${locale}/admin/roles`, icon: Shield, label: "Rôles & Accès" },
        { href: `/${locale}/admin/logs`, icon: History, label: "Journal d'Audit" },
      ]
    }
  ];

  return (
    <aside className="w-full h-full bg-slate-900 border-r border-white/5 flex flex-col relative overflow-hidden font-sans">
      <div className="grain-overlay opacity-[0.03]" />

      <header className="p-6 border-b border-white/5 space-y-6">
        <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-teal-600 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-primary/20">N</div>
            <h2 className="font-black text-xl text-white uppercase tracking-tight">{siteName || 'Ndara Admin'}</h2>
        </div>

        <div className="bg-slate-800/50 backdrop-blur-md rounded-3xl p-4 flex items-center gap-3 border border-white/5 shadow-xl">
            <div className="relative shrink-0">
                <Avatar className="h-12 w-12 border-2 border-primary shadow-2xl">
                    <AvatarImage src={currentUser?.profilePictureURL} />
                    <AvatarFallback className="bg-slate-800 text-slate-500 font-black uppercase">
                        {currentUser?.fullName?.charAt(0)}
                    </AvatarFallback>
                </Avatar>
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-primary rounded-full border-2 border-slate-900"></div>
            </div>
            <div className="flex-1 min-w-0">
                <p className="font-black text-white text-sm truncate leading-tight uppercase">{currentUser?.fullName}</p>
                <p className="text-slate-500 text-[9px] font-black uppercase tracking-widest mt-1">{t('labels.super_admin')}</p>
            </div>
        </div>
      </header>

      <nav className="flex-1 py-6 overflow-y-auto hide-scrollbar">
        {menuGroups.map((group) => (
          <div key={group.label} className="mb-8">
            <p className="px-8 text-[10px] font-black text-slate-600 uppercase tracking-[0.3em] mb-4">{group.label}</p>
            <div className="space-y-1">
                {group.items.map((item) => (
                <SidebarItem 
                    key={item.href} 
                    href={item.href} 
                    icon={item.icon} 
                    label={item.label}
                    count={(item as any).count}
                    onClick={onLinkClick}
                />
                ))}
            </div>
          </div>
        ))}
      </nav>

      <footer className="p-6 border-t border-white/5">
          <button 
              onClick={() => secureSignOut()}
              className="w-full h-12 rounded-2xl bg-white/5 hover:bg-red-500/10 text-slate-400 hover:text-red-500 font-black uppercase text-[10px] tracking-widest transition-all active:scale-95 flex items-center justify-center gap-3"
          >
              <LogOut size={16} />
              {t('labels.exit')}
          </button>
      </footer>
    </aside>
  );
}
