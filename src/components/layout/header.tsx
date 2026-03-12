'use client';

import { Bell, Search, User as UserIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UserNav } from '@/components/layout/user-nav';
import { useRouter } from 'next/navigation';
import { useRole } from '@/context/RoleContext';
import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Link from 'next/link';
import { useLocale } from 'next-intl';

/**
 * @fileOverview En-tête de l'application (Design Qwen Redesign).
 * ✅ Logo gradient, icônes tactiles, avatar miniature.
 */

export function Header() {
    const router = useRouter();
    const { currentUser } = useRole();
    const locale = useLocale();

    return (
        <header className="fixed top-0 left-0 right-0 z-50 bg-[#0f172a]/90 backdrop-blur-md border-b border-white/5 md:relative md:bg-transparent md:border-none md:backdrop-blur-none">
            <div className="flex h-16 items-center justify-between px-6">
                {/* Logo & Brand */}
                <Link href={`/${locale}/student/dashboard`} className="flex items-center gap-2 group">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#10b981] to-teal-600 flex items-center justify-center text-white font-black text-sm shadow-lg shadow-emerald-500/20 group-active:scale-90 transition-transform">
                        N
                    </div>
                    <span className="font-black text-lg tracking-tighter text-white uppercase md:hidden lg:block">NDARA</span>
                </Link>

                {/* Right Actions */}
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => router.push(`/${locale}/search`)}
                        className="text-gray-400 hover:text-white transition-all active:scale-90 p-1"
                    >
                        <Search className="h-5 w-5" />
                    </button>
                    
                    <div className="hidden md:block">
                        <UserNav />
                    </div>

                    <Link href={`/${locale}/student/profile`} className="md:hidden">
                        <Avatar className="h-8 w-8 border border-white/10 shadow-xl overflow-hidden active:scale-90 transition-transform">
                            <AvatarImage src={currentUser?.profilePictureURL} className="object-cover" />
                            <AvatarFallback className="bg-gray-700 text-slate-300 text-[10px] font-black">
                                {currentUser?.fullName?.charAt(0) || 'N'}
                            </AvatarFallback>
                        </Avatar>
                    </Link>
                </div>
            </div>
        </header>
    );
}