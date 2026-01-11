
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
} from 'firebase/firestore';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { BellRing, Bell, CheckCircle, Gift, ShieldAlert } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';

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
        case 'reminder': return <Gift className="h-5 w-5 text-orange-500" />;
        default: return <Bell className="h-5 w-5 text-blue-500" />;
    }
}

export default function NotificationsPage() {
  const { user, isUserLoading } = useRole();
  const db = getFirestore();
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

    await batch.commit();
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-3">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-4/5" />
                <Skeleton className="h-3 w-1/4" />
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (notifications.length === 0) {
      return (
        <div className="text-center py-16 text-muted-foreground">
          <BellRing className="mx-auto h-12 w-12 mb-4" />
          <h3 className="font-semibold text-lg">Aucune notification</h3>
          <p>Les nouvelles notifications apparaîtront ici.</p>
        </div>
      );
    }

    return (
      <div className="space-y-1">
        {notifications.map((notif) => {
          const content = (
            <div
              className={cn(
                "flex items-start gap-4 p-3 rounded-lg transition-colors",
                notif.link ? 'hover:bg-muted/50' : 'cursor-default',
                !notif.read && "bg-primary/5 dark:bg-primary/10"
              )}
            >
              <div className="p-2 mt-1 bg-muted rounded-full">
                <NotificationIcon type={notif.type} />
              </div>
              <div className="flex-1">
                <p className={cn("text-sm line-clamp-3", !notif.read && "font-semibold text-foreground dark:text-white")}>
                  {notif.text}
                </p>
                <p className="text-xs text-muted-foreground dark:text-slate-400">
                  {notif.createdAt
                    ? formatDistanceToNow(notif.createdAt.toDate(), {
                        locale: fr,
                        addSuffix: true,
                      })
                    : ''}
                </p>
              </div>
              {!notif.read && (
                <div className="h-2.5 w-2.5 rounded-full bg-primary self-center"></div>
              )}
            </div>
          );

          return notif.link ? (
            <Link href={notif.link} key={notif.id}>
              {content}
            </Link>
          ) : (
            <div key={notif.id}>{content}</div>
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
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="dark:text-white">Boîte de réception</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={markAllAsRead}
            disabled={notifications.every((n) => n.read)}
            className="dark:text-slate-300 dark:hover:bg-slate-700"
          >
            Tout marquer comme lu
          </Button>
        </CardHeader>
        <CardContent>{renderContent()}</CardContent>
      </Card>
    </div>
  );
}
