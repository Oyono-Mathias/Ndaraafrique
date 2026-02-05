'use client';

import React from 'react';
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  BookOpen, 
  Users, 
  MessageSquare, 
  Settings,
  PlusCircle,
  BadgeEuro,
  ClipboardCheck,
  FileQuestion,
  Folder,
  Award,
  Megaphone,
  Star,
  UserCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useRole } from "@/context/RoleContext";

interface SidebarProps {
  siteName?: string;
  logoUrl?: string;
  onLinkClick?: () => void;
}

export function InstructorSidebar({ 
  siteName = "Ndara Afrique", 
  logoUrl = "/logo.png", 
  onLinkClick 
}: SidebarProps) {
  const pathname = usePathname();
  const { currentUser } = useRole();

  const groups = [
    {
      label: "Gestion",
      items: [
        { label: "Dashboard", icon: LayoutDashboard, href: "/instructor/dashboard" },
        { label: "Mes cours", icon: BookOpen, href: "/instructor/courses" },
        { label: "Quiz", icon: FileQuestion, href: "/instructor/quiz" },
        { label: "Ressources", icon: Folder, href: "/instructor/ressources" },
      ]
    },
    {
      label: "Pédagogie",
      items: [
        { label: "Devoirs", icon: ClipboardCheck, href: "/instructor/devoirs" },
        { label: "Questions", icon: MessageSquare, href: "/instructor/questions-reponses" },
        { label: "Annonces", icon: Megaphone, href: "/instructor/annonces" },
        { label: "Avis", icon: Star, href: "/instructor/avis" },
      ]
    },
    {
      label: "Performance",
      items: [
        { label: "Étudiants", icon: Users, href: "/instructor/students" },
        { label: "Revenus", icon: BadgeEuro, href: "/instructor/revenus" },
        { label: "Certificats", icon: Award, href: "/instructor/certificats" },
      ]
    },
    {
      label: "Compte",
      items: [
        { label: "Mon Profil Public", icon: UserCircle, href: `/instructor/${currentUser?.uid}` },
        { label: "Paramètres", icon: Settings, href: "/instructor/settings" },
      ]
    }
  ];

  return (
    <div className="flex flex-col h-full bg-[#0f172a] text-white border-r border-slate-800">
      <div className="p-6 flex items-center gap-3">
        <div className="h-10 w-10 relative bg-primary/20 border border-primary/30 rounded-xl flex items-center justify-center overflow-hidden">
          <img src={logoUrl} alt="Logo" className="h-7 w-7 object-contain" />
        </div>
        <span className="font-bold text-xl tracking-tight line-clamp-1">{siteName}</span>
      </div>

      <div className="px-4 mb-4">
        <Button asChild className="w-full justify-start gap-2 bg-primary hover:bg-primary/90 text-white font-black uppercase text-[10px] tracking-widest h-12 rounded-xl shadow-lg shadow-primary/20">
          <Link href="/instructor/courses/create" onClick={onLinkClick}>
            <PlusCircle className="h-4 w-4" />
            Nouveau cours
          </Link>
        </Button>
      </div>

      <div className="flex-1 px-4 space-y-6 overflow-y-auto custom-scrollbar pb-10">
        {groups.map((group) => (
          <div key={group.label} className="space-y-1">
            <p className="text-[10px] font-black text-slate-500 uppercase px-4 mb-2 tracking-[0.2em]">
              {group.label}
            </p>
            {group.items.map((item) => {
              const active = pathname === item.href || (item.href !== '/instructor/dashboard' && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onLinkClick}
                  className={cn(
                    "flex items-center gap-x-3 px-4 py-3 text-sm font-bold transition-all rounded-xl group",
                    active 
                      ? "bg-primary/10 text-primary border border-primary/20 shadow-inner" 
                      : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                  )}
                >
                  <item.icon className={cn("h-5 w-5 transition-colors", active ? "text-primary" : "text-slate-500 group-hover:text-slate-300")} />
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
