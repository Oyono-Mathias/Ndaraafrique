
'use client';

import {
    Avatar,
    AvatarFallback,
    AvatarImage,
  } from "@/components/ui/avatar"
  import { Button } from "@/components/ui/button"
  import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
  } from "@/components/ui/dropdown-menu"
  import { useRole } from "@/context/RoleContext"
  import { useRouter } from "next/navigation";
  import { LogOut, User as UserIcon, LifeBuoy, Settings, CreditCard, BadgeAlert } from 'lucide-react';
  import { useTranslations } from "next-intl";
  import { LanguageSelector } from "./language-selector";
  import { cn } from "@/lib/utils";
  import { OnlineStatusIndicator } from "../OnlineStatusIndicator";

  
export function UserNav() {
    const t = useTranslations();
    const { currentUser, isUserLoading, secureSignOut } = useRole();
    const router = useRouter();

    const handleLogout = async () => {
        await secureSignOut();
        router.push('/');
    }

    if (isUserLoading || !currentUser) {
        return null;
    }
    
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-10 w-full rounded-lg p-0 flex items-center justify-start gap-3 text-left">
            <Avatar className="h-10 w-10 border-2 border-slate-700">
              <AvatarImage src={currentUser.profilePictureURL} alt={currentUser.fullName} />
              <AvatarFallback className="bg-slate-700 text-slate-300">{currentUser.fullName?.charAt(0)}</AvatarFallback>
            </Avatar>
             {!currentUser.isProfileComplete && (
                <span className="absolute bottom-0 left-7 block h-3 w-3 rounded-full bg-amber-400 ring-2 ring-background" />
            )}
            <div className="flex flex-col">
                <span className="font-semibold text-sm text-white truncate">{currentUser.username}</span>
                 <span className="text-xs text-slate-400 capitalize">{currentUser.role}</span>
            </div>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-64 dark:bg-slate-800 dark:border-slate-700" align="end" forceMount>
          <DropdownMenuLabel className="font-normal">
            <div className="flex items-center gap-3">
               <Avatar className="h-9 w-9">
                  <AvatarImage src={currentUser.profilePictureURL} alt={currentUser.fullName} />
                  <AvatarFallback className="bg-slate-600">{currentUser.fullName?.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col space-y-1">
                  <div className="flex items-center gap-2">
                     <p className="text-sm font-semibold leading-none text-white">@{currentUser.username}</p>
                     <OnlineStatusIndicator />
                  </div>
                   {!currentUser.isProfileComplete && (
                        <span className="text-xs text-amber-400 font-semibold flex items-center gap-1">
                           <BadgeAlert className="h-3 w-3"/> {t('profile_incomplete')}
                        </span>
                    )}
                </div>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="dark:bg-slate-700" />
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={() => router.push('/account')} className="cursor-pointer dark:focus:bg-slate-700">
              <UserIcon className="mr-2 h-4 w-4" />
              <span>{t('Nav.account')}</span>
            </DropdownMenuItem>
             <DropdownMenuItem onClick={() => router.push('/historique-paiements')} className="cursor-pointer dark:focus:bg-slate-700">
              <CreditCard className="mr-2 h-4 w-4" />
              <span>{t('payments')}</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push('/questions-reponses')} className="cursor-pointer dark:focus:bg-slate-700">
              <LifeBuoy className="mr-2 h-4 w-4" />
              <span>{t('support')}</span>
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator className="dark:bg-slate-700"/>
          <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-500 dark:focus:bg-red-500/10 dark:focus:text-red-400">
            <LogOut className="mr-2 h-4 w-4" />
            <span>{t('Nav.logout')}</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
}
