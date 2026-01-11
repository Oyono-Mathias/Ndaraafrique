
"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
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
  LogOut,
  Sparkles,
  LogIn,
  Shield,
  Briefcase,
  UserCheck,
  Landmark,
} from "lucide-react";
import { getAuth, signOut } from "firebase/auth";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";
import { useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where, getFirestore } from "firebase/firestore";
import { Badge } from "../ui/badge";

const adminMenu = [
    { href: "/admin", icon: LayoutDashboard, text: "Tableau de bord" },
    { href: "/admin/users", icon: Users, text: "Utilisateurs" },
    { href: "/admin/instructors", icon: UserCheck, text: "Candidatures", countId: 'pendingInstructors' },
    { href: "/admin/moderation", icon: ShieldAlert, text: "Modération", countId: 'pendingCourses' },
    { href: "/admin/courses", icon: BookOpen, text: "Formations" },
    { href: "/admin/payments", icon: CreditCard, text: "Transactions" },
    { href: "/admin/payouts", icon: Landmark, text: "Retraits" },
    { href: "/admin/marketing", icon: Sparkles, text: "Marketing IA" },
    { href: "/admin/support", icon: HelpCircle, text: "Support" },
    { href: "/messages", icon: MessageSquare, text: "Messagerie" },
    { href: "/admin/settings", icon: Settings, text: "Paramètres" },
];


const SidebarItem = ({ href, icon: Icon, label, count }: { href: string, icon: React.ElementType, label: string, count?: number }) => {
  const pathname = usePathname();
  const isActive = (href === '/admin' && pathname === href) || (href !== '/admin' && pathname.startsWith(href));

  return (
    <Link
      href={href}
      className={cn(
        "flex items-center justify-between px-4 py-2.5 my-1 cursor-pointer transition-all duration-200 rounded-lg mx-3 group",
        isActive
          ? 'bg-primary text-primary-foreground shadow-md'
          : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
      )}
    >
        <div className="flex items-center">
            <Icon className={cn(
                "w-5 h-5 mr-4",
                isActive ? 'text-white' : 'text-slate-400 group-hover:text-primary'
            )} />
            <span className="font-medium text-sm">{label}</span>
        </div>
        {count !== undefined && count > 0 && (
            <Badge className="bg-red-500 text-white h-5 px-2 text-xs">{count}</Badge>
        )}
    </Link>
  );
};


export function AdminSidebar({ siteName, logoUrl }: { siteName?: string, logoUrl?: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const { switchRole } = useRole();
  const db = getFirestore();

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


  const handleLogout = async () => {
    const auth = getAuth();
    await signOut(auth);
    router.push('/');
    toast({ title: "Déconnexion réussie" });
  }

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
  }

  return (
    <div className="w-full h-full flex flex-col">
       <header className="p-4 border-b border-slate-700/50">
        <Link href="/admin" className="flex items-center gap-2">
            <Image src={logoUrl || "/icon.svg"} width={32} height={32} alt={`${siteName} Logo`} className="rounded-full" />
            <span className="font-bold text-lg text-white">{siteName || 'Admin Panel'}</span>
        </Link>
      </header>

      <nav className="flex-1 py-2 overflow-y-auto">
          {adminMenu.map((item) => (
            <SidebarItem 
                key={item.href} 
                href={item.href} 
                icon={item.icon} 
                label={item.text}
                count={item.countId ? counts[item.countId as keyof typeof counts] : undefined}
            />
          ))}
      </nav>

      <footer className="p-4 mt-auto space-y-2 border-t border-slate-700/50">
        <Button variant="outline" className="w-full justify-center bg-slate-700 border-slate-600 hover:bg-slate-600 text-white" onClick={handleSwitchToInstructor}>
            <Briefcase className="mr-2 h-4 w-4"/>
            Mode Instructeur
        </Button>
         <Button variant="outline" className="w-full justify-center bg-slate-700 border-slate-600 hover:bg-slate-600 text-white" onClick={handleSwitchToStudent}>
            <Users className="mr-2 h-4 w-4"/>
            Mode Étudiant
        </Button>
         <Button variant="ghost" className="w-full justify-center text-slate-400 hover:text-white" onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          Déconnexion
        </Button>
      </footer>
    </div>
  );
}
