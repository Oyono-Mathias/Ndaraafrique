
'use client';

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useRole } from "@/context/RoleContext";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  BookOpen,
  Users,
  DollarSign,
  BarChart3,
  MessagesSquare,
  Star,
  ClipboardCheck,
  FileQuestion,
  Award,
  Folder,
  Settings,
  LogIn,
  Shield,
  Briefcase,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { UserNav } from "./user-nav";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";


const SidebarItem = ({ href, icon: Icon, label, onClick }: { href: string, icon: React.ElementType, label: string, onClick: () => void }) => {
  const pathname = usePathname();
  const { ndaraUser } = useRole();
  const { toast } = useToast();
  const { t } = useTranslation();
  const isActive = (pathname.startsWith(href) && href !== '/dashboard') || (pathname === href && href === '/dashboard');
  
  const isAllowedPath = (path: string) => {
    const alwaysAllowed = ['/dashboard', '/account', '/messages'];
    if (alwaysAllowed.includes(path)) return true;
    return ndaraUser?.isInstructorApproved;
  };

  const handleClick = (e: React.MouseEvent) => {
    if (!isAllowedPath(href)) {
        e.preventDefault();
        toast({
            variant: "destructive",
            title: t('access_denied_title'),
            description: t('instructor_approval_required_sidebar'),
        });
    } else {
      onClick();
    }
  };

  return (
    <Link
      href={href}
      onClick={handleClick}
      className={cn(
        "flex items-center px-4 py-3 my-1 cursor-pointer transition-all duration-200 rounded-lg mx-3 group relative",
        isActive
          ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
          : 'text-slate-300 hover:bg-slate-800'
      )}
    >
      <Icon className={cn(
        "w-5 h-5 mr-4",
        isActive ? 'text-primary-foreground' : 'text-slate-400 group-hover:text-primary'
      )} />
      <span className="font-semibold text-sm leading-tight">{label}</span>
      {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 bg-primary-foreground rounded-r-full"></div>}
    </Link>
  );
};

export function InstructorSidebar({ siteName, logoUrl, onLinkClick }: { siteName?: string, logoUrl?: string, onLinkClick: () => void }) {
  const router = useRouter();
  const { switchRole, ndaraUser, availableRoles } = useRole();
  const { t } = useTranslation();
  const isAdmin = availableRoles.includes('admin');

  const instructorMenu = [
    {
      label: t('instructor_sidebar_group_work'),
      items: [
        { href: '/dashboard', icon: LayoutDashboard, textKey: 'navDashboard' },
        { href: '/instructor/courses', icon: BookOpen, textKey: 'navMyCourses' },
        { href: '/instructor/devoirs', icon: ClipboardCheck, textKey: 'navAssignments' },
        { href: '/instructor/quiz', icon: FileQuestion, textKey: 'navQuiz' },
        { href: '/instructor/ressources', icon: Folder, textKey: 'navResources' },
      ],
    },
    {
      label: t('instructor_sidebar_group_finances'),
      items: [
        { href: '/instructor/students', icon: Users, textKey: 'navMyStudents' },
        { href: '/mes-revenus', icon: DollarSign, textKey: 'navFinance' },
        { href: '/statistiques', icon: BarChart3, textKey: 'navStatistics' },
        { href: '/certificats-instructor', icon: Award, textKey: 'navCertificates' },
      ],
    },
    {
      label: t('instructor_sidebar_group_communication'),
      items: [
        { href: '/messages', icon: MessagesSquare, textKey: 'navMessages' },
        { href: '/questions-reponses', icon: MessagesSquare, textKey: 'navQA' },
        { href: '/avis', icon: Star, textKey: 'navReviews' },
      ],
    },
  ];
  
  const handleSwitchToAdmin = () => {
    switchRole('admin');
    router.push('/admin');
  }

  return (
    <div className="w-full h-full bg-[#111827] border-r border-white/10 flex flex-col shadow-sm">
      <header className="p-4 border-b border-white/10 flex items-center gap-2">
        <Image src={logoUrl || "/icon.svg"} width={28} height={28} alt={`${siteName} Logo`} className="rounded-full" />
        <span className="font-bold text-lg text-white">
          Ndara Afrique
        </span>
      </header>

      <nav className="flex-1 py-2 overflow-y-auto">
        {instructorMenu.map((group) => (
          <div key={group.label} className="py-2">
            <p className="px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">{group.label}</p>
            {group.items.map((item) => (
              <SidebarItem 
                key={item.href} 
                href={item.href} 
                icon={item.icon} 
                label={t(item.textKey)}
                onClick={onLinkClick} />
            ))}
          </div>
        ))}
      </nav>

      <footer className="p-4 mt-auto border-t border-white/10 space-y-2">
        <UserNav />
        <Button
          variant="outline"
          className="w-full justify-center bg-slate-800/50 border-slate-700 hover:bg-slate-700/80 text-white"
          onClick={() => switchRole('student')}
        >
          <LogIn className="mr-2 h-4 w-4" />
          {t('userRoleStudent')}
        </Button>
        {isAdmin && (
            <Button variant="secondary" className="w-full justify-center" onClick={handleSwitchToAdmin}>
                <Shield className="mr-2 h-4 w-4" />
                {t('admin_mode')}
            </Button>
        )}
      </footer>
    </div>
  );
}
