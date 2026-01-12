
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useRole } from '@/context/RoleContext';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { StudentSidebar } from './student-sidebar';
import { InstructorSidebar } from './instructor-sidebar';
import { AdminSidebar } from './admin-sidebar';
import { Footer } from './footer';
import { Skeleton } from '../ui/skeleton';
import { Button } from '../ui/button';
import { ShieldAlert, Bell, PanelLeft, Star, Search, Play, Heart, User, X, Megaphone, MessageSquare, Wrench, Loader2, HelpCircle, Mail, CheckCircle } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { sendEmailVerification } from 'firebase/auth';
import { useIsMobile } from '@/hooks/use-mobile';
import { collection, query, where, onSnapshot, getFirestore, writeBatch, doc, getDoc, limit, orderBy, Timestamp } from 'firebase/firestore';
import { LanguageSelector } from './language-selector';
import { useTranslation } from 'react-i18next';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { UserNav } from './user-nav';
import { OnboardingGuide } from '../onboarding-guide';

interface Notification {
  id: string;
  text: string;
  createdAt: Timestamp;
  read: boolean;
  link?: string;
  type?: 'success' | 'info' | 'reminder' | 'alert';
}

const NotificationIcon = ({ type }: { type: Notification['type'] }) => {
    switch (type) {
        case 'success': return <CheckCircle className="h-5 w-5 text-green-500" />;
        case 'alert': return <ShieldAlert className="h-5 w-5 text-red-500" />;
        default: return <Bell className="h-5 w-5 text-blue-500" />;
    }
}

const NotificationItem = ({ notif }: { notif: Notification }) => {
  const content = (
    <div className="flex items-start gap-4 p-3 rounded-lg transition-colors hover:bg-muted/50 cursor-pointer">
      <div className="p-1 mt-1">
          <NotificationIcon type={notif.type} />
      </div>
       <div className="flex-1">
          <p className={cn("text-sm", !notif.read && "font-semibold")}>
            {notif.text}
          </p>
          <p className="text-xs text-muted-foreground">
            {notif.createdAt ? formatDistanceToNow(notif.createdAt.toDate(), { locale: fr, addSuffix: true }) : ''}
          </p>
       </div>
       {!notif.read && <div className="h-2.5 w-2.5 rounded-full bg-primary self-center"></div>}
    </div>
  );

  return notif.link ? <Link href={notif.link}>{content}</Link> : <div>{content}</div>;
}

const pageTitleKeys: { [key: string]: string } = {
    '/dashboard': 'navSelection',
    '/tutor': 'navTutor',
    '/mes-formations': 'navMyLearning',
    '/mes-certificats': 'navMyCertificates',
    '/mes-devoirs': 'navMyAssignments',
    '/questions-reponses': 'navMyQuestions',
    '/messages': 'navMessages',
    '/annuaire': 'navDirectory',
    '/profil': 'profil', // Assurez-vous que 'profil' est dans vos fichiers de traduction
    '/account': 'navAccount',
    '/liste-de-souhaits': 'navWishlist',
    '/paiements': 'Paiements', // Assurez-vous que 'Paiements' est dans vos fichiers de traduction
    '/notifications': 'navNotifications',
    '/instructor/courses': 'navMyCourses',
    '/instructor/courses/create': 'Créer un cours', // Traduire
    '/instructor/students': 'navMyStudents',
    '/mes-revenus': 'navMyRevenue',
    '/statistiques': 'navStatistics',
    '/avis': 'navReviews',
    '/instructor/devoirs': 'navAssignments',
    '/instructor/quiz': 'navQuiz',
    '/certificats-instructor': 'navCertificates',
    '/instructor/ressources': 'navResources',
    '/mentions-legales': 'Mentions Légales', // Traduire
    '/cgu': 'Conditions Générales d\'Utilisation', // Traduire
};

