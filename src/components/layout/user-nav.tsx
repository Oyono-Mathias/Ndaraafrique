
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
  import { getAuth, signOut } from "firebase/auth";
  import { useRouter } from "next/navigation";
  import { LogOut, User as UserIcon, LifeBuoy, Settings, CreditCard, BadgeAlert } from 'lucide-react';
  import { useTranslation } from "react-i18next";
  import { LanguageSelector } from "./language-selector";
  import { cn } from "@/lib/utils";

  
export function UserNav() {
    const { t } = useTranslation();
    const { formaAfriqueUser, isUserLoading } = useRole();
    const router = useRouter();

    const handleLogout = async () => {
        await signOut(getAuth());
        router.push('/');
    }

    if (isUserLoading || !formaAfriqueUser) {
        return null;
    }
    
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-10 w-10 rounded-full p-0">
            <Avatar className="h-10 w-10 border-2 border-slate-700">
              <AvatarImage src={formaAfriqueUser.profilePictureURL} alt={formaAfriqueUser.fullName} />
              <AvatarFallback className="bg-slate-700 text-slate-300">{formaAfriqueUser.fullName?.charAt(0)}</AvatarFallback>
            </Avatar>
             {!formaAfriqueUser.isProfileComplete && (
                <span className="absolute bottom-0 right-0 block h-3 w-3 rounded-full bg-amber-400 ring-2 ring-background" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-64 dark:bg-slate-800 dark:border-slate-700" align="end" forceMount>
          <DropdownMenuLabel className="font-normal">
            <div className="flex items-center gap-3">
               <Avatar className="h-9 w-9">
                  <AvatarImage src={formaAfriqueUser.profilePictureURL} alt={formaAfriqueUser.fullName} />
                  <AvatarFallback className="bg-slate-600">{formaAfriqueUser.fullName?.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-semibold leading-none text-white">@{formaAfriqueUser.username}</p>
                   {!formaAfriqueUser.isProfileComplete && (
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
              <span>{t('navAccount')}</span>
            </DropdownMenuItem>
             <DropdownMenuItem onClick={() => router.push('/paiements')} className="cursor-pointer dark:focus:bg-slate-700">
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
            <span>{t('logout')}</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
}
