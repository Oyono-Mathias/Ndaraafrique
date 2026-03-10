'use client';

/**
 * @fileOverview Centre de Notifications Ndara Afrique (Android-First).
 * ✅ FILTRAGE : Lecture en temps réel et marquage par lots.
 * ✅ DESIGN : Immersion premium, typographies uppercase pour les labels.
 */

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useCollection } from '@/firebase';
import { getFirestore, collection, query, orderBy, writeBatch, doc, updateDoc, limit } from 'firebase/firestore';
import { useRole } from '@/context/RoleContext';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Bell, Check, CheckCircle, ShieldAlert, Info, Clock, MessageSquare, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Notification } from '@/lib/types';

const NotificationIcon = ({ type }: { type: Notification['type'] }) => {
    switch (type) {
        case 'success': return <CheckCircle className="h-5 w-5 text-emerald-500" />;
        case 'alert': return <ShieldAlert className="h-5 w-5 text-red-500" />;
        case 'reminder': return <Clock className="h-5 w-5 text-amber-500" />;
        default: return <Info className="h-5 w-5 text-blue-500" />;
    }
}

export default function NotificationsPage() {
  const db = getFirestore();
  const router = useRouter();
  const { currentUser } = useRole();

  const notificationsQuery = useMemo(
    () => currentUser ? query(
        collection(db, `users/${currentUser.uid}/notifications`), 
        orderBy('createdAt', 'desc'),
        limit(100)
    ) : null,
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
    <div className="flex flex-col gap-8 pb-24 bg-slate-950 min-h-screen bg-grainy">
      <header className="px-4 pt-8 space-y-6">
        <div className="flex justify-between items-start">
            <div className="space-y-1">
                <div className="flex items-center gap-2 text-primary mb-2">
                    <Bell className="h-5 w-5" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">Flux d'activités</span>
                </div>
                <h1 className="text-3xl font-black text-white uppercase tracking-tight">Alertes</h1>
            </div>
            <Button 
                variant="outline" 
                size="sm" 
                onClick={handleMarkAllAsRead} 
                disabled={!hasUnread || isLoading}
                className="h-10 rounded-xl bg-slate-900 border-slate-800 text-[10px] font-black uppercase tracking-widest text-primary disabled:opacity-30 transition-all active:scale-95"
            >
                <Check className="mr-2 h-3.5 w-3.5"/>
                Tout lire
            </Button>
        </div>
      </header>

      <div className="px-4 space-y-4">
        {isLoading ? (
            <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                    <div key={i} className="p-6 flex items-start gap-4 bg-slate-900/50 rounded-[2rem] border border-slate-800">
                        <Skeleton className="h-12 w-12 rounded-2xl bg-slate-800 shrink-0" />
                        <div className="flex-1 space-y-2 mt-1">
                            <Skeleton className="h-4 w-3/4 bg-slate-800" />
                            <Skeleton className="h-3 w-1/4 bg-slate-800" />
                        </div>
                    </div>
                ))}
            </div>
        ) : notifications && notifications.length > 0 ? (
            <div className="grid gap-3 animate-in fade-in duration-700">
                {notifications.map(notif => {
                    const notifDate = (notif.createdAt as any)?.toDate?.() || new Date();
                    
                    return (
                        <button
                            key={notif.id}
                            onClick={() => handleNotificationClick(notif)}
                            className={cn(
                                "w-full text-left p-5 flex items-start gap-4 transition-all duration-300 rounded-[2rem] border relative group active:scale-[0.98]",
                                notif.read 
                                    ? "bg-slate-900/20 border-slate-800/50 opacity-60" 
                                    : "bg-slate-900 border-slate-800 shadow-xl"
                            )}
                        >
                            <div className={cn(
                                "p-3.5 rounded-2xl border shrink-0 transition-colors",
                                notif.read ? "bg-slate-950/50 border-slate-800" : "bg-primary/10 border-primary/20"
                            )}>
                                <NotificationIcon type={notif.type} />
                            </div>
                            <div className="flex-1 min-w-0 pt-1">
                                <p className={cn(
                                    "text-[15px] leading-relaxed",
                                    !notif.read ? "font-black text-white" : "text-slate-400 font-medium"
                                )}>
                                    {notif.text}
                                </p>
                                <div className="text-[9px] text-slate-600 font-black uppercase tracking-widest mt-3 flex items-center gap-2">
                                    <Clock className="h-3 w-3" />
                                    {formatDistanceToNow(notifDate, { locale: fr, addSuffix: true })}
                                </div>
                            </div>
                            {!notif.read && (
                                <div className="absolute top-6 right-6">
                                    <div className="h-2.5 w-2.5 rounded-full bg-primary shadow-[0_0_10px_hsl(var(--primary))]"></div>
                                </div>
                            )}
                        </button>
                    )
                })}
            </div>
        ) : (
            <div className="flex flex-col items-center justify-center py-32 text-center bg-slate-900/20 rounded-[3rem] border-2 border-dashed border-slate-800/50 animate-in zoom-in duration-500">
                <div className="p-6 bg-slate-800/50 rounded-full mb-6">
                    <Bell className="h-16 w-16 text-slate-700"/>
                </div>
                <h3 className="text-xl font-black text-white uppercase tracking-tight">Rien à signaler</h3>
                <p className="text-slate-500 text-sm mt-2 max-w-[200px] mx-auto leading-relaxed">
                    Vos futures alertes sur les cours et certificats apparaîtront ici.
                </p>
            </div>
        )}
      </div>

      <div className="px-6 py-12">
          <div className="p-6 bg-primary/5 border border-primary/10 rounded-3xl flex items-start gap-4">
              <Info className="h-6 w-6 text-primary shrink-0 mt-0.5" />
              <div>
                  <p className="text-xs font-black text-white uppercase tracking-widest">Notifications Push</p>
                  <p className="text-[10px] text-slate-500 mt-1 leading-relaxed font-medium italic">
                      Ndara Afrique utilise les notifications web pour vous alerter même quand l'application est fermée. Assurez-vous de les avoir autorisées dans votre navigateur.
                  </p>
              </div>
          </div>
      </div>
    </div>
  );
}
