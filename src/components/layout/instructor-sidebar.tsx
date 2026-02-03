
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
  BadgeEuro
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface SidebarProps {
  siteName?: string;
  logoUrl?: string;
  onLinkClick?: () => void;
}

export function InstructorSidebar({ 
  siteName = "Ndara Afrique", 
  logoUrl = "/icon.svg", 
  onLinkClick 
}: SidebarProps) {
  const pathname = usePathname();

  const routes = [
    {
      label: "Tableau de bord",
      icon: LayoutDashboard,
      href: "/instructor/dashboard",
      active: pathname === "/instructor/dashboard",
    },
    {
      label: "Mes cours",
      icon: BookOpen,
      href: "/instructor/courses",
      active: pathname.startsWith("/instructor/courses"),
    },
    {
      label: "Mes étudiants",
      icon: Users,
      href: "/instructor/students",
      active: pathname === "/instructor/students",
    },
    {
      label: "Revenus",
      icon: BadgeEuro,
      href: "/instructor/revenus",
      active: pathname === "/instructor/revenus",
    },
    {
      label: "Messages",
      icon: MessageSquare,
      href: "/instructor/questions-reponses",
      active: pathname === "/instructor/questions-reponses",
    },
    {
      label: "Paramètres",
      icon: Settings,
      href: "/instructor/settings",
      active: pathname === "/instructor/settings",
    },
  ];

  return (
    <div className="flex flex-col h-full bg-[#0f172a] text-white border-r border-slate-800">
      <div className="p-6 flex items-center gap-3">
        <div className="h-10 w-10 relative bg-primary rounded-xl flex items-center justify-center overflow-hidden">
          <img src={logoUrl} alt="Logo" className="h-7 w-7 object-contain" />
        </div>
        <span className="font-bold text-xl tracking-tight line-clamp-1">{siteName}</span>
      </div>

      <div className="px-4 mb-4">
        <Link href="/instructor/courses/create" onClick={onLinkClick}>
          <Button className="w-full justify-start gap-2 bg-primary hover:bg-primary/90">
            <PlusCircle className="h-4 w-4" />
            Créer un cours
          </Button>
        </Link>
      </div>

      <div className="flex-1 px-4 space-y-2">
        <p className="text-[10px] font-bold text-slate-500 uppercase px-4 mb-2 tracking-widest">
          Menu Formateur
        </p>
        {routes.map((route) => (
          <Link
            key={route.href}
            href={route.href}
            onClick={onLinkClick}
            className={cn(
              "flex items-center gap-x-3 px-4 py-3 text-sm font-medium transition-all rounded-lg group",
              route.active 
                ? "bg-primary/10 text-primary border border-primary/20" 
                : "text-slate-400 hover:text-white hover:bg-slate-800/50"
            )}
          >
            <route.icon className={cn("h-5 w-5 transition-colors", route.active ? "text-primary" : "text-slate-400 group-hover:text-white")} />
            {route.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
