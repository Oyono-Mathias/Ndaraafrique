"use client";

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
  ArrowLeftRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCollection } from '@/firebase';
import { useMemo } from 'react';
import { collection, query, where, getFirestore } from "firebase/firestore";
import { Badge } from "@/components/ui/badge";
import { UserNav } from "@/components/layout/user-nav";
import { Button } from "@/components/ui/button";

const SidebarItem = ({ href, icon: Icon, label, count, onClick }: { 
  href: string, 
  icon: React.ElementType, 
  label: string, 
  count?: number, 
  onClick: () => void 
}) => {
  const pathname = usePathname() || '';
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
                "w-5 h-5 mr-4",
                isActive ? 'text-primary-foreground' : 'text-slate-400 group-hover:text-primary'
            )} />
            <span className="font-medium text-sm">{label}</span>
        </div>
        {count !== undefined && count > 0 && (
            <Badge className="bg-red-500 text-white h-5 px-2 text-xs">{count}</Badge>
        )}
        {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 bg-primary-foreground rounded-r-full"></div>}
    </Link>
  );
};


export function AdminSidebar({ siteName = "Ndara Admin", logoUrl = "/logo.png", onLinkClick }: { siteName?: string, logoUrl?: string, onLinkClick: () => void }) {
  const db = getFirestore();
  const { currentUser, switchRole } = useRole();

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
  const { data: pendingInstructors } = useCollection<any>(pendingInstructorsQuery);

  const pendingCoursesQuery = useMemo(() =>
    currentUser?.role === 'admin' ? query(collection(db, 'courses'), where('status', '==', 'Pending Review')) : null,
    [db, currentUser]
  );
  const { data: pendingCourses } = useCollection<any>(pendingCoursesQuery);

  const pendingPayoutsQuery = useMemo(() =>
    currentUser?.role === 'admin' ? query(collection(db, 'payouts'), where('status', '==', 'en_attente')) : null,
    [db, currentUser]
  );
  const { data: pendingPayouts } = useCollection<any>(pendingPayoutsQuery);
  
  const openTicketsQuery = useMemo(() =>
    currentUser?.role === 'admin' ? query(collection(db, 'support_tickets'), where('status', '==', 'ouvert')) : null,
    [db, currentUser]
  );
  const { data: openTickets } = useCollection<any>(openTicketsQuery);

  const counts = {
      pendingInstructors: pendingInstructors?.length || 0,
      pendingCourses: pendingCourses?.length || 0,
      pendingPayouts: pendingPayouts?.length || 0,
      openTickets: openTickets?.length || 0,
  };

  return (
    <div className="flex flex-col h-full bg-[#111827] border-r border-slate-700">
      <header className="p-4 border-b border-slate-700 flex items-center gap-2">
        <Image src="/logo.png" width={32} height={32} alt="Logo" className="rounded-full" />
        <span className="font-bold text-lg text-white truncate">
          {siteName}
        </span>
      </header>
      <nav className="flex-1 py-4 overflow-y-auto custom-scrollbar">
        {adminMenu.map((item) => (
          <SidebarItem 
              key={item.href} 
              href={item.href} 
              icon={item.icon} 
              label={item.label}
              count={item.countId ? (counts as any)[item.countId] : undefined}
              onClick={onLinkClick}
          />
        ))}
      </nav>
       <footer className="p-4 mt-auto border-t border-slate-700 space-y-2">
            <UserNav />
            <div className="grid grid-cols-2 gap-2">
                <Button 
                    variant="outline" 
                    size="sm" 
                    className="bg-slate-800 border-slate-700 hover:bg-slate-700 text-xs font-bold gap-1.5"
                    onClick={() => switchRole('student')}
                >
                    <ArrowLeftRight className="h-3.5 w-3.5 text-primary" />
                    Étudiant
                </Button>
                <Button 
                    variant="outline" 
                    size="sm" 
                    className="bg-slate-800 border-slate-700 hover:bg-slate-700 text-xs font-bold gap-1.5"
                    onClick={() => switchRole('instructor')}
                >
                    <ArrowLeftRight className="h-3.5 w-3.5 text-primary" />
                    Formateur
                </Button>
            </div>
       </footer>
    </div>
  );
}
