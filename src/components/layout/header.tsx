'use client';

import { Bell, Search, CheckCircle, ShieldAlert, Info, Clock, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UserNav } from '@/components/layout/user-nav';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useRouter } from 'next/navigation';
import { useIsMobile } from '@/hooks/use-mobile';
import { useRole } from '@/context/RoleContext';
import React, { useEffect, useState } from 'react';
import { collection, query, onSnapshot, getFirestore, writeBatch, doc, limit, orderBy, updateDoc } from 'firebase/firestore';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import type { Notification } from '@/lib/types';
import Link from 'next/link';

/**
 * Hook personnalisé pour écouter les notifications non lues.
 */
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

const NotificationIcon = ({ type }: { type: Notification['type'] }) => {
    switch (type) {
        case 'success': return <CheckCircle className="h-5 w-5 text-green-500" />;
        case 'alert': return <ShieldAlert className="h-5 w-5 text-red-500" />;
        case 'reminder': return <Clock className="h-5 w-5 text-amber-500" />;
        default: return <Info className="h-5 w-5 text-blue-500" />;
    }
}

const NotificationItem = ({ notif, onClick }: { notif: Notification, onClick: (notif: Notification) => void }) => {
  const notifDate = (notif.createdAt as any)?.toDate?.() || new Date();
  
  return (
    <button 
        onClick={() => onClick(notif)} 
        className={cn(
            "w-full text-left p-3 rounded-xl transition-all border border-transparent flex items-start gap-4 active:scale-95 group",
            notif.read ? "opacity-60 grayscale-[0.5]" : "bg-primary/5 hover:bg-primary/10 border-primary/10"
        )}
    >
      <div className={cn(
          "p-2.5 rounded-xl border shrink-0",
          notif.read ? "bg-slate-900 border-slate-800" : "bg-primary/20 border-primary/30"
      )}>
          <NotificationIcon type={notif.type} />
      </div>
       <div className="flex-1 min-w-0">
          <p className={cn(
              "text-[13px] leading-snug", 
              !notif.read ? "font-black text-white" : "text-slate-400 font-medium"
          )}>
            {notif.text}
          </p>
          <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-1.5 flex items-center gap-1.5">
            <Clock className="h-2.5 w-2.5" />
            {formatDistanceToNow(notifDate, { locale: fr, addSuffix: true })}
          </p>
       </div>
       {!notif.read && <div className="h-2 w-2 rounded-full bg-primary mt-2 shadow-[0_0_10px_hsl(var(--primary))]"></div>}
    </button>
  );
}

const HeaderNotificationButton = () => {
  const router = useRouter();
  const isMobile = useIsMobile();
  const { user } = useRole();
  const db = getFirestore();
  const { notifications, hasUnread, markAllAsRead } = useUnreadNotifications(user?.uid);
  
  const handleNotificationClick = async (notif: Notification) => {
    if (!user) return;
    if (!notif.read) {
        const notifRef = doc(db, `users/${user.uid}/notifications`, notif.id);
        await updateDoc(notifRef, { read: true });
    }
    if (notif.link) {
        router.push(notif.link);
    }
  };
  
  if (isMobile) {
    return (
      <Button variant="ghost" size="icon" onClick={() => router.push('/student/notifications')} className="relative text-white h-10 w-10 rounded-full">
        <Bell className="h-5 w-5" />
        {hasUnread && (
          <span className="absolute top-2 right-2 flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500 border-2 border-slate-900"></span>
          </span>
        )}
        <span className="sr-only">Notifications</span>
      </Button>
    )
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative text-white hover:bg-slate-800 h-10 w-10 rounded-full transition-all active:scale-90">
          <Bell className="h-5 w-5" />
          {hasUnread && (
            <span className="absolute top-2 right-2 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500 border-2 border-slate-900"></span>
            </span>
          )}
          <span className="sr-only">Notifications</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 mr-4" align="end" sideOffset={12}>
          <Card className="border-slate-800 dark:bg-slate-950 shadow-2xl rounded-2xl overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between p-4 border-b border-white/5 bg-slate-900/50">
                <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-400">Notifications</CardTitle>
                <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={markAllAsRead} 
                    disabled={!hasUnread} 
                    className="h-7 text-[10px] uppercase tracking-widest font-black text-primary hover:bg-primary/10"
                >
                    Tout lire
                </Button>
            </CardHeader>
            <CardContent className="p-2 max-h-[400px] overflow-y-auto custom-scrollbar space-y-1">
              {notifications.length > 0 ? (
                notifications.map(n => <NotificationItem key={n.id} notif={n} onClick={handleNotificationClick} />)
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-slate-600 opacity-30">
                    <Bell className="h-10 w-10 mb-2"/>
                    <p className="text-[10px] font-black uppercase tracking-widest">Silence radio</p>
                </div>
              )}
            </CardContent>
             <CardFooter className="border-t border-white/5 p-2 bg-slate-900/30">
                <Button variant="ghost" size="sm" asChild className="w-full text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary/5">
                    <Link href="/student/notifications">Voir l'historique complet</Link>
                </Button>
            </CardFooter>
          </Card>
      </PopoverContent>
    </Popover>
  );
};

export function Header() {
    const router = useRouter();
    return (
        <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => router.push('/search')} className="text-white hover:bg-slate-800 h-10 w-10 rounded-full transition-all active:scale-90">
                <Search className="h-5 w-5" />
            </Button>
            <HeaderNotificationButton />
            <div className="h-8 w-px bg-white/5 mx-1"></div>
            <UserNav />
        </div>
    );
}
