'use client';

import React from 'react';
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  BookOpen, 
  GraduationCap, 
  MessageSquare, 
  Settings,
  Trophy,
  User
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { OnboardingGuide } from "@/components/onboarding-guide";

interface SidebarProps {
  siteName?: string;
  logoUrl?: string;
  onLinkClick?: () => void;
}

export function StudentSidebar({ siteName = "Ndara Afrique", logoUrl = "/icon.svg", onLinkClick }: SidebarProps) {
  const pathname = usePathname();

  const routes = [
    {
      label: "Tableau de bord",
      icon: LayoutDashboard,
      href: "/student/dashboard",
      active: pathname === "/student/dashboard",
    },
    {
      label: "Mes formations",
      icon: GraduationCap,
      href: "/student/mes-formations",
      active: pathname.startsWith("/student/mes-formations"),
    },
    {
      label: "Catalogue",
      icon: BookOpen,
      href: "/student/catalogue",
      active: pathname === "/student/catalogue",
    },
    {
      label: "Mes certificats",
      icon: Trophy,
      href: "/student/mes-certificats",
      active: pathname === "/student/mes-certificats",
    },
    {
      label: "Discussions",
      icon: MessageSquare,
      href: "/student/messages",
      active: pathname === "/student/messages",
    },
    {
      label: "Mon Profil",
      icon: User,
      href: "/account",
      active: pathname === "/account",
    },
    {
      label: "Paramètres",
      icon: Settings,
      href: "/student/settings",
      active: pathname === "/student/settings",
    },
  ];

  return (
    <div className="flex flex-col h-full bg-[#111827] text-white border-r border-slate-800">
      <div className="p-6 flex items-center gap-3">
        <div className="h-10 w-10 relative bg-primary rounded-xl flex items-center justify-center overflow-hidden">
          <img src={logoUrl} alt="Logo" className="h-7 w-7 object-contain" />
        </div>
        <span className="font-bold text-xl tracking-tight line-clamp-1">{siteName}</span>
      </div>

      <div className="flex-1 px-4 space-y-2 mt-4">
        {routes.map((route) => (
          <Link
            key={route.href}
            href={route.href}
            onClick={onLinkClick}
            className={cn(
              "flex items-center gap-x-3 px-4 py-3 text-sm font-medium transition-all rounded-lg group",
              route.active 
                ? "bg-primary/10 text-primary" 
                : "text-slate-400 hover:text-white hover:bg-slate-800/50"
            )}
          >
            <route.icon className={cn("h-5 w-5 transition-colors", route.active ? "text-primary" : "text-slate-400 group-hover:text-white")} />
            {route.label}
          </Link>
        ))}
      </div>

      <div className="p-4 space-y-4">
        <OnboardingGuide />
        <div className="bg-slate-800/40 rounded-xl p-4 border border-slate-700/50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400">Progression globale</span>
            <span className="text-xs font-bold text-primary">0%</span>
          </div>
          <Progress value={0} className="h-1.5 bg-slate-700" />
        </div>
      </div>
    </div>
  );
}