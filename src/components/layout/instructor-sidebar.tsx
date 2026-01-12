
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
  LogOut,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getAuth, signOut } from "firebase/auth";
import { cn } from "@/lib/utils";
import { I18nProvider } from '@/context/I18nProvider';


const SidebarItem = ({ href, icon: Icon, label, onClick }: { href: string, icon: React.ElementType, label: string, onClick: () => void }) => {
  const pathname = usePathname();
  const { formaAfriqueUser } = useRole();
  const { toast } = useToast();
  const isActive = (pathname.startsWith(href) && href !== '/dashboard') || (pathname === href && href === '/dashboard');
  
  const isAllowedPath = (path: string) => {
    // Allow dashboard and account pages for all instructors
    const alwaysAllowed = ['/dashboard', '/account', '/messages'];
    if (alwaysAllowed.includes(path)) return true;
    
    // For other paths, check for approval
    return formaAfriqueUser?.isInstructorApproved;
  };

  const handleClick = (e: React.MouseEvent) => {
    if (!isAllowedPath(href)) {
        e.preventDefault();
        toast({
            variant: "destructive",
            title: "Accès refusé",
            description: "Votre compte instructeur est en attente d'approbation.",
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
        "flex items-center px-4 py-2.5 my-1 cursor-pointer transition-all duration-200 rounded-lg mx-3 group",
        isActive
          ? 'bg-primary text-white shadow-md'
          : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
      )}
    >
      <Icon className={cn(
        "w-5 h-5 mr-4",
        isActive ? 'text-white' : 'text-slate-400 group-hover:text-primary'
      )} />
      <span className="font-medium text-sm">{label}</span>
    </Link>
  );
};

export function InstructorSidebar({ siteName, logoUrl, onLinkClick }: { siteName?: string, logoUrl?: string, onLinkClick: () => void }) {
  const router = useRouter();
  const { switchRole, formaAfriqueUser, availableRoles } = useRole();
  const { toast } = useToast();
  const { t } = useTranslation();
  const isAdmin = availableRoles.includes('admin');

  const instructorMenu = [
    {
      label: t('navCreation'),
      items: [
        { href: '/dashboard', icon: LayoutDashboard, text: t('navInstructorDashboard') },
        { href: '/instructor/courses', icon: BookOpen, text: t('navMyCourses') },
        { href: '/instructor/devoirs', icon: ClipboardCheck, text: t('navAssignments') },
        { href: '/instructor/quiz', icon: FileQuestion, text: t('navQuiz') },
        { href: '/instructor/ressources', icon: Folder, text: t('navResources') },
      ],
    },
    {
      label: t('navFollowUp'),
      items: [
        { href: '/instructor/students', icon: Users, text: t('navMyStudents') },
        { href: '/mes-revenus', icon: DollarSign, text: t('navMyRevenue') },
        { href: '/statistiques', icon: BarChart3, text: t('navStatistics') },
        { href: '/certificats-instructor', icon: Award, text: t('navCertificates') },
      ],
    },
    {
      label: t('navInteraction'),
      items: [
        { href: '/messages', icon: MessagesSquare, text: t('navMessages') },
        { href: '/questions-reponses', icon: MessagesSquare, text: t('navQA') },
        { href: '/avis', icon: Star, text: t('navReviews') },
      ],
    },
     {
      label: t('navSettings'),
      items: [
         { href: '/account', icon: Settings, text: t('navSettings') },
      ]
    }
  ];
  
  const handleSwitchToAdmin = () => {
    switchRole('admin');
    router.push('/admin');
  }

  return (
    <I18nProvider>
      <div className="w-full h-full bg-[#1e293b] border-r border-slate-700 flex flex-col shadow-sm">
        <header className="p-4 border-b border-slate-700/50">
          <Link href="/dashboard" className="flex items-center gap-2">
            <Image src={logoUrl || "/icon.svg"} width={32} height={32} alt={`${siteName} Logo`} className="rounded-full" />
            <span className="font-bold text-lg text-white">
              {siteName || 'FormaAfrique'}
            </span>
          </Link>
        </header>

        <nav className="flex-1 py-2 overflow-y-auto">
          {instructorMenu.map((group) => (
            <div key={group.label} className="py-2">
              <p className="px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">{group.label}</p>
              {group.items.map((item) => (
                <SidebarItem key={item.href} href={item.href} icon={item.icon} label={item.text} onClick={onLinkClick} />
              ))}
            </div>
          ))}
        </nav>

        <footer className="p-4 mt-auto border-t border-slate-700/50 space-y-2">
          <Button
            variant="outline"
            className="w-full justify-center bg-slate-700 border-slate-600 hover:bg-slate-600 text-white"
            onClick={() => switchRole('student')}
          >
            <LogIn className="mr-2 h-4 w-4" />
            Mode Étudiant
          </Button>
          {isAdmin && (
              <Button variant="secondary" className="w-full justify-center" onClick={handleSwitchToAdmin}>
                  <Shield className="mr-2 h-4 w-4" />
                  Mode Admin
              </Button>
          )}
        </footer>
      </div>
    </I18nProvider>
  );
}
