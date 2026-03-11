"use client";

/**
 * @fileOverview Barre latérale Administrateur Ndara Afrique v2.0.
 * Architecture restructurée pour inclure Marketing, Gamification et Monitoring.
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
  Share2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCollection } from '@/firebase';
import { useMemo } from 'react';
import { collection, query, where, getFirestore } from "firebase/firestore";
import { Badge } from "@/components/ui/badge";
import { UserNav } from "@/components/layout/user-nav";
import { Button } from "@/components/ui/button";
import { useLocale } from 'next-intl';

const SidebarItem = ({ href, icon: Icon, label, count, onClick }: { 
  href: string, 
  icon: React.ElementType, 
  label: string, 
  count?: number, 
  onClick: () => void 
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
        "flex items-center justify-between px-4 py-2.5 my-0.5 cursor-pointer transition-all duration-200 rounded-lg mx-3 group relative",
        isActive
          ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
          : 'text-slate-300 hover:bg-slate-800'
      )}
    >
        <div className="flex items-center">
            <Icon className={cn(
                "w-4.5 h-4.5 mr-3.5",
                isActive ? 'text-primary-foreground' : 'text-slate-500 group-hover:text-primary'
            )} />
            <span className="font-medium text-sm leading-tight">{label}</span>
        </div>
        {count !== undefined && count > 0 && (
            <Badge className="bg-red-500 text-white h-5 px-1.5 text-[10px] font-black border-none">{count}</Badge>
        )}
        {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 bg-primary-foreground rounded-r-full"></div>}
    </Link>
  );
};


export function AdminSidebar({ siteName = "Ndara Afrique", logoUrl = "/logo.png", onLinkClick }: { siteName?: string, logoUrl?: string, onLinkClick: () => void }) {
  const db = getFirestore();
  const locale = useLocale();
  const { currentUser, switchRole, availableRoles } = useRole();
  const isInstructor = availableRoles.includes('instructor');

  const groups = [
    {
      label: "Pilotage",
      items: [
        { href: `/${locale}/admin`, icon: LayoutDashboard, label: "Dashboard" },
        { href: `/${locale}/admin/statistiques`, icon: BarChart3, label: "Statistiques" },
        { href: `/${locale}/admin/monitoring`, icon: Activity, label: "Monitoring" },
        { href: `/${locale}/admin/test-recommendations`, icon: Zap, label: "Moteur Ndara IA" },
        { href: `/${locale}/admin/assistant`, icon: Sparkles, label: "Assistant IA" },
      ]
    },
    {
      label: "Membres",
      items: [
        { href: `/${locale}/admin/users`, icon: Users, label: "Utilisateurs" },
        { href: `/${locale}/admin/roles`, icon: Shield, label: "Rôles & Permissions" },
        { href: `/${locale}/admin/messages`, icon: MessageSquare, label: "Messagerie Centrale" },
        { href: `/${locale}/admin/affiliates`, icon: Share2, label: "Ambassadeurs" },
      ]
    },
    {
      label: "PÉDAGOGIE",
      items: [
        { href: `/${locale}/admin/courses`, icon: BookOpen, label: "Catalogue Cours" },
        { href: `/${locale}/admin/moderation`, icon: ShieldAlert, label: "Modération", countId: 'pendingCourses' },
        { href: `/${locale}/admin/instructors`, icon: UserCheck, label: "Candidatures", countId: 'pendingInstructors' },
        { href: `/${locale}/admin/templates`, icon: BookOpen, label: "Modèles d'images" },
        { href: `/${locale}/admin/faq`, icon: MessageCircleQuestion, label: "FAQ / Savoir" },
      ]
    },
    {
      label: "Marketing & Growth",
      items: [
        { href: `/${locale}/admin/marketing`, icon: Target, label: "Campagnes" },
        { href: `/${locale}/admin/emails`, icon: Mail, label: "Emails" },
        { href: `/${locale}/admin/gamification`, icon: Trophy, label: "Gamification" },
      ]
    },
    {
      label: "Finances",
      items: [
        { href: `/${locale}/admin/payments`, icon: CreditCard, label: "Transactions" },
        { href: `/${locale}/admin/payouts`, icon: Landmark, label: "Retraits", countId: 'pendingPayouts' },
      ]
    },
    {
      label: "Système",
      items: [
        { href: `/${locale}/admin/support`, icon: HelpCircle, label: "Support", countId: 'openTickets' },
        { href: `/${locale}/admin/carousel`, icon: GalleryHorizontal, label: "Carrousel Accueil" },
        { href: `/${locale}/admin/seo`, icon: Globe, label: "Gestion SEO" },
        { href: `/${locale}/admin/settings`, icon: Settings, label: "Configuration" },
        { href: `/${locale}/admin/logs`, icon: History, label: "Logs d'Audit" },
      ]
    }
  ];

  const { data: pendingInstructors } = useCollection<any>(
    useMemo(() => currentUser?.role === 'admin' ? query(collection(db, 'users'), where('role', '==', 'instructor'), where('isInstructorApproved', '==', false)) : null, [db, currentUser])
  );

  const { data: pendingCourses } = useCollection<any>(
    useMemo(() => currentUser?.role === 'admin' ? query(collection(db, 'courses'), where('status', '==', 'Pending Review')) : null, [db, currentUser])
  );

  const { data: pendingPayouts } = useCollection<any>(
    useMemo(() => currentUser?.role === 'admin' ? query(collection(db, 'payouts'), where('status', '==', 'en_attente')) : null, [db, currentUser])
  );
  
  const { data: openTickets } = useCollection<any>(
    useMemo(() => currentUser?.role === 'admin' ? query(collection(db, 'support_tickets'), where('status', '==', 'ouvert')) : null, [db, currentUser])
  );

  const counts = {
      pendingInstructors: pendingInstructors?.length || 0,
      pendingCourses: pendingCourses?.length || 0,
      pendingPayouts: pendingPayouts?.length || 0,
      openTickets: openTickets?.length || 0,
  };

  const handleSwitch = (newRole: 'student' | 'instructor') => {
    switchRole(newRole);
    onLinkClick();
  };

  return (
    <div className="flex flex-col h-full bg-[#111827] border-r border-slate-700">
      <header className="p-4 border-b border-slate-700 flex items-center gap-2 shrink-0">
        <Image src="/logo.png" width={32} height={32} alt="Logo" className="rounded-full shadow-lg" />
        <span className="font-black text-lg text-white tracking-tighter uppercase">
          {siteName.split(' ')[0]} <span className="text-primary">{siteName.split(' ')[1]}</span>
        </span>
      </header>
      
      <nav className="flex-1 py-4 overflow-y-auto custom-scrollbar">
        {groups.map((group, idx) => (
          <div key={group.label} className={cn("mb-6", idx === groups.length - 1 && "mb-2")}>
            <p className="px-7 text-[10px] font-black text-slate-500 uppercase tracking-[0.25em] mb-3">
                {group.label}
            </p>
            <div className="space-y-0.5">
                {group.items.map((item) => (
                <SidebarItem 
                    key={item.href} 
                    href={item.href} 
                    icon={item.icon} 
                    label={item.label}
                    count={(counts as any)[(item as any).countId]}
                    onClick={onLinkClick}
                />
                ))}
            </div>
          </div>
        ))}
      </nav>

       <footer className="p-4 mt-auto border-t border-slate-700 space-y-3 bg-slate-900/50">
            <UserNav />
            <div className="grid grid-cols-2 gap-2">
                <Button 
                    variant="outline" 
                    size="sm" 
                    className="bg-slate-800 border-slate-700 hover:bg-slate-700 text-[10px] font-black uppercase tracking-widest gap-1.5 h-9"
                    onClick={() => handleSwitch('student')}
                >
                    <ArrowLeftRight className="h-3 w-3 text-primary" />
                    Étudiant
                </Button>
                {isInstructor && (
                  <Button 
                      variant="outline" 
                      size="sm" 
                      className="bg-slate-800 border-slate-700 hover:bg-slate-700 text-[10px] font-black uppercase tracking-widest gap-1.5 h-9"
                      onClick={() => handleSwitch('instructor')}
                  >
                      <ArrowLeftRight className="h-3 w-3 text-primary" />
                      Formateur
                  </Button>
                )}
            </div>
       </footer>
    </div>
  );
}
