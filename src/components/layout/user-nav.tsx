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
  import { useRouter } from 'next/navigation';
  import { LogOut, User as UserIcon, LifeBuoy, CreditCard, BadgeAlert, Moon, Sun, Palette } from 'lucide-react';
  import { cn } from "@/lib/utils";
  import { OnlineStatusIndicator } from "../OnlineStatusIndicator";
  import { useTheme } from "next-themes";

  
export function UserNav() {
    const { currentUser, isUserLoading, secureSignOut } = useRole();
    const router = useRouter();
    const { setTheme, theme } = useTheme();

    const handleLogout = async () => {
        await secureSignOut();
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
        <DropdownMenuContent className="w-64 dark:bg-[#111b21] dark:border-white/10 shadow-2xl" align="end" forceMount>
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
                           <BadgeAlert className="h-3 w-3"/> Profil incomplet
                        </span>
                    )}
                </div>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="dark:bg-white/5" />
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={() => router.push('/account')} className="cursor-pointer py-3">
              <UserIcon className="mr-3 h-4 w-4 text-slate-400" />
              <span className="font-medium">Mon Compte</span>
            </DropdownMenuItem>
             <DropdownMenuItem onClick={() => router.push('/student/paiements')} className="cursor-pointer py-3">
              <CreditCard className="mr-3 h-4 w-4 text-slate-400" />
              <span className="font-medium">Paiements</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push('/student/support')} className="cursor-pointer py-3">
              <LifeBuoy className="mr-3 h-4 w-4 text-slate-400" />
              <span className="font-medium">Support</span>
            </DropdownMenuItem>
          </DropdownMenuGroup>
          
          <DropdownMenuSeparator className="dark:bg-white/5"/>
          
          <div className="p-2 space-y-1">
            <p className="px-2 pb-2 text-[9px] font-black uppercase text-slate-500 tracking-widest">Thème visuel</p>
            <div className="grid grid-cols-3 gap-1">
                <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setTheme("light")}
                    className={cn("h-8 text-[10px] font-bold uppercase rounded-md", theme === 'light' ? "bg-primary text-white" : "text-slate-400")}
                >
                    Clair
                </Button>
                <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setTheme("dark")}
                    className={cn("h-8 text-[10px] font-bold uppercase rounded-md", theme === 'dark' ? "bg-primary text-white" : "text-slate-400")}
                >
                    Sombre
                </Button>
                <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setTheme("system")}
                    className={cn("h-8 text-[10px] font-bold uppercase rounded-md", theme === 'system' ? "bg-primary text-white" : "text-slate-400")}
                >
                    Auto
                </Button>
            </div>
          </div>

          <DropdownMenuSeparator className="dark:bg-white/5"/>
          
          <DropdownMenuItem onClick={handleLogout} className="cursor-pointer py-3 text-red-500 focus:text-red-400 focus:bg-red-500/10">
            <LogOut className="mr-3 h-4 w-4" />
            <span className="font-bold uppercase text-[10px] tracking-widest">Déconnexion</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
}
