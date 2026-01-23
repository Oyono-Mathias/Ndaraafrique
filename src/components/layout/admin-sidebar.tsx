
"use client";

import Link from "next/link";
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
  Briefcase,
  UserCheck,
  Landmark,
  BarChart3,
  MessageCircleQuestion,
  GalleryHorizontal,
  History,
  Shield,
  FileQuestion,
  Folder,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";
import { useCollection } from '@/firebase/firestore/use-collection';
import { useMemo } from 'react';
import { collection, query, where, getFirestore } from "firebase/firestore";
import { Badge } from "../ui/badge";
import { UserNav } from "./user-nav";

const SidebarItem = ({ href, icon: Icon, label, count, onClick }: { href: string, icon: React.ElementType, label: string, count?: number, onClick: () => void }) => {
  const pathname = usePathname();
  const isActive = href === '/admin' ? pathname === '/admin' : pathname.startsWith(href);


  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "flex items-center justify-between px-4 py-2.5 my-1 cursor-pointer transition-all duration-200 rounded-lg mx-3 group relative",
        isActive
          ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
          : 'text-slate-300 hover:bg-slate-800'
      )}
    >
        <div className="flex items-center">
            <Icon className={cn(
                "sidebar-icon w-5 h-5 mr-4 tv:w-7 tv:h-7",
                isActive ? 'text-primary-foreground' : 'text-slate-400 group-hover:text-primary'
            )} />
            <span className="sidebar-label font-medium text-sm tv:text-lg">{label}</span>
        </div>
        {count !== undefined && count > 0 && (
            <Badge className="bg-red-500 text-white h-5 px-2 text-xs tv:h-7 tv:px-3 tv:text-base">{count}</Badge>
        )}
        {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 bg-primary-foreground rounded-r-full"></div>}
    </Link>
  );
};


export function AdminSidebar({ siteName, logoUrl, onLinkClick }: { siteName?: string, logoUrl?: string, onLinkClick: () => void }) {
  const db = getFirestore();
  const { currentUser } = useRole();

  const adminMenu = [
    { href: "/admin", icon: LayoutDashboard, label: "Dashboard" },
    { href: "/admin/statistiques", icon: BarChart3, label: "Statistiques" },
    { href: "/admin/users", icon: Users, label: "Utilisateurs" },
    { href: "/admin/instructors", icon: UserCheck, label: "Candidatures", countId: 'pendingInstructors' },
    { href: "/admin/moderation", icon: ShieldAlert, label: "Modération", countId: 'pendingCourses' },
    { href: "/admin/courses", icon: BookOpen, label: "Cours" },
    { href: "/admin/payments", icon: CreditCard, label: "Transactions" },
    { href: "/admin/payouts", icon: Landmark, label: "Retraits", countId: 'pendingPayouts' },
    { href: "/admin/support", icon: HelpCircle, label: "Support", countId: 'openTickets' },
    { href: "/admin/logs", icon: History, label: "Journal d'Audit" },
    { href: "/admin/assistant", icon: Sparkles, label: "Assistant IA" },
    { href: "/admin/carousel", icon: GalleryHorizontal, label: "Carrousel" },
    { href: "/admin/messages", icon: MessageSquare, label: "Messagerie" },
    { href: "/admin/faq", icon: MessageCircleQuestion, label: "FAQ" },
    { href: "/admin/settings", icon: Settings, label: "Paramètres" },
    { href: "/admin/roles", icon: Shield, label: "Rôles & Permissions" },
  ];

  const pendingInstructorsQuery = useMemo(() => 
    currentUser?.role === 'admin' ? query(collection(db, 'users'), where('role', '==', 'instructor'), where('isInstructorApproved', '==', false)) : null,
    [db, currentUser]
  );
  const { data: pendingInstructors } = useCollection(pendingInstructorsQuery);

  const pendingCoursesQuery = useMemo(() =>
    currentUser?.role === 'admin' ? query(collection(db, 'courses'), where('status', '==', 'Pending Review')) : null,
    [db, currentUser]
  );
  const { data: pendingCourses } = useCollection(pendingCoursesQuery);

  const pendingPayoutsQuery = useMemo(() =>
    currentUser?.role === 'admin' ? query(collection(db, 'payouts'), where('status', '==', 'en_attente')) : null,
    [db, currentUser]
  );
  const { data: pendingPayouts } = useCollection(pendingPayoutsQuery);
  
  const openTicketsQuery = useMemo(() =>
    currentUser?.role === 'admin' ? query(collection(db, 'support_tickets'), where('status', '==', 'ouvert')) : null,
    [db, currentUser]
  );
  const { data: openTickets } = useCollection(openTicketsQuery);

  const counts = {
      pendingInstructors: pendingInstructors?.length || 0,
      pendingCourses: pendingCourses?.length || 0,
      pendingPayouts: pendingPayouts?.length || 0,
      openTickets: openTickets?.length || 0,
  };

  return (
    <div className="flex flex-col h-full bg-[#111827] border-r border-slate-700">
      <header className="p-4 border-b border-slate-700 flex items-center gap-2">
        <Image src={logoUrl || "/icon.svg"} width={32} height={32} alt={`${siteName} Logo`} className="rounded-full" />
        <span className="font-bold text-lg text-white">
          {siteName}
        </span>
      </header>
      <nav className="flex-1 py-4 overflow-y-auto">
        {adminMenu.map((item) => (
          <SidebarItem 
              key={item.href} 
              href={item.href} 
              icon={item.icon} 
              label={item.label}
              count={item.countId ? counts[item.countId as keyof typeof counts] : undefined}
              onClick={onLinkClick}
          />
        ))}
      </nav>
       <footer className="p-4 mt-auto border-t border-slate-700 space-y-2">
            <UserNav />
       </footer>
    </div>
  );
}
