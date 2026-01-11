
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
  import { LogOut, User as UserIcon } from 'lucide-react';

  
export function UserNav() {
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
          <Button variant="ghost" className="relative h-8 w-8 rounded-full">
            <Avatar className="h-8 w-8">
              <AvatarImage src={formaAfriqueUser.profilePictureURL} alt={formaAfriqueUser.fullName} />
              <AvatarFallback>{formaAfriqueUser.fullName.charAt(0)}</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end" forceMount>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">{formaAfriqueUser.fullName}</p>
              <p className="text-xs leading-none text-muted-foreground">
                {formaAfriqueUser.email}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={() => router.push('/account')}>
              <UserIcon className="mr-2 h-4 w-4" />
              <span>Profil</span>
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            <span>Déconnexion</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
}
