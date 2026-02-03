'use client';

import { Bell, Search, CheckCircle, ShieldAlert, Info } from 'lucide-react';
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
        default: return <Info className="h-5 w-5 text-blue-500" />;
    }
}

const NotificationItem = ({ notif, onClick }: { notif: Notification, onClick: (notif: Notification) => void }) => {
  // ✅ Sécurisation de la date Firestore
  const notifDate = (notif.createdAt as any)?.toDate?.() || new Date();
  
  const content = (
    <div className="flex items-start gap-4 p-3 rounded-lg transition-colors hover:bg-slate-800/50 cursor-pointer group">
      <div className={cn(
          "p-2 rounded-lg border",
          notif.read ? "bg-slate-900 border-slate-800" : "bg-primary/10 border-primary/20"
      )}>
          <NotificationIcon type={notif.type} />
      </div>
       <div className="flex-1 min-w-0">
          <p className={cn("text-xs leading-snug", !notif.read ? "font-bold text-white" : "text-slate-400")}>
            {notif.text}
          </p>
          <p className="text-[10px] text-slate-500 mt-1">
            {formatDistanceToNow(notifDate, { locale: fr, addSuffix: true })}
          </p>
       </div>
       {!notif.read && <div className="h-2 w-2 rounded-full bg-primary self-center shrink-0"></div>}
    </div>
  );

  return <button onClick={() => onClick(notif)} className="w-full text-left">{content}</button>;
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
      <Button variant="ghost" size="icon" onClick={() => router.push('/student/notifications')} className="relative text-white">
        <Bell className="h-5 w-5" />
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
        <Button variant="ghost" size="icon" className="relative text-white hover:bg-slate-800">
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
      <PopoverContent className="w-85 p-0" align="end">
          <Card className="border-0 dark:bg-slate-900 dark:border-slate-800 shadow-2xl">
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-slate-800">
                <CardTitle className="text-sm font-bold text-white">Notifications</CardTitle>
                <Button variant="ghost" size="sm" onClick={markAllAsRead} disabled={!hasUnread} className="h-7 text-[10px] uppercase tracking-wider font-bold dark:text-slate-400 dark:hover:bg-slate-800">Tout lire</Button>
            </CardHeader>
            <CardContent className="p-2 max-h-[400px] overflow-y-auto custom-scrollbar">
              {notifications.length > 0 ? (
                <div className="space-y-1">
                  {notifications.map(n => <NotificationItem key={n.id} notif={n} onClick={handleNotificationClick} />)}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-slate-500">
                    <Bell className="h-8 w-8 mb-2 opacity-20"/>
                    <p className="text-xs">Aucune notification pour le moment.</p>
                </div>
              )}
            </CardContent>
             <CardFooter className="border-t border-slate-800 p-2">
                <Button variant="ghost" size="sm" asChild className="w-full text-xs font-bold text-primary hover:text-primary hover:bg-primary/5">
                    <Link href="/student/notifications">Voir tout l'historique</Link>
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
            <Button variant="ghost" size="icon" onClick={() => router.push('/search')} className="text-white hover:bg-slate-800">
                <Search className="h-5 w-5" />
            </Button>
            <HeaderNotificationButton />
            <UserNav />
        </div>
    );
}
