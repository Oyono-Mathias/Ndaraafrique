
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
  MessageSquare,
  Users,
  User,
  Heart,
  LogIn,
  Shield,
  Star,
  Search,
  Play,
  Briefcase,
  Bell,
  Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { collection, query, where, onSnapshot, getFirestore, getDoc, doc } from "firebase/firestore";
import { useEffect, useState, useMemo } from "react";
import { Badge } from "../ui/badge";
import { Progress } from "../ui/progress";
import { OnboardingGuide } from "../onboarding-guide";
import { UserNav } from "./user-nav";

const SidebarItem = ({ href, icon: Icon, label, unreadCount, onClick, id, disabled }: { href: string, icon: React.ElementType, label: string, unreadCount?: number, onClick: () => void, id?: string, disabled?: boolean }) => {
  const pathname = usePathname();
  const isActive = (href === '/dashboard' && pathname === href) || (href !== '/dashboard' && pathname.startsWith(href));

  return (
    <Link
      href={disabled ? '#' : href}
      onClick={disabled ? (e) => e.preventDefault() : onClick}
      id={id}
      aria-disabled={disabled}
      className={cn(
        "flex items-center justify-between px-4 py-2.5 my-1 cursor-pointer transition-all duration-200 rounded-lg mx-3 group relative",
        isActive
          ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
          : 'text-slate-300 hover:bg-slate-800',
        disabled && "opacity-50 cursor-not-allowed hover:bg-transparent"
      )}
    >
      <div className="flex items-center">
        <Icon className={cn(
          "w-5 h-5 mr-4 text-slate-500 group-hover:text-primary transition-colors duration-300",
          isActive && "text-primary-foreground",
          disabled && "text-slate-600 group-hover:text-slate-600"
        )} />
        <span className="font-medium text-sm">{label}</span>
      </div>
      {unreadCount !== undefined && unreadCount > 0 && (
        <Badge className="bg-red-500 text-white h-5 px-1.5 text-xs">{unreadCount}</Badge>
      )}
       {disabled && <Lock className="h-3 w-3 text-slate-500"/>}
    </Link>
  );
};


export function StudentSidebar({ siteName, logoUrl, onLinkClick }: { siteName?: string, logoUrl?: string, onLinkClick: () => void }) {
  const router = useRouter();
  const { switchRole, availableRoles, user, formaAfriqueUser } = useRole();
  const { t } = useTranslation();
  const isInstructor = availableRoles.includes('instructor');
  const isAdmin = availableRoles.includes('admin');
  const [unreadMessages, setUnreadMessages] = useState(0);
  const db = getFirestore();
  const [showInstructorSignup, setShowInstructorSignup] = useState(true);
  const isProfileComplete = formaAfriqueUser?.isProfileComplete || false;

  const studentMenu = [
    {
      label: t('navPersonal'),
      items: [
        { href: "/dashboard", icon: Star, textKey: 'navSelection', id: 'sidebar-nav-dashboard' },
        { href: "/search", icon: Search, textKey: 'navSearch', id: 'sidebar-nav-search' },
        { href: "/mes-formations", icon: Play, textKey: 'navMyCourses', id: 'sidebar-nav-mes-formations' },
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
        { href: "/annuaire", icon: Users, textKey: 'navDirectory', id: 'sidebar-nav-annuaire', disabled: !isProfileComplete },
        { href: "/messages", icon: MessageSquare, textKey: 'navMessages', id: 'sidebar-nav-messages', disabled: !isProfileComplete },
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
  
  const profileProgress = useMemo(() => {
      let progress = 0;
      if (formaAfriqueUser?.username) progress += 50;
      if (formaAfriqueUser?.careerGoals?.interestDomain) progress += 50;
      return progress;
  }, [formaAfriqueUser]);

  return (
    <>
      <OnboardingGuide />
      <div className="w-full h-full bg-[#111827] border-r border-slate-800 flex flex-col shadow-sm">
        <header className="p-4 border-b border-slate-800">
          <Link href="/dashboard" className="flex items-center gap-2">
              <Image src={logoUrl || "/icon.svg"} width={32} height={32} alt={`${siteName} Logo`} className="rounded-full" />
              <span className="font-bold text-lg text-white">{siteName || 'Ndara Afrique'}</span>
          </Link>
        </header>
        
        {!isProfileComplete && (
            <div className="p-4 space-y-2 border-b border-slate-800">
                <Link href="/account" className="block text-center">
                    <p className="text-sm font-semibold text-white">Complète ton profil</p>
                    <Progress value={profileProgress} className="h-1.5 mt-2" />
                    <p className="text-xs text-slate-400 mt-1">Débloque la messagerie et l'annuaire !</p>
                </Link>
            </div>
        )}

        <nav className="flex-1 py-2 overflow-y-auto">
          {studentMenu.map((group) => (
            <div key={group.label} className="py-2">
              <p className="px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">{group.label}</p>
              {group.items.map((item) => (
                <SidebarItem
                  key={item.href}
                  href={item.href}
                  icon={item.icon}
                  label={t(item.textKey)}
                  id={item.id}
                  unreadCount={item.href === '/messages' ? unreadMessages : undefined}
                  disabled={item.disabled}
                  onClick={onLinkClick}
                />
              ))}
            </div>
          ))}
        </nav>

        <footer className="p-4 mt-auto border-t border-slate-800 space-y-2">
           <div className="p-2 rounded-lg bg-slate-800/50">
              <UserNav />
           </div>
          {isInstructor ? (
              <Button variant="outline" className="w-full justify-center bg-slate-800 border-slate-700 hover:bg-slate-700 text-white" onClick={() => switchRole('instructor')}>
                  <LogIn className="mr-2 h-4 w-4" />
                  {t('userRoleInstructor')}
              </Button>
          ) : showInstructorSignup && (
              <Button variant="outline" className="w-full justify-center bg-slate-800 border-slate-700 hover:bg-slate-700 text-white" asChild>
                  <Link href="/devenir-instructeur">
                      <Briefcase className="mr-2 h-4 w-4" />
                      {t('be_instructor')}
                  </Link>
              </Button>
          )}
          {isAdmin && (
              <Button variant="secondary" className="w-full justify-center" onClick={handleSwitchToAdmin}>
                  <Shield className="mr-2 h-4 w-4" />
                  Mode Admin
              </Button>
          )}
        </footer>
      </div>
    </>
  );
}
