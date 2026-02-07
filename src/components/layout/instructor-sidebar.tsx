'use client';

import React from 'react';
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { 
  LayoutDashboard, 
  BookOpen, 
  Users, 
  MessageSquare, 
  Settings,
  PlusCircle,
  BadgeEuro,
  ClipboardCheck,
  Folder,
  Award,
  Megaphone,
  Star,
  UserCircle,
  X,
  ArrowLeftRight,
  Shield,
  FileQuestion
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useRole } from "@/context/RoleContext";
import { UserNav } from "@/components/layout/user-nav";

interface SidebarProps {
  siteName?: string;
  logoUrl?: string;
  onLinkClick?: () => void;
}

const SidebarItem = ({ href, icon: Icon, label, onClick }: { href: string, icon: React.ElementType, label: string, onClick: () => void }) => {
  const pathname = usePathname() || '';
  const isActive = pathname.replace(/^\/(en|fr)/, '').startsWith(href);

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
          "w-5 h-5 mr-4 transition-colors duration-300",
          isActive ? 'text-primary-foreground' : 'text-slate-500 group-hover:text-primary'
        )} />
        <span className="font-medium text-sm leading-tight">{label}</span>
      </div>
      {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 bg-primary-foreground rounded-r-full"></div>}
    </Link>
  );
};

export function InstructorSidebar({ 
  siteName = "Ndara Afrique", 
  logoUrl = "/logo.png", 
  onLinkClick 
}: SidebarProps) {
  const { currentUser, switchRole, availableRoles } = useRole();
  const isAdmin = availableRoles.includes('admin');

  const groups = [
    {
      items: [
        { label: "Dashboard", icon: LayoutDashboard, href: "/instructor/dashboard" },
        { label: "Mes cours", icon: BookOpen, href: "/instructor/courses" },
        { label: "Ressources", icon: Folder, href: "/instructor/ressources" },
      ]
    },
    {
      label: "PÉDAGOGIE",
      items: [
        { label: "Devoirs", icon: ClipboardCheck, href: "/instructor/devoirs" },
        { label: "Quiz", icon: FileQuestion, href: "/instructor/quiz" },
        { label: "Questions", icon: MessageSquare, href: "/instructor/questions-reponses" },
        { label: "Annonces", icon: Megaphone, href: "/instructor/annonces" },
        { label: "Avis", icon: Star, href: "/instructor/avis" },
      ]
    },
    {
      label: "PERFORMANCE",
      items: [
        { label: "Étudiants", icon: Users, href: "/instructor/students" },
        { label: "Revenus", icon: BadgeEuro, href: "/instructor/revenus" },
        { label: "Certificats", icon: Award, href: "/instructor/certificats" },
      ]
    }
  ];

  return (
    <div className="w-full h-full bg-[#111827] border-r border-white/10 flex flex-col shadow-sm">
      <header className="p-4 border-b border-white/10 flex items-center gap-2">
        <Image src="/logo.png" width={28} height={28} alt="Ndara Afrique Logo" className="rounded-full" />
        <span className="font-bold text-lg text-white truncate">
          {siteName}
        </span>
      </header>

      <nav className="flex-1 py-2 overflow-y-auto custom-scrollbar">
        {groups.map((group, gIdx) => (
          <div key={gIdx} className="py-2">
            {group.label && (
                <p className="px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    {group.label}
                </p>
            )}
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
        ))}
      </nav>

      <footer className="p-4 border-t border-white/10 space-y-2">
          <UserNav />
          
          <div className="space-y-2">
            {isAdmin && (
                <Button variant="secondary" className="w-full justify-center gap-2 font-bold" onClick={() => switchRole('admin')}>
                    <Shield className="h-4 w-4" />
                    Mode Administrateur
                </Button>
            )}

            <Button 
                variant="outline" 
                className="w-full justify-center bg-slate-800 border-slate-700 hover:bg-slate-700 text-white gap-2 font-bold"
                onClick={() => switchRole('student')}
            >
                <ArrowLeftRight className="h-4 w-4 text-primary" />
                Mode Étudiant
            </Button>
          </div>
      </footer>
    </div>
  );
}
