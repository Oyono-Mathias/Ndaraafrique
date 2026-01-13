
'use client';

import { Bell, Search } from 'lucide-react';
import { Button } from '../ui/button';
import { LanguageSelector } from './language-selector';
import { UserNav } from './user-nav';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { useRouter } from 'next/navigation';
import { useIsMobile } from '@/hooks/use-mobile';
import { useRole } from '@/context/RoleContext';
import React, { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, getFirestore, writeBatch, doc, limit, orderBy, Timestamp } from 'firebase/firestore';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { CheckCircle, ShieldAlert } from 'lucide-react';

interface Notification {
  id: string;
  text: string;
  createdAt: Timestamp;
  read: boolean;
  link?: string;
  type?: 'success' | 'info' | 'reminder' | 'alert';
}

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

const HeaderNotificationButton = () => {
  const router = useRouter();
  const isMobile = useIsMobile();
  const { user } = useRole();
  const { notifications, hasUnread, markAllAsRead } = useUnreadNotifications(user?.uid);
  
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
          <Card className="border-0 bg-slate-800 border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-slate-700">
                <CardTitle className="text-base font-semibold text-white">Notifications</CardTitle>
                <Button variant="ghost" size="sm" onClick={markAllAsRead} disabled={!hasUnread} className="text-slate-300 hover:bg-slate-700">Marquer comme lu</Button>
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

export function Header() {
    return (
        <div className="flex w-full items-center gap-2">
            <div className="flex-1" />
            <LanguageSelector />
            <HeaderNotificationButton />
            <UserNav />
        </div>
    );
}
