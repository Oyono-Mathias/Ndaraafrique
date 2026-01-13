
'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { MoreHorizontal, Search, UserX, Loader2, UserCog, Trash2, Ban, Upload } from 'lucide-react';
import type { FormaAfriqueUser } from '@/context/RoleContext';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

type UserForTable = {
  uid: string;
  fullName: string;
  email: string;
  role: 'admin' | 'instructor' | 'student';
  status: 'active' | 'suspended';
  createdAt: Date;
  avatarUrl?: string;
};

// --- SKELETON LOADER ---
const UserTableSkeleton = () => (
  [...Array(5)].map((_, i) => (
    <TableRow key={i} className="dark:border-slate-700">
      <TableCell>
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-full dark:bg-slate-700" />
          <Skeleton className="h-4 w-32 dark:bg-slate-700" />
        </div>
      </TableCell>
      <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-48 dark:bg-slate-700" /></TableCell>
      <TableCell className="hidden lg:table-cell"><Skeleton className="h-6 w-24 rounded-full dark:bg-slate-700" /></TableCell>
      <TableCell className="hidden sm:table-cell"><Skeleton className="h-6 w-20 rounded-full dark:bg-slate-700" /></TableCell>
      <TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-28 dark:bg-slate-700" /></TableCell>
      <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto dark:bg-slate-700" /></TableCell>
    </TableRow>
  ))
);

// --- COMPOSANTS DE L'INTERFACE ---
const getRoleBadgeVariant = (role: UserForTable['role']) => {
  switch (role) {
    case 'admin': return 'destructive';
    case 'instructor': return 'default';
    default: return 'secondary';
  }
};

const getStatusBadgeVariant = (status: UserForTable['status']) => {
  return status === 'suspended' ? 'destructive' : 'default';
};

const UserActions = ({ user }: { user: UserForTable }) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <span className="sr-only">Ouvrir le menu</span>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="dark:bg-slate-800 dark:border-slate-700 dark:text-white">
        <DropdownMenuLabel>Actions</DropdownMenuLabel>
        <DropdownMenuItem className="cursor-pointer dark:focus:bg-slate-700">
          <UserCog className="mr-2 h-4 w-4"/>
          Changer le rôle
        </DropdownMenuItem>
        <DropdownMenuItem className="cursor-pointer dark:focus:bg-slate-700">
          <Ban className="mr-2 h-4 w-4"/>
          {user.status === 'suspended' ? 'Réactiver' : 'Suspendre'}
        </DropdownMenuItem>
        <DropdownMenuSeparator className="dark:bg-slate-700" />
        <DropdownMenuItem className="text-destructive dark:text-red-400 cursor-pointer dark:focus:bg-destructive/10 dark:focus:text-red-400">
          <Trash2 className="mr-2 h-4 w-4"/>
          Supprimer
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};


// --- PAGE PRINCIPALE ---
export default function AdminUsersPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [users, setUsers] = useState<UserForTable[]>([]); // Données réelles seront chargées ici
  const [searchTerm, setSearchTerm] = useState('');

  // Simuler la fin du chargement après un délai
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1500);
    return () => clearTimeout(timer);
  }, []);

  const filteredUsers = useMemo(() => {
    if (!users) return [];
    if (!searchTerm) return users;
    return users.filter(user =>
      user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [users, searchTerm]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4">
      <header className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold dark:text-white">Utilisateurs</h1>
          <p className="text-muted-foreground dark:text-slate-400">Gérez les membres de la plateforme.</p>
        </div>
        <Button>
          <Upload className="mr-2 h-4 w-4"/>
          Importer des utilisateurs
        </Button>
      </header>

      <Card className="dark:bg-slate-800 dark:border-slate-700">
        <CardHeader>
          <CardTitle className="dark:text-white">Liste des utilisateurs</CardTitle>
          <CardDescription className="dark:text-slate-400">
            Retrouvez ici tous les utilisateurs inscrits sur la plateforme.
          </CardDescription>
          <div className="relative pt-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par nom ou email..."
              className="max-w-sm pl-10 dark:bg-slate-700 dark:border-slate-600"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="dark:hover:bg-slate-700/50 dark:border-slate-700">
                  <TableHead className="dark:text-slate-400">Nom</TableHead>
                  <TableHead className="hidden md:table-cell dark:text-slate-400">Email</TableHead>
                  <TableHead className="hidden lg:table-cell dark:text-slate-400">Rôle</TableHead>
                  <TableHead className="hidden sm:table-cell dark:text-slate-400">Statut</TableHead>
                  <TableHead className="hidden lg:table-cell dark:text-slate-400">Date d'inscription</TableHead>
                  <TableHead className="text-right dark:text-slate-400">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? <UserTableSkeleton /> : (
                  filteredUsers.length > 0 ? (
                    filteredUsers.map((user) => (
                      <TableRow key={user.uid} className="dark:hover:bg-slate-700/50">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarImage src={user.avatarUrl} alt={user.fullName} />
                              <AvatarFallback>{user.fullName.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <span className="font-medium dark:text-slate-100">{user.fullName}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground hidden md:table-cell dark:text-slate-400">{user.email}</TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <Badge variant={getRoleBadgeVariant(user.role)} className="capitalize">
                            {user.role}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                           <Badge variant={getStatusBadgeVariant(user.status)} className={cn(user.status !== 'suspended' && 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300')}>
                            {user.status === 'suspended' ? 'Suspendu' : 'Actif'}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-muted-foreground dark:text-slate-500">
                           {format(user.createdAt, 'dd MMM yyyy', { locale: fr })}
                        </TableCell>
                        <TableCell className="text-right">
                          <UserActions user={user} />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow className="dark:border-slate-700">
                      <TableCell colSpan={6} className="h-48 text-center">
                        <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground dark:text-slate-400">
                            <UserX className="h-12 w-12" />
                            <p className="font-medium">Aucun utilisateur trouvé</p>
                            <p className="text-sm">
                                {searchTerm 
                                    ? `Aucun résultat pour "${searchTerm}".`
                                    : "La liste des utilisateurs est actuellement vide."
                                }
                            </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

    