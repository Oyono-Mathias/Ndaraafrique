
"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useRole } from "@/context/RoleContext";
import { useTranslation } from "react-i18next";
import {
  LayoutDashboard,
  Users,
  BookOpen,
  CreditCard,
  MessageSquare,
  HelpCircle,
  Settings,
  ShieldAlert,
  LogOut,
  Sparkles,
  LogIn,
  Shield,
  Briefcase,
  UserCheck,
  Landmark,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";
import { useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where, getFirestore } from "firebase/firestore";
import { Badge } from "../ui/badge";

const SidebarItem = ({ href, icon: Icon, label, count, onClick }: { href: string, icon: React.ElementType, label: string, count?: number, onClick: () => void }) => {
  const pathname = usePathname();
  const isActive = (href === '/admin' && pathname === href) || (href !== '/admin' && pathname.startsWith(href));

  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "flex items-center justify-between px-4 py-2.5 my-1 cursor-pointer transition-all duration-200 rounded-lg mx-3 group",
        isActive
          ? 'bg-primary text-primary-foreground shadow-md'
          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/50'
      )}
    >
        <div className="flex items-center">
            <Icon className={cn(
                "sidebar-icon w-5 h-5 mr-4 tv:w-7 tv:h-7",
                isActive ? 'text-white' : 'text-slate-500 dark:text-slate-400 group-hover:text-primary'
            )} />
            <span className="sidebar-label font-medium text-sm tv:text-lg">{label}</span>
        </div>
        {count !== undefined && count > 0 && (
            <Badge className="bg-red-500 text-white h-5 px-2 text-xs tv:h-7 tv:px-3 tv:text-base">{count}</Badge>
        )}
    </Link>
  );
};


export function AdminSidebar({ siteName, logoUrl, onLinkClick }: { siteName?: string, logoUrl?: string, onLinkClick: () => void }) {
  const { switchRole } = useRole();
  const { t } = useTranslation();
  const db = getFirestore();

  const adminMenu = [
    { href: "/admin", icon: LayoutDashboard, textKey: "navDashboard" },
    { href: "/admin/users", icon: Users, textKey: "navUsers" },
    { href: "/admin/instructors", icon: UserCheck, textKey: "navApplications", countId: 'pendingInstructors' },
    { href: "/admin/moderation", icon: ShieldAlert, textKey: "navModeration", countId: 'pendingCourses' },
    { href: "/admin/courses", icon: BookOpen, textKey: "navCourses" },
    { href: "/admin/payments", icon: CreditCard, textKey: "navTransactions" },
    { href: "/admin/payouts", icon: Landmark, textKey: "navPayouts", countId: 'pendingPayouts' },
    { href: "/admin/marketing", icon: Sparkles, textKey: "navMarketing" },
    { href: "/admin/support", icon: HelpCircle, textKey: "navSupport" },
    { href: "/messages", icon: MessageSquare, textKey: "navMessages" },
    { href: "/admin/settings", icon: Settings, textKey: "navSettings" },
];

  const pendingInstructorsQuery = useMemoFirebase(() => 
    query(collection(db, 'users'), where('role', '==', 'instructor'), where('isInstructorApproved', '==', false)),
    [db]
  );
  const { data: pendingInstructors } = useCollection(pendingInstructorsQuery);

  const pendingCoursesQuery = useMemoFirebase(() =>
    query(collection(db, 'courses'), where('status', '==', 'Pending Review')),
    [db]
  );
  const { data: pendingCourses } = useCollection(pendingCoursesQuery);

  const pendingPayoutsQuery = useMemoFirebase(() =>
    query(collection(db, 'payouts'), where('status', '==', 'en_attente')),
    [db]
  );
  const { data: pendingPayouts } = useCollection(pendingPayoutsQuery);

  const handleSwitchToInstructor = () => {
    switchRole('instructor');
    if (typeof window !== 'undefined') {
        window.location.assign('/dashboard');
    }
  }

  const handleSwitchToStudent = () => {
    switchRole('student');
    if (typeof window !== 'undefined') {
        window.location.assign('/dashboard');
    }
  }
  
  const counts = {
      pendingInstructors: pendingInstructors?.length || 0,
      pendingCourses: pendingCourses?.length || 0,
      pendingPayouts: pendingPayouts?.length || 0,
  }

  return (
    <div className="w-full h-full flex flex-col">
       <header className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3 sidebar-header">
            <Image src={logoUrl || "/icon.svg"} width={32} height={32} alt={`${siteName} Logo`} className="rounded-full sidebar-logo tv:w-10 tv:h-10" />
            <span className="sidebar-label font-bold text-lg text-slate-900 dark:text-white tv:text-2xl">{siteName || 'Admin Panel'}</span>
      </header>

      <nav className="flex-1 py-2 overflow-y-auto">
          {adminMenu.map((item) => (
            <SidebarItem 
                key={item.href} 
                href={item.href} 
                icon={item.icon} 
                label={t(item.textKey)}
                count={item.countId ? counts[item.countId as keyof typeof counts] : undefined}
                onClick={onLinkClick}
            />
          ))}
      </nav>

      <footer className="p-4 mt-auto space-y-2 border-t border-slate-200 dark:border-slate-800">
        <Button variant="outline" className="w-full justify-center tv:py-6 tv:text-lg" onClick={handleSwitchToInstructor}>
            <Briefcase className="mr-2 h-4 w-4 tv:h-6 tv:w-6"/>
            <span className="sidebar-label">Mode Instructeur</span>
        </Button>
         <Button variant="outline" className="w-full justify-center tv:py-6 tv:text-lg" onClick={handleSwitchToStudent}>
            <Users className="mr-2 h-4 w-4 tv:h-6 tv:w-6"/>
            <span className="sidebar-label">Mode Étudiant</span>
        </Button>
      </footer>
    </div>
  );
}
