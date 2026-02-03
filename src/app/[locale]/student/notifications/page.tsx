'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useCollection } from '@/firebase';
import { getFirestore, collection, query, orderBy, writeBatch, doc, updateDoc } from 'firebase/firestore';
import { useRole } from '@/context/RoleContext';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Bell, Check, CheckCircle, ShieldAlert, Info, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Notification } from '@/lib/types';

const NotificationIcon = ({ type }: { type: Notification['type'] }) => {
    switch (type) {
        case 'success': return <CheckCircle className="h-5 w-5 text-green-500" />;
        case 'alert': return <ShieldAlert className="h-5 w-5 text-red-500" />;
        case 'reminder': return <ClockIcon className="h-5 w-5 text-amber-500" />;
        default: return <Info className="h-5 w-5 text-blue-500" />;
    }
}

const ClockIcon = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
    </svg>
);

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
    <div className="space-y-8 max-w-4xl mx-auto pb-12">
      <header className="flex flex-col sm:flex-row justify-between sm:items-end gap-4">
        <div>
            <h1 className="text-3xl font-bold text-white">Centre de Notifications</h1>
            <p className="text-slate-400 mt-1">Restez informé de vos progrès et des messages de vos tuteurs.</p>
        </div>
        <Button 
            variant="outline" 
            size="sm" 
            onClick={handleMarkAllAsRead} 
            disabled={!hasUnread}
            className="bg-slate-800 border-slate-700 hover:bg-slate-700"
        >
            <Check className="mr-2 h-4 w-4"/>
            Tout marquer comme lu
        </Button>
      </header>

      <Card className="bg-slate-900/40 border-slate-800 shadow-2xl overflow-hidden">
        <CardContent className="p-0">
          <div className="divide-y divide-slate-800">
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                  <div key={i} className="p-6 flex items-start gap-4">
                      <Skeleton className="h-10 w-10 rounded-full bg-slate-800" />
                      <div className="flex-1 space-y-2">
                          <Skeleton className="h-4 w-3/4 bg-slate-800" />
                          <Skeleton className="h-3 w-1/4 bg-slate-800" />
                      </div>
                  </div>
              ))
            ) : notifications && notifications.length > 0 ? (
              notifications.map(notif => {
                // ✅ Sécurisation de la date Firestore
                const notifDate = (notif.createdAt as any)?.toDate?.() || new Date();
                
                return (
                    <button
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    className={cn(
                        "w-full text-left p-6 flex items-start gap-4 transition-all duration-200 group relative",
                        notif.read ? "bg-transparent opacity-70" : "bg-primary/5 hover:bg-primary/10"
                    )}
                    >
                        <div className={cn(
                            "p-3 rounded-xl border transition-colors",
                            notif.read ? "bg-slate-800 border-slate-700" : "bg-primary/20 border-primary/30"
                        )}>
                            <NotificationIcon type={notif.type} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className={cn(
                                "text-[15px] leading-relaxed",
                                !notif.read ? "font-bold text-white" : "text-slate-300"
                            )}>
                                {notif.text}
                            </p>
                            <p className="text-xs text-slate-500 mt-2 flex items-center gap-2">
                                <ClockIcon className="h-3 w-3" />
                                {formatDistanceToNow(notifDate, { locale: fr, addSuffix: true })}
                            </p>
                        </div>
                        {!notif.read && (
                            <div className="absolute right-6 top-1/2 -translate-y-1/2">
                                <div className="h-2.5 w-2.5 rounded-full bg-primary shadow-[0_0_10px_rgba(79,70,229,0.5)]"></div>
                            </div>
                        )}
                    </button>
                )
              })
            ) : (
                <div className="text-center py-24 text-slate-500 flex flex-col items-center">
                    <div className="p-4 bg-slate-800/50 rounded-full mb-4">
                        <Bell className="h-12 w-12 text-slate-600"/>
                    </div>
                    <h3 className="text-lg font-semibold text-slate-300">Aucune notification</h3>
                    <p className="max-w-xs mt-1">Vous n'avez pas encore de messages. Vos alertes apparaîtront ici.</p>
                </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