function getPageTitleKey(pathname: string): string {
    if (pathname.startsWith('/course/')) return 'Détails du cours'; // Traduire
    if (pathname.startsWith('/courses/')) return 'Lecteur de cours'; // Traduire
    if (pathname.startsWith('/instructor/courses/edit')) return 'Éditeur de cours'; // Traduire
    if (pathname.startsWith('/instructor/courses/create')) return 'Créer un cours'; // Traduire
    if (pathname.startsWith('/messages/')) return 'navMessages';
    if (pathname.startsWith('/questions-reponses/')) return 'navMyQuestions';
    if (pathname.startsWith('/admin/users/')) return 'Profil Utilisateur'; // Traduire
    if (pathname.startsWith('/admin/support/')) return 'Détails du Ticket'; // Traduire
    return pageTitleKeys[pathname] || 'FormaAfrique';
}


function MaintenancePage() {
    return (
        <div className="flex flex-col items-center justify-center h-screen bg-background text-center p-4">
            <Wrench className="h-16 w-16 text-primary mb-4" />
            <h1 className="text-3xl font-bold text-foreground">Site en maintenance</h1>
            <p className="text-muted-foreground mt-2">Nous effectuons des mises à jour. Le site sera de retour très prochainement.</p>
        </div>
    );
}


function ApprovalPendingScreen() {
    return (
        <div className="flex items-center justify-center h-full p-4">
            <Card className="w-full max-w-md text-center">
                <CardHeader>
                    <CardTitle>Compte en attente d'approbation</CardTitle>
                </CardHeader>
                <CardContent>
                    <p>Votre compte instructeur est en cours de révision par notre équipe. Vous recevrez une notification par e-mail une fois qu'il sera approuvé.</p>
                    <p className="mt-4 text-sm text-muted-foreground">En attendant, vous pouvez utiliser le mode étudiant.</p>
                </CardContent>
            </Card>
        </div>
    )
}

function AdminAccessRequiredScreen() {
    const router = useRouter();
    return (
        <div className="flex flex-col items-center justify-center h-full text-center p-4">
             <ShieldAlert className="w-16 h-16 text-destructive mb-4" />
            <h1 className="text-2xl font-bold">Accès Interdit</h1>
            <p className="text-muted-foreground">Vous n'avez pas les autorisations nécessaires pour accéder à cette page.</p>
            <Button onClick={() => router.push('/dashboard')} className="mt-6">
                Retour au tableau de bord
            </Button>
        </div>
    )
}

const BottomNavItem = ({ href, icon: Icon, label, isActive, unreadCount }: { href: string; icon: React.ElementType; label: string; isActive: boolean; unreadCount?: number }) => (
    <Link href={href} className="flex flex-col items-center justify-center flex-1 gap-1 p-1 relative">
        <Icon className={cn("h-5 w-5", isActive ? 'text-primary' : 'text-slate-500')} strokeWidth={isActive ? 2.5 : 2} />
        <span className={cn("text-xs", isActive ? 'font-bold text-primary' : 'text-slate-600')}>{label}</span>
        {unreadCount !== undefined && unreadCount > 0 && (
            <span className="absolute top-1 right-3.5 h-4 min-w-[1rem] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">{unreadCount}</span>
        )}
    </Link>
);

const BOTTOM_NAV_ROUTES = ['/dashboard', '/search', '/mes-formations', '/liste-de-souhaits', '/account'];

