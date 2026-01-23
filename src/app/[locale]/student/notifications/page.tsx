
'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next-intl/navigation';
import { useCollection } from '@/firebase';
import { getFirestore, collection, query, orderBy, writeBatch, doc, updateDoc } from 'firebase/firestore';
import { useRole } from '@/context/RoleContext';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Bell, Check, CheckCircle, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Notification } from '@/lib/types';

const NotificationIcon = ({ type }: { type: Notification['type'] }) => {
    switch (type) {
        case 'success': return <CheckCircle className="h-5 w-5 text-green-500" />;
        case 'alert': return <ShieldAlert className="h-5 w-5 text-red-500" />;
        default: return <Bell className="h-5 w-5 text-blue-500" />;
    }
}

export default function NotificationsPage() {
  const db = getFirestore();
  const router = useRouter();
  const { currentUser } = useRole();

  const notificationsQuery = useMemo(
    () => currentUser ? query(collection(db, `users/${currentUser.uid}/notifications`), orderBy('createdAt', 'desc')) : null,
    [db, currentUser]
  );
  const { data: notifications, isLoading } = useCollection<Notification>(notificationsQuery);
  
  const hasUnread = useMemo(() => notifications?.some(n => !n.read), [notifications]);

  const handleMarkAllAsRead = async () => {
    if (!currentUser || !notifications) return;
    const unreadNotifs = notifications.filter(n => !n.read);
    if (unreadNotifs.length === 0) return;
    const batch = writeBatch(db);
    unreadNotifs.forEach(notif => {
        batch.update(doc(db, `users/${currentUser.uid}/notifications`, notif.id), { read: true });
    });
    await batch.commit();
  }

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.read && currentUser) {
        const notifRef = doc(db, `users/${currentUser.uid}/notifications`, notification.id);
        await updateDoc(notifRef, { read: true });
    }
    if (notification.link) {
        router.push(notification.link);
    }
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <header>
        <h1 className="text-3xl font-bold text-white">Notifications</h1>
        <p className="text-muted-foreground">Toutes vos alertes et mises à jour importantes.</p>
      </header>

      <Card className="dark:bg-slate-800/50 dark:border-slate-700/80">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-white">Vos notifications</CardTitle>
          <Button variant="ghost" size="sm" onClick={handleMarkAllAsRead} disabled={!hasUnread}>
            <Check className="mr-2 h-4 w-4"/>
            Tout marquer comme lu
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {isLoading ? (
              [...Array(5)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)
            ) : notifications && notifications.length > 0 ? (
              notifications.map(notif => (
                <button
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={cn(
                    "w-full text-left p-4 rounded-lg flex items-start gap-4 transition-all duration-200 hover:-translate-y-0.5",
                    notif.read ? "hover:bg-slate-800/50" : "bg-primary/10 hover:bg-primary/20 border border-primary/20"
                  )}
                >
                    <div className="p-1 mt-1">
                        <NotificationIcon type={notif.type} />
                    </div>
                    <div className="flex-1">
                        <p className={cn("text-sm", !notif.read ? "font-bold text-white" : "text-slate-300")}>{notif.text}</p>
                        <p className="text-xs text-slate-400 mt-1">{notif.createdAt ? formatDistanceToNow(notif.createdAt.toDate(), { locale: fr, addSuffix: true }) : ''}</p>
                    </div>
                    {!notif.read && <div className="h-2.5 w-2.5 rounded-full bg-primary self-center"></div>}
                </button>
              ))
            ) : (
                <div className="text-center py-20 text-muted-foreground">
                    <Bell className="mx-auto h-12 w-12 mb-4"/>
                    <p>Vous n'avez aucune notification pour le moment.</p>
                </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
