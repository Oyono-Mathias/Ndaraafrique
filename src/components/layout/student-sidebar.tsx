
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


const SidebarItem = ({ href, icon: Icon, label, unreadCount, onClick }: { href: string, icon: React.ElementType, label: string, unreadCount?: number, onClick: () => void }) => {
  const pathname = usePathname();
  const isActive = (href === '/dashboard' && pathname === href) || (href !== '/dashboard' && pathname.startsWith(href));

  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "flex items-center justify-between px-4 py-3 my-1 cursor-pointer transition-all duration-300 rounded-lg mx-3 group relative",
        isActive
          ? "bg-primary/10 text-primary font-bold shadow-sm before:content-[''] before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:h-2/3 before:w-1 before:bg-primary before:rounded-r-full"
          : "text-slate-600 hover:bg-slate-100/80"
      )}
    >
      <div className="flex items-center">
        <Icon className={cn(
          "w-5 h-5 mr-4 text-slate-500 group-hover:text-primary transition-colors duration-300 tv:w-7 tv:h-7",
          isActive && "text-primary"
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
        { href: "/dashboard", icon: Star, textKey: 'navSelection' },
        { href: "/search", icon: Search, textKey: 'navSearch' },
        { href: "/mes-formations", icon: Play, textKey: 'navMyLearning' },
        { href: "/tutor", icon: Bot, textKey: 'navTutor' },
      ],
    },
    {
      label: t('navFollowUp'),
      items: [
        { href: "/mes-certificats", icon: Award, textKey: 'navMyCertificates' },
        { href: "/liste-de-souhaits", icon: Heart, textKey: 'navWishlist' },
        { href: "/mes-devoirs", icon: ClipboardCheck, textKey: 'navMyAssignments' },
      ],
    },
    {
      label: t('navCommunity'),
      items: [
        { href: "/annuaire", icon: Users, textKey: 'navDirectory' },
        { href: "/questions-reponses", icon: HelpCircle, textKey: 'navMyQuestions' },
        { href: "/messages", icon: MessageSquare, textKey: 'navMessages' },
      ]
    },
    {
      label: t('navAccount'),
      items: [
        { href: "/account", icon: User, textKey: 'navAccount' },
        { href: "/notifications", icon: Bell, textKey: 'navNotifications' },
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
