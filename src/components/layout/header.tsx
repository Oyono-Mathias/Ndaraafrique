'use client';

/**
 * @fileOverview En-tête global de l'application (Design Android-First).
 * ✅ MENU : Déclencheur du menu latéral pour mobile (Hamburger).
 * ✅ NOTIFICATIONS : Cloche connectée à Firestore avec badge d'invisibilité.
 * ✅ TITRE : Dynamique selon le contexte (Espace Formateur, etc).
 */

import React, { useState, useEffect } from 'react';
import { Search, Menu, PanelLeft, Bell, Loader2 } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import { useRole } from '@/context/RoleContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { StudentSidebar } from '@/components/layout/student-sidebar';
import { InstructorSidebar } from '@/components/layout/instructor-sidebar';
import { AdminSidebar } from '@/components/layout/admin-sidebar';
import { cn } from '@/lib/utils';
import { getFirestore, collection, query, where, onSnapshot, limit } from 'firebase/firestore';

export function Header() {
    const router = useRouter();
    const pathname = usePathname();
    const { currentUser, role } = useRole();
    const locale = useLocale();
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [hasUnread, setHasUnread] = useState(false);
    const db = getFirestore();

    const handleSidebarLinkClick = () => setIsSheetOpen(false);
    const sidebarProps = { onLinkClick: handleSidebarLinkClick };

    // Écouteur temps réel pour les notifications non lues
    useEffect(() => {
        if (!currentUser?.uid) return;

        const q = query(
            collection(db, `users/${currentUser.uid}/notifications`),
            where('read', '==', false),
            limit(1)
        );

        const unsubscribe = onSnapshot(q, (snap) => {
            setHasUnread(!snap.empty);
        });

        return () => unsubscribe();
    }, [currentUser?.uid, db]);

    const getPageTitle = () => {
        if (pathname.includes('/instructor/dashboard')) return "Espace Formateur";
        if (pathname.includes('/student/dashboard')) return "Ndara Afrique";
        if (pathname.includes('/admin')) return "Administration";
        if (pathname.includes('/instructor/')) return "Expert Ndara";
        return "Ndara";
    };

    return (
        <div className="flex h-16 items-center justify-between px-4 w-full">
            
            {/* Left: Mobile Menu Trigger + Contextual Title */}
            <div className="flex items-center gap-3">
                <div className="md:hidden">
                    <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                        <SheetTrigger asChild>
                            <button className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-slate-400 active:scale-90 transition-transform">
                                <PanelLeft className="h-5 w-5" />
                            </button>
                        </SheetTrigger>
                        <SheetContent side="left" className="p-0 w-full max-w-[300px] bg-[#0f172a] border-none shadow-2xl">
                            {role === 'admin' ? (
                                <AdminSidebar {...sidebarProps} />
                            ) : role === 'instructor' ? (
                                <InstructorSidebar {...sidebarProps} />
                            ) : (
                                <StudentSidebar {...sidebarProps} />
                            )}
                        </SheetContent>
                    </Sheet>
                </div>

                <div className="flex flex-col">
                    <h1 className="font-black text-sm text-white uppercase tracking-wider leading-none">
                        {getPageTitle()}
                    </h1>
                    {pathname.includes('/instructor/') && (
                        <span className="text-primary text-[9px] font-black uppercase tracking-[0.2em] mt-1">
                            Mode Expert
                        </span>
                    )}
                </div>
            </div>

            {/* Right: Search, Notifications, Profile */}
            <div className="flex items-center gap-2">
                <button 
                    onClick={() => router.push(`/${locale}/search`)}
                    className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-slate-400 hover:text-white transition-all active:scale-90"
                >
                    <Search className="h-5 w-5" />
                </button>

                <button 
                    onClick={() => router.push(`/${locale}/student/notifications`)}
                    className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-slate-400 hover:text-white transition-all active:scale-90 relative"
                >
                    <Bell className="h-5 w-5" />
                    {hasUnread && (
                        <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-[#0f172a] shadow-[0_0_10px_rgba(239,68,68,0.5)] animate-pulse" />
                    )}
                </button>
                
                <Link href={`/${locale}/student/profile`} className="active:scale-90 transition-transform ml-1">
                    <div className="p-[2px] rounded-full bg-gradient-to-tr from-primary/40 to-blue-500/40">
                        <Avatar className="h-8 w-8 border-2 border-[#0f172a] shadow-xl overflow-hidden">
                            <AvatarImage src={currentUser?.profilePictureURL} className="object-cover" />
                            <AvatarFallback className="bg-slate-800 text-slate-300 text-[10px] font-black uppercase">
                                {currentUser?.fullName?.charAt(0) || 'N'}
                            </AvatarFallback>
                        </Avatar>
                    </div>
                </Link>
            </div>
        </div>
    );
}
