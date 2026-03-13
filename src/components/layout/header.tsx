
'use client';

/**
 * @fileOverview En-tête de l'application (Design Qwen Redesign).
 * ✅ MENU : Déclencheur du menu latéral pour mobile.
 * ✅ LOGO : Effet gradient et retour accueil.
 */

import React, { useState } from 'react';
import { Search, Menu, PanelLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useRole } from '@/context/RoleContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { StudentSidebar } from '@/components/layout/student-sidebar';
import { InstructorSidebar } from '@/components/layout/instructor-sidebar';
import { AdminSidebar } from '@/components/layout/admin-sidebar';
import { cn } from '@/lib/utils';

export function Header() {
    const router = useRouter();
    const { currentUser, role } = useRole();
    const locale = useLocale();
    const [isSheetOpen, setIsSheetOpen] = useState(false);

    const handleSidebarLinkClick = () => setIsSheetOpen(false);
    const sidebarProps = { onLinkClick: handleSidebarLinkClick };

    return (
        <header className="fixed top-0 left-0 right-0 z-50 bg-[#0f172a]/95 backdrop-blur-md border-b border-white/5 md:relative md:bg-transparent md:border-none md:backdrop-blur-none">
            <div className="flex h-16 items-center justify-between px-6">
                
                {/* Left: Mobile Menu Trigger + Brand */}
                <div className="flex items-center gap-4">
                    <div className="md:hidden">
                        <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                            <SheetTrigger asChild>
                                <button className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-slate-400 active:scale-90 transition-transform">
                                    <PanelLeft className="h-5 w-5" />
                                </button>
                            </SheetTrigger>
                            <SheetContent side="left" className="p-0 w-full max-w-[320px] bg-[#0f172a] border-none">
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

                    <Link href={`/${locale}/student/dashboard`} className="flex items-center gap-2 group">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#10b981] to-teal-600 flex items-center justify-center text-white font-black text-sm shadow-lg shadow-emerald-500/20 group-active:scale-90 transition-transform">
                            N
                        </div>
                        <span className="font-black text-lg tracking-tighter text-white uppercase hidden sm:block">NDARA</span>
                    </Link>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => router.push(`/${locale}/search`)}
                        className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-slate-400 hover:text-white transition-all active:scale-90"
                    >
                        <Search className="h-5 w-5" />
                    </button>
                    
                    <Link href={`/${locale}/student/profile`} className="active:scale-90 transition-transform">
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
        </header>
    );
}
