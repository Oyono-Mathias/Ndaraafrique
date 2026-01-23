
'use client';

import { Bell, Search, CheckCircle, ShieldAlert } from 'lucide-react';
import { Button } from '../ui/button';
import { UserNav } from './user-nav';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { useRouter } from 'next-intl/navigation';
import { Link } from 'next-intl';
import { useIsMobile } from '@/hooks/use-mobile';
import { useRole } from '@/context/RoleContext';
import React, { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, getFirestore, writeBatch, doc, limit, orderBy, Timestamp, updateDoc } from 'firebase/firestore';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../ui/card';
import type { Notification } from '@/lib/types';


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
        default: return <Bell className="h-5 w-5 text-blue-500" />;
    }
}

const NotificationItem = ({ notif, onClick }: { notif: Notification, onClick: (notif: Notification) => void }) => {
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
      <Button variant="ghost" size="icon" onClick={() => router.push('/notifications')} className="relative text-foreground">
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
        <Button variant="ghost" size="icon" className="relative text-foreground">
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
            <CardHeader className="flex flex-row items-center justify-between pb-2 border-b dark:border-slate-700">
                <CardTitle className="text-base font-semibold text-white">Notifications</CardTitle>
                <Button variant="ghost" size="sm" onClick={markAllAsRead} disabled={!hasUnread} className="dark:text-slate-300 dark:hover:bg-slate-700">Marquer comme lu</Button>
            </CardHeader>
            <CardContent className="p-2 max-h-96 overflow-y-auto">
              {notifications.length > 0 ? (
                <div className="space-y-1">
                  {notifications.map(n => <NotificationItem key={n.id} notif={n} onClick={handleNotificationClick} />)}
                </div>
              ) : (
                <p className="text-sm text-center text-muted-foreground py-8">Aucune notification.</p>
              )}
            </CardContent>
             <CardFooter className="border-t border-slate-700 p-2">
                <Button variant="link" size="sm" asChild className="w-full">
                    <Link href="/notifications">Voir toutes les notifications</Link>
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
        <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => router.push('/search')} className="text-foreground">
                <Search className="h-5 w-5" />
            </Button>
            <HeaderNotificationButton />
            <UserNav />
        </div>
    );
}
