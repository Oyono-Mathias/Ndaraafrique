
'use client';

import { useState, useEffect } from 'react';
import { useRole } from '@/context/RoleContext';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  getFirestore,
  writeBatch,
  doc,
  limit,
  Timestamp,
  updateDoc,
} from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { BellRing, Bell, CheckCircle, Gift, ShieldAlert } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import type { Notification } from '@/lib/types';

const NotificationIcon = ({ type }: { type: Notification['type'] }) => {
    switch (type) {
        case 'success': return <CheckCircle className="h-5 w-5 text-green-500" />;
        case 'alert': return <ShieldAlert className="h-5 w-5 text-red-500" />;
        case 'reminder': return <Gift className="h-5 w-5 text-orange-500" />;
        default: return <Bell className="h-5 w-5 text-blue-500" />;
    }
}

export default function NotificationsPage() {
  const { user, isUserLoading } = useRole();
  const db = getFirestore();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      if (!isUserLoading) setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const notifsQuery = query(
      collection(db, `users/${user.uid}/notifications`),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(
      notifsQuery,
      (snapshot) => {
        const fetchedNotifs = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Notification[];
        setNotifications(fetchedNotifs);
        setIsLoading(false);
      },
      (error) => {
        console.error("Error fetching notifications:", error);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user, isUserLoading, db]);

  const markAllAsRead = async () => {
    if (!user || notifications.length === 0) return;

    const unreadNotifs = notifications.filter((n) => !n.read);
    if (unreadNotifs.length === 0) return;

    const batch = writeBatch(db);
    unreadNotifs.forEach((notif) => {
      const notifRef = doc(db, `users/${user.uid}/notifications`, notif.id);
      batch.update(notifRef, { read: true });
    });

    try {
        await batch.commit();
    } catch (error) {
        console.error("Error marking notifications as read:", error);
    }
  };

  const markAsRead = async (notificationId: string) => {
    if (!user) return;
    const notifRef = doc(db, `users/${user.uid}/notifications`, notificationId);
    try {
        await updateDoc(notifRef, { read: true });
    } catch (error) {
        console.error("Error marking notification as read:", error);
    }
  };

  const handleNotificationClick = (notif: Notification) => {
    // Mark as read in the background without waiting
    if (!notif.read) {
        markAsRead(notif.id);
    }
    // Immediately redirect if there's a link
    if (notif.link) {
        router.push(notif.link);
    }
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="space-y-3 p-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-3">
              <Skeleton className="h-10 w-10 rounded-full bg-slate-700" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-4/5 bg-slate-700" />
                <Skeleton className="h-3 w-1/4 bg-slate-700" />
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (notifications.length === 0) {
      return (
        <div className="text-center py-20 text-muted-foreground dark:text-slate-500">
          <BellRing className="mx-auto h-12 w-12 mb-4" />
          <h3 className="font-semibold text-lg text-slate-300">Aucune notification pour le moment</h3>
          <p className="text-sm">Les nouvelles alertes et informations apparaîtront ici.</p>
        </div>
      );
    }

    return (
      <div className="space-y-1">
        {notifications.map((notif) => {
          const WrapperComponent = notif.link ? 'button' : 'div';
          return (
            <WrapperComponent
              key={notif.id}
              onClick={() => handleNotificationClick(notif)}
              className={cn(
                "w-full text-left flex items-start gap-4 p-4 rounded-lg transition-colors",
                notif.link && 'hover:bg-slate-800/50 cursor-pointer',
                !notif.read && "bg-primary/10"
              )}
            >
              <div className="p-1 mt-1">
                <NotificationIcon type={notif.type} />
              </div>
              <div className="flex-1">
                <p className={cn("text-sm line-clamp-3", !notif.read && "font-semibold text-white")}>
                  {notif.text}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  {notif.createdAt
                    ? formatDistanceToNow(notif.createdAt.toDate(), {
                        locale: fr,
                        addSuffix: true,
                      })
                    : ''}
                </p>
              </div>
              {!notif.read && (
                <div className="h-2.5 w-2.5 rounded-full bg-primary self-center shrink-0"></div>
              )}
            </WrapperComponent>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold dark:text-white">Notifications</h1>
        <p className="text-muted-foreground dark:text-slate-400">
          Restez informé des dernières activités.
        </p>
      </header>

      <Card className="dark:bg-slate-800 dark:border-slate-700">
        <CardHeader className="flex flex-row items-center justify-between border-b dark:border-slate-700/80">
          <CardTitle className="dark:text-white">Boîte de réception</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={markAllAsRead}
            disabled={notifications.every((n) => n.read) || isLoading}
            className="dark:text-slate-300 dark:hover:bg-slate-700"
          >
            Tout marquer comme lu
          </Button>
        </CardHeader>
        <CardContent className="p-2">{renderContent()}</CardContent>
      </Card>
    </div>
  );
}