const BottomNavBar = () => {
    const pathname = usePathname();
    const { user } = useRole();
    const { t } = useTranslation();
    const [unreadMessages, setUnreadMessages] = useState(0);
    const db = getFirestore();

    useEffect(() => {
        if (!user?.uid) return;
        const q = query(collection(db, 'chats'), where('unreadBy', 'array-contains', user.uid));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setUnreadMessages(snapshot.size);
        });
        return () => unsubscribe();
    }, [user, db]);
    
    if (!BOTTOM_NAV_ROUTES.includes(pathname)) {
        return null;
    }

    const items = [
        { href: '/dashboard', icon: Star, label: t('navSelection') },
        { href: '/search', icon: Search, label: t('navSearch') },
        { href: '/mes-formations', icon: Play, label: t('navMyLearning') },
        { href: '/liste-de-souhaits', icon: Heart, label: t('navWishlist') },
        { href: '/account', icon: User, label: t('navAccount') },
    ];

    return (
        <div className="fixed bottom-0 left-0 right-0 h-16 bg-background/80 backdrop-blur-sm border-t border-slate-200/80 flex md:hidden z-40">
            {items.map(item => (
                <BottomNavItem key={item.href} {...item} isActive={pathname === item.href} />
            ))}
        </div>
    );
};

const useUnreadNotifications = (userId?: string) => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [hasUnread, setHasUnread] = useState(false);
    const db = getFirestore();

    useEffect(() => {
        if (!userId) {
            setHasUnread(false);
            setNotifications([]);
            return;
        }

        const q = query(
          collection(db, `users/${userId}/notifications`),
          orderBy('createdAt', 'desc'),
          limit(10)
        );
        
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedNotifs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Notification);
            setNotifications(fetchedNotifs);
            setHasUnread(fetchedNotifs.some(n => !n.read));
        }, (error) => {
            console.error("Failed to listen for notifications:", error);
        });

        return () => unsubscribe();
    }, [userId, db]);

    const markAllAsRead = async () => {
      if (!userId || notifications.length === 0) return;
      const unreadNotifs = notifications.filter(n => !n.read);
      if (unreadNotifs.length === 0) return;
      const batch = writeBatch(db);
      unreadNotifs.forEach(notif => {
        batch.update(doc(db, `users/${userId}/notifications`, notif.id), { read: true });
      });
      await batch.commit();
    };

    return { notifications, hasUnread, markAllAsRead };
};


const AnnouncementBanner = () => {
    const { t } = useTranslation();
    const [message, setMessage] = useState('');
    const [isVisible, setIsVisible] = useState(false);
    const db = getFirestore();
    const pathname = usePathname();
    const isChatPage = pathname.startsWith('/messages/');

    useEffect(() => {
        const fetchSettings = async () => {
            const settingsRef = doc(db, 'settings', 'global');
            const docSnap = await getDoc(settingsRef);
            if (docSnap.exists()) {
                const announcementMessage = docSnap.data().platform?.announcementMessage;
                if (announcementMessage) {
                    const dismissed = sessionStorage.getItem(`announcement_${announcementMessage}`);
                    if (!dismissed) {
                        setMessage(announcementMessage);
                        setIsVisible(true);
                    }
                } else {
                  const launchOffer = t('launchOffer');
                   const dismissed = sessionStorage.getItem(`announcement_${launchOffer}`);
                   if (!dismissed) {
                       setMessage(launchOffer);
                       setIsVisible(true);
                   } else {
                        setIsVisible(false);
                   }
                }
            } else {
                const launchOffer = t('launchOffer');
                const dismissed = sessionStorage.getItem(`announcement_${launchOffer}`);
                if (!dismissed) {
                    setMessage(launchOffer);
                    setIsVisible(true);
                }
            }
        };
        fetchSettings();
    }, [db, pathname, t]);
    
    const handleDismiss = () => {
        setIsVisible(false);
        sessionStorage.setItem(`announcement_${message}`, 'true');
    };

    if (!isVisible || !message || isChatPage) {
        return null;
    }

    return (
        <div className="bg-primary text-primary-foreground px-4 py-2 flex items-center gap-4 text-sm font-medium relative overflow-hidden">
            <Megaphone className="h-5 w-5 flex-shrink-0" />
            <div className="flex-1 overflow-hidden">
                <span className="inline-block animate-marquee-fast pr-8 whitespace-nowrap">{message}</span>
                <span className="inline-block animate-marquee-fast pr-8 whitespace-nowrap">{message}</span>
            </div>
            <Button variant="ghost" size="icon" onClick={handleDismiss} className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 hover:bg-primary/50">
                <X className="h-4 w-4"/>
            </Button>
        </div>
    );
};

const WhatsAppIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M12.04 2.01C6.58 2.01 2.13 6.46 2.13 12.02c0 1.76.46 3.45 1.32 4.94L2.05 22l5.3-1.4c1.42.82 3.02 1.28 4.69 1.28h.01c5.46 0 9.91-4.45 9.91-9.91s-4.45-9.9-9.91-9.9zM12.04 20.2c-1.45 0-2.84-.38-4.06-1.08l-.3-.18-3.03.8.82-2.96-.2-.32a8.03 8.03 0 01-1.23-4.45c0-4.43 3.6-8.03 8.03-8.03s8.03 3.6 8.03 8.03-3.6 8.02-8.03 8.02zm4.45-6.21c-.24-.12-1.42-.7-1.64-.78-.22-.08-.38-.12-.54.12-.16.24-.62.78-.76.94-.14.16-.28.18-.52.06-.24-.12-1.02-.38-1.94-1.2-1.25-.87-1.57-1.6-1.61-1.72-.04-.12 0-.18.11-.3.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.3-.74-1.78-.2-.48-.4-.42-.54-.42h-.47c-.16 0-.42.06-.64.3.22.24-.88.85-.88,2.07s.9,2.4,1.02,2.56c.12.16,1.78,2.73,4.31,3.8.59.25,1.05.4,1.41.52.6.2,1.14.16,1.56.1.48-.07,1.42-.58,1.62-1.14.2-.56.2-1.04.14-1.14-.06-.1-.22-.16-.46-.28z"></path>
    </svg>
);

