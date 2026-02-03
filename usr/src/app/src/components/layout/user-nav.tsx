'use client';

import {
    Avatar,
    AvatarFallback,
    AvatarImage,
  } from "@/components/ui/avatar";
  import { Button } from "@/components/ui/button";
  import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    DropdownMenuSub,
    DropdownMenuSubTrigger,
    DropdownMenuPortal,
    DropdownMenuSubContent,
  } from "@/components/ui/dropdown-menu";
  import { useRole } from "@/context/RoleContext";
  import { useRouter } from 'next/navigation';
  import { LogOut, User as UserIcon, LifeBuoy, CreditCard, BadgeAlert, Moon, Sun } from 'lucide-react';
  import { cn } from "@/lib/utils";
  // ✅ Correction du chemin de l'indicateur
  import { OnlineStatusIndicator } from "@/components/OnlineStatusIndicator"; 
  import { useTheme } from "next-themes";

  
export function UserNav() {
    const { currentUser, isUserLoading, secureSignOut } = useRole();
    const router = useRouter();
    const { setTheme } = useTheme();

    const handleLogout = async () => {
        await secureSignOut();
        // La redirection est gérée par le useEffect de l'AppShell
    }

    if (isUserLoading || !currentUser) {
        return <div className="h-10 w-10 rounded-full bg-slate-800 animate-pulse" />;
    }
    
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-10 w-full rounded-lg p-0 flex items-center justify-start gap-3 text-left hover:bg-transparent">
            <Avatar className="h-10 w-10 border-2 border-slate-700">
              <AvatarImage src={currentUser.profilePictureURL} alt={currentUser.fullName || "User"} />
              <AvatarFallback className="bg-slate-700 text-slate-300">
                {currentUser.fullName?.charAt(0) || <UserIcon className="h-4 w-4" />}
              </AvatarFallback>
            </Avatar>
             {!currentUser.isProfileComplete && (
                <span className="absolute bottom-0 left-7 block h-3 w-3 rounded-full bg-amber-400 ring-2 ring-slate-900" />
            )}
            <div className="flex flex-col overflow-hidden">
                <span className="font-semibold text-sm text-white truncate">
                    {currentUser.username || currentUser.fullName}
                </span>
                 <span className="text-[10px] text-slate-400 capitalize truncate">
                    {currentUser.role}
                </span>
            </div>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-64 bg-slate-900 border-slate-800 text-slate-200" align="end" forceMount>
          <DropdownMenuLabel className="font-normal">
            <div className="flex items-center gap-3">
               <Avatar className="h-9 w-9">
                  <AvatarImage src={currentUser.profilePictureURL} alt={currentUser.fullName || "User"} />
                  <AvatarFallback className="bg-slate-800">
                    {currentUser.fullName?.charAt(0) || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col space-y-1">
                  <div className="flex items-center gap-2">
                     <p className="text-sm font-semibold leading-none text-white">
                        @{currentUser.username || "utilisateur"}
                     </p>
                     <OnlineStatusIndicator />
                  </div>
                   {!currentUser.isProfileComplete && (
                        <span className="text-[10px] text-amber-400 font-semibold flex items-center gap-1">
                            <BadgeAlert className="h-3 w-3"/> Profil incomplet
                        </span>
                    )}
                </div>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="bg-slate-800" />
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={() => router.push('/account')} className="cursor-pointer focus:bg-slate-800 focus:text-white">
              <UserIcon className="mr-2 h-4 w-4" />
              <span>Mon Compte</span>
            </DropdownMenuItem>
             <DropdownMenuItem onClick={() => router.push('/student/paiements')} className="cursor-pointer focus:bg-slate-800 focus:text-white">
              <CreditCard className="mr-2 h-4 w-4" />
              <span>Paiements</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push('/student/support')} className="cursor-pointer focus:bg-slate-800 focus:text-white">
              <LifeBuoy className="mr-2 h-4 w-4" />
              <span>Support</span>
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator className="bg-slate-800"/>
           <DropdownMenuSub>
            <DropdownMenuSubTrigger className="cursor-pointer focus:bg-slate-800">
              <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 mr-2" />
              <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 mr-2" />
              <span>Thème</span>
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent className="bg-slate-900 border-slate-800 text-slate-200">
                <DropdownMenuItem onClick={() => setTheme("light")}>
                  Clair
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("dark")}>
                  Sombre
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("system")}>
                  Système
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>
          <DropdownMenuSeparator className="bg-slate-800"/>
          <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-400 focus:bg-red-500/10 focus:text-red-400">
            <LogOut className="mr-2 h-4 w-4" />
            <span>Déconnexion</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
}