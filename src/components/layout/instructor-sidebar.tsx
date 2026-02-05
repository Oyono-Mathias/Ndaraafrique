
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
  UserCircle,
  X
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
    },
    {
      label: "COMPTE",
      items: [
        { label: "Mon Profil Public", icon: UserCircle, href: `/instructor/${currentUser?.uid}` },
        { label: "Paramètres", icon: Settings, href: "/instructor/settings" },
      ]
    }
  ];

  return (
    <div className="flex flex-col h-full bg-[#050a14] text-white border-r border-slate-800/50">
      
      {/* HEADER SIDEBAR */}
      <div className="p-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
            <div className="h-10 w-10 relative bg-primary/20 border border-primary/30 rounded-xl flex items-center justify-center overflow-hidden">
                <img src={logoUrl} alt="Logo" className="h-7 w-7 object-contain" />
            </div>
            <span className="font-bold text-xl tracking-tight line-clamp-1">{siteName}</span>
        </div>
        <Button variant="ghost" size="icon" className="md:hidden text-slate-400" onClick={onLinkClick}>
            <X className="h-6 w-6" />
        </Button>
      </div>

      {/* BOUTON ACTION PRINCIPALE */}
      <div className="px-4 mb-6">
        <Button asChild className="w-full justify-center gap-2 bg-primary hover:bg-primary/90 text-white font-black uppercase text-[10px] tracking-[0.15em] h-14 rounded-2xl shadow-2xl shadow-primary/30 active:scale-95 transition-all">
          <Link href="/instructor/courses/create" onClick={onLinkClick}>
            <PlusCircle className="h-5 w-5" />
            NOUVEAU COURS
          </Link>
        </Button>
      </div>

      {/* MENU ITEMS */}
      <div className="flex-1 px-4 space-y-8 overflow-y-auto custom-scrollbar pb-10">
        {groups.map((group, gIdx) => (
          <div key={gIdx} className="space-y-1">
            {group.label && (
                <p className="text-[10px] font-black text-slate-500 uppercase px-4 mb-3 tracking-[0.25em]">
                    {group.label}
                </p>
            )}
            {group.items.map((item) => {
              const active = pathname === item.href || (item.href !== '/instructor/dashboard' && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onLinkClick}
                  className={cn(
                    "flex items-center gap-x-4 px-4 py-3.5 text-sm font-bold transition-all rounded-2xl group",
                    active 
                      ? "bg-primary/10 text-primary" 
                      : "text-slate-400 hover:text-white hover:bg-slate-800/40"
                  )}
                >
                  <item.icon className={cn("h-5 w-5 transition-colors", active ? "text-primary" : "text-slate-500 group-hover:text-slate-300")} />
                  <span className="tracking-tight">{item.label}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