const SupportButton = () => {
    const { user, formaAfriqueUser } = useRole();
    const [supportInfo, setSupportInfo] = useState({ email: 'support@formaafrique.com', phone: '+237600000000' });
    const pathname = usePathname();
    const db = getFirestore();
    
    const isAuthPage = pathname === '/login' || pathname === '/register' || pathname === '/';
    const isInsideChat = pathname.startsWith('/messages/');

    useEffect(() => {
        const settingsRef = doc(db, 'settings', 'global');
        const unsub = onSnapshot(settingsRef, (doc) => {
            if (doc.exists()) {
                const data = doc.data();
                setSupportInfo(prev => ({
                    email: data.general?.contactEmail || prev.email,
                    phone: data.general?.supportPhone || prev.phone,
                }));
            }
        });
        return () => unsub();
    }, [db]);

    if (!user && !isAuthPage || isInsideChat) {
        return null;
    }
    
    let internalSupportHref = '/questions-reponses';
    if (formaAfriqueUser?.role === 'admin') {
      internalSupportHref = '/admin/support';
    } else if (!user) {
      internalSupportHref = 'mailto:' + supportInfo.email;
    }

    return (
        <Popover>
            <PopoverTrigger asChild>
                 <Button
                    className="fixed bottom-24 md:bottom-6 right-6 h-16 w-16 rounded-full shadow-lg z-50 flex items-center justify-center bg-green-500 hover:bg-green-600 text-white"
                    aria-label="Support"
                >
                    <HelpCircle className="h-8 w-8" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 mr-4 mb-2 dark:bg-slate-800 dark:border-slate-700">
                <div className="grid gap-4">
                    <div className="space-y-2">
                        <h4 className="font-medium leading-none dark:text-white">Contactez le Support</h4>
                        <p className="text-sm text-muted-foreground">Choisissez votre méthode de contact préférée.</p>
                    </div>
                    <div className="grid gap-2">
                        <Button asChild variant="outline" className="justify-start dark:hover:bg-slate-700">
                           <Link href={internalSupportHref}>
                             <MessageSquare className="mr-2 h-4 w-4" /> Discuter sur le site
                           </Link>
                        </Button>
                         <Button asChild variant="outline" className="justify-start dark:hover:bg-slate-700">
                           <a href={`https://wa.me/${supportInfo.phone}`} target="_blank" rel="noopener noreferrer">
                             <WhatsAppIcon className="mr-2 h-4 w-4" /> WhatsApp
                           </a>
                        </Button>
                         <Button asChild variant="outline" className="justify-start dark:hover:bg-slate-700">
                           <a href={`mailto:${supportInfo.email}`}>
                             <Mail className="mr-2 h-4 w-4" /> E-mail
                           </a>
                        </Button>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
};

const Header = () => {
    return (
        <div className="flex items-center gap-4 w-full">
            <div className="w-full flex-1">
                {/* Search can be added back here if needed */}
            </div>
            <LanguageSelector />
            <HeaderNotificationButton />
            <UserNav />
        </div>
    );
}

const HeaderNotificationButton = () => {
  const router = useRouter();
  const isMobile = useIsMobile();
  const { user } = useRole();
  const { notifications, hasUnread, markAllAsRead } = useUnreadNotifications(user?.uid);
  
  if (isMobile) {
    return (
      <Button variant="ghost" size="icon" onClick={() => router.push('/notifications')} className="relative text-card-foreground">
        <Bell className="h-4 w-4" />
        {hasUnread && (
          <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
          </span>
        )}
        <span className="sr-only">Notifications</span>
      </Button>
    )
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative text-foreground dark:text-white">
          <Bell className="h-5 w-5" />
          {hasUnread && (
            <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
            </span>
          )}
          <span className="sr-only">Notifications</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
          <Card className="border-0 dark:bg-slate-800 dark:border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between pb-2 dark:border-b dark:border-slate-700">
                <CardTitle className="text-base font-semibold dark:text-white">Notifications</CardTitle>
                <Button variant="ghost" size="sm" onClick={markAllAsRead} disabled={!hasUnread} className="dark:text-slate-300 dark:hover:bg-slate-700">Marquer comme lu</Button>
            </CardHeader>
            <CardContent className="p-2">
              {notifications.length > 0 ? (
                <div className="space-y-1">
                  {notifications.map(n => <NotificationItem key={n.id} notif={n} />)}
                </div>
              ) : (
                <p className="text-sm text-center text-muted-foreground py-8">Aucune notification.</p>
              )}
            </CardContent>
          </Card>
      </PopoverContent>
    </Popover>
  );
};


export function AppShell({ children }: { children: React.ReactNode }) {
  const { role, loading: isRoleLoading, user, isUserLoading, formaAfriqueUser, switchRole } = useRole();
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const [siteSettings, setSiteSettings] = useState({ siteName: 'FormaAfrique', logoUrl: '/icon.svg', maintenanceMode: false });
  const db = getFirestore();
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  
  const isAuthPage = pathname === '/login' || pathname === '/register' || pathname === '/forgot-password';
  const isLandingPage = pathname === '/';
  const isAdminPage = pathname.startsWith('/admin');

  useEffect(() => {
    const settingsRef = doc(db, 'settings', 'global');
    const unsubscribe = onSnapshot(settingsRef, (docSnap) => {
        if (docSnap.exists()) {
            const settingsData = docSnap.data();
            setSiteSettings({
                siteName: settingsData.general?.siteName || 'FormaAfrique',
                logoUrl: settingsData.general?.logoUrl || '/icon.svg',
                maintenanceMode: settingsData.platform?.maintenanceMode || false,
            });
        }
    });
    return () => unsubscribe();
  }, [db]);
  
  if (isLandingPage || isAuthPage) {
    return <>{children}</>;
  }

  if (isUserLoading || isRoleLoading) {
    return (
        <div className="flex h-screen w-full items-center justify-center bg-background dark:bg-[#0f172a]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    );
  }

  if (siteSettings.maintenanceMode && formaAfriqueUser?.role !== 'admin') {
    return <MaintenancePage />;
  }
  
  if (!user) {
    return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }
  
  const handleSidebarLinkClick = () => {
    if (isMobile) {
      setIsSheetOpen(false);
    }
  };

  const renderSidebar = () => {
    const props = { siteName: siteSettings.siteName, logoUrl: siteSettings.logoUrl, onLinkClick: handleSidebarLinkClick };
    if (role === 'student') return <StudentSidebar {...props} />;
    if (role === 'instructor') return <InstructorSidebar {...props} />;
    return null;
  };
  
  const isFullScreenPage = pathname.startsWith('/courses/');
  const isChatPage = pathname.startsWith('/messages');
  const isInstructorDashboard = role === 'instructor';
  
  if (isAdminPage) {
    return <div className={cn(isMobile ? '' : 'tv:text-base text-sm')}>{children}</div>;
  }
  
  if (isMobile && pathname.startsWith('/messages/')) {
    return <main className="h-screen w-screen">{children}</main>;
  }

  const showHeader = !isChatPage && !isFullScreenPage;
  const pageTitleKey = getPageTitleKey(pathname);

  return (
    <div className={cn(isMobile ? '' : 'tv:text-base text-sm')}>
      <OnboardingGuide />
      <div className={cn('flex flex-col min-h-screen', isInstructorDashboard ? 'dark bg-background' : 'bg-background' )}>
        <AnnouncementBanner />
          <div className="flex flex-1">
              <aside className={cn("hidden md:flex md:flex-col h-screen sticky top-0", isFullScreenPage && "md:hidden")}>
                {renderSidebar()}
              </aside>
              <div className={cn("flex flex-col flex-1", isChatPage && !isMobile && "overflow-hidden")}>
                 {showHeader && (
                  <header className={cn(
                      "flex h-14 items-center gap-4 border-b px-4 lg:h-[60px] lg:px-6 sticky top-0 z-30",
                      isInstructorDashboard ? 'bg-[#1e293b] border-slate-700' : 'bg-card border-border'
                  )}>
                      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                        <SheetTrigger asChild>
                          <Button variant="ghost" size="icon" className={cn("shrink-0 md:hidden", isFullScreenPage && "hidden", isInstructorDashboard ? 'text-white' : 'text-foreground')}>
                            <PanelLeft />
                            <span className="sr-only">Toggle Menu</span>
                          </Button>
                        </SheetTrigger>
                        <SheetContent side="left" className={cn("p-0 w-64", isInstructorDashboard && 'bg-[#1e293b] border-r-slate-700')}>
                           <SheetHeader>
                            <SheetTitle className="sr-only">Menu principal</SheetTitle>
                            <SheetDescription className="sr-only">Navigation pour le profil utilisateur.</SheetDescription>
                          </SheetHeader>
                          {renderSidebar()}
                        </SheetContent>
                      </Sheet>
                      <div className="flex-1 overflow-hidden">
                          <h1 className={cn("text-lg font-semibold md:text-xl truncate", isInstructorDashboard ? 'text-white' : 'text-card-foreground')}>
                              {t(pageTitleKey)}
                          </h1>
                      </div>
                      <Header />
                  </header>
                )}
                
                <main className={cn("flex-1 overflow-y-auto", 
                  isChatPage && !isMobile ? "" : "p-4 sm:p-6", 
                  isMobile ? "pb-20" : "")
                }>
                    <div className={cn(!isFullScreenPage && "w-full", isChatPage && !isMobile ? "h-full" : "")}>
                      {children}
                    </div>
                </main>
                {isMobile && <BottomNavBar />}
                {!isFullScreenPage && !isChatPage && (
                  <>
                    <SupportButton />
                  </>
                )}
              </div>
          </div>
      </div>
    </div>
  );
}
