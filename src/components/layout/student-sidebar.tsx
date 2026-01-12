
'use client';

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useRole } from "@/context/RoleContext";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Book,
  Award,
  Bot,
  ClipboardCheck,
  HelpCircle,
  MessageSquare,
  Users,
  User,
  Heart,
  LogIn,
  Shield,
  LogOut,
  Star,
  Search,
  Play,
  Briefcase,
  Bell,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { collection, query, where, onSnapshot, getFirestore, getDoc, doc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { Badge } from "../ui/badge";


const SidebarItem = ({ href, icon: Icon, label, unreadCount, onClick, id }: { href: string, icon: React.ElementType, label: string, unreadCount?: number, onClick: () => void, id?: string }) => {
  const pathname = usePathname();
  const isActive = (href === '/dashboard' && pathname === href) || (href !== '/dashboard' && pathname.startsWith(href));

  return (
    <Link
      href={href}
      onClick={onClick}
      id={id}
      className={cn(
        "flex items-center justify-between px-4 py-2.5 my-1 cursor-pointer transition-all duration-200 rounded-lg mx-3 group relative",
        isActive
          ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
          : "text-slate-600 hover:bg-slate-100/80"
      )}
    >
      <div className="flex items-center">
        <Icon className={cn(
          "w-5 h-5 mr-4 text-slate-500 group-hover:text-primary transition-colors duration-300 tv:w-7 tv:h-7",
          isActive && "text-primary-foreground"
        )} />
        <span className="font-medium text-sm tv:text-lg">{label}</span>
      </div>
      {unreadCount !== undefined && unreadCount > 0 && (
        <Badge className="bg-red-500 text-white h-5 px-1.5 text-xs">{unreadCount}</Badge>
      )}
    </Link>
  );
};


export function StudentSidebar({ siteName, logoUrl, onLinkClick }: { siteName?: string, logoUrl?: string, onLinkClick: () => void }) {
  const router = useRouter();
  const { switchRole, availableRoles, user } = useRole();
  const { t } = useTranslation();
  const isInstructor = availableRoles.includes('instructor');
  const isAdmin = availableRoles.includes('admin');
  const [unreadMessages, setUnreadMessages] = useState(0);
  const db = getFirestore();
  const [showInstructorSignup, setShowInstructorSignup] = useState(true);

  const studentMenu = [
    {
      label: t('navPersonal'),
      items: [
        { href: "/dashboard", icon: Star, textKey: 'navSelection', id: 'sidebar-nav-dashboard' },
        { href: "/search", icon: Search, textKey: 'navSearch', id: 'sidebar-nav-search' },
        { href: "/mes-formations", icon: Play, textKey: 'navMyLearning', id: 'sidebar-nav-mes-formations' },
        { href: "/tutor", icon: Bot, textKey: 'navTutor', id: 'sidebar-nav-tutor' },
      ],
    },
    {
      label: t('navFollowUp'),
      items: [
        { href: "/mes-certificats", icon: Award, textKey: 'navMyCertificates', id: 'sidebar-nav-mes-certificats' },
        { href: "/liste-de-souhaits", icon: Heart, textKey: 'navWishlist', id: 'sidebar-nav-liste-de-souhaits' },
        { href: "/mes-devoirs", icon: ClipboardCheck, textKey: 'navMyAssignments', id: 'sidebar-nav-mes-devoirs' },
      ],
    },
    {
      label: t('navCommunity'),
      items: [
        { href: "/annuaire", icon: Users, textKey: 'navDirectory', id: 'sidebar-nav-annuaire' },
        { href: "/questions-reponses", icon: HelpCircle, textKey: 'navMyQuestions', id: 'sidebar-nav-questions-reponses' },
        { href: "/messages", icon: MessageSquare, textKey: 'navMessages', id: 'sidebar-nav-messages' },
      ]
    },
    {
      label: t('navAccount'),
      items: [
        { href: "/account", icon: User, textKey: 'navAccount', id: 'sidebar-nav-account' },
        { href: "/notifications", icon: Bell, textKey: 'navNotifications', id: 'sidebar-nav-notifications' },
      ],
    },
  ];

  useEffect(() => {
    const settingsRef = doc(db, 'settings', 'global');
    const unsubscribe = onSnapshot(settingsRef, (docSnap) => {
        if (docSnap.exists()) {
            setShowInstructorSignup(docSnap.data().platform?.allowInstructorSignup ?? true);
        }
    });
    return () => unsubscribe();
  }, [db]);


  useEffect(() => {
    if (!user?.uid) return;

    const chatsQuery = query(collection(db, 'chats'), where('unreadBy', 'array-contains', user.uid));
    const unsubscribe = onSnapshot(chatsQuery, (snapshot) => {
        setUnreadMessages(snapshot.size);
    });

    return () => unsubscribe();
  }, [user, db]);
  
  const handleSwitchToAdmin = () => {
    switchRole('admin');
    router.push('/admin');
  }

  return (
    <div className="w-full h-full bg-white border-r border-slate-200 flex flex-col shadow-sm">
      <header className="p-4 border-b border-slate-100">
        <Link href="/dashboard" className="flex items-center gap-2">
            <Image src={logoUrl || "/icon.svg"} width={32} height={32} alt={`${siteName} Logo`} className="rounded-full" />
            <span className="font-bold text-lg text-primary">{siteName || 'FormaAfrique'}</span>
        </Link>
      </header>

      <nav className="flex-1 py-2 overflow-y-auto">
        {studentMenu.map((group) => (
          <div key={group.label} className="py-2">
            <p className="px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">{group.label}</p>
            {group.items.map((item) => (
              <SidebarItem
                key={item.href}
                href={item.href}
                icon={item.icon}
                label={t(item.textKey)}
                id={item.id}
                unreadCount={item.href === '/messages' ? unreadMessages : undefined}
                onClick={onLinkClick}
              />
            ))}
          </div>
        ))}
      </nav>

      <footer className="p-4 mt-auto border-t border-slate-100 space-y-2">
        {isInstructor ? (
            <Button variant="outline" className="w-full justify-center" onClick={() => switchRole('instructor')}>
                <LogIn className="mr-2 h-4 w-4" />
                Mode Instructeur
            </Button>
        ) : showInstructorSignup && (
             <Button variant="outline" className="w-full justify-center tv:py-6 tv:text-lg" asChild>
                <Link href="/devenir-instructeur">
                    <Briefcase className="mr-2 h-4 w-4 tv:h-6 tv:w-6" />
                    {t('be_instructor')}
                </Link>
            </Button>
        )}
        {isAdmin && (
             <Button variant="secondary" className="w-full justify-center tv:py-6 tv:text-lg" onClick={handleSwitchToAdmin}>
                <Shield className="mr-2 h-4 w-4 tv:h-6 tv:w-6" />
                Mode Admin
            </Button>
        )}
      </footer>
    </div>
  );
}
