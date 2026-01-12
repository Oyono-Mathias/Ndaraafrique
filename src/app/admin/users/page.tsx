

'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useRole } from '@/context/RoleContext';
import { useCollection, useMemoFirebase } from '@/firebase';
import { getFirestore, collection, query, orderBy, doc, updateDoc, where, getDocs, setDoc, serverTimestamp } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { MoreHorizontal, Search, UserX, Loader2, UserCog, Trash2, Ban, Eye, MessageSquare, Sparkles } from 'lucide-react';
import type { FormaAfriqueUser, UserRole } from '@/context/RoleContext';
import { cn } from '@/lib/utils';
import { useDebounce } from '@/hooks/use-debounce';
import { useToast } from '@/hooks/use-toast';
import { deleteUserAccount, sendEncouragementMessage } from '@/app/actions/userActions';
import { useTranslation } from 'react-i18next';


const getRoleBadgeVariant = (role: FormaAfriqueUser['role']) => {
  switch (role) {
    case 'admin':
      return 'destructive';
    case 'instructor':
      return 'default';
    default:
      return 'secondary';
  }
};

const getStatusBadgeVariant = (status?: 'active' | 'suspended') => {
    return status === 'suspended' ? 'destructive' : 'default';
};

const UserActions = ({ user, adminId }: { user: FormaAfriqueUser, adminId: string | undefined }) => {
    const { t } = useTranslation();
    const { toast } = useToast();
    const router = useRouter();
    const db = getFirestore();
    const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
    const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedRole, setSelectedRole] = useState<UserRole>(user.role);
    
    const userDocRef = useMemo(() => doc(db, 'users', user.uid), [db, user.uid]);

    const handleRoleChange = async () => {
        setIsSubmitting(true);
        try {
            await updateDoc(userDocRef, { role: selectedRole });
            toast({ title: t('roleUpdatedTitle'), description: t('roleUpdatedMessage', { name: user.fullName, role: t(`role${selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1)}` as any) }) });
            setIsRoleDialogOpen(false);
        } catch (error) {
            console.error("Failed to update role:", error);
            toast({ variant: 'destructive', title: t('errorTitle'), description: t('roleUpdateError') });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleStatusToggle = async () => {
        const newStatus = user.status === 'suspended' ? 'active' : 'suspended';
        setIsSubmitting(true);
        try {
            await updateDoc(userDocRef, { status: newStatus });
            toast({ title: t('statusUpdatedTitle'), description: t('statusUpdatedMessage', { name: user.fullName, status: newStatus === 'active' ? t('active') : t('banned') }) });
        } catch (error) {
            console.error("Failed to toggle status:", error);
            toast({ variant: 'destructive', title: t('errorTitle'), description: t('statusUpdateError') });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteUser = async () => {
        setIsSubmitting(true);
        const auth = getAuth();
        const adminUser = auth.currentUser;

        if (!adminUser) {
            toast({ variant: "destructive", title: t('authErrorTitle'), description: t('adminNotConnected') });
            setIsSubmitting(false);
            return;
        }

        try {
            const token = await adminUser.getIdToken();
            const result = await deleteUserAccount({ userId: user.uid, idToken: token });
            
            if (result.success) {
                toast({ title: t('userDeletedTitle'), description: t('userDeletedMessage', { name: user.fullName }) });
                setIsDeleteAlertOpen(false);
            } else {
                throw new Error(result.error || 'Unknown error');
            }
        } catch (error: any) {
            console.error("Failed to delete user:", error);
            toast({ variant: "destructive", title: t('deleteErrorTitle'), description: error.message || t('deleteErrorMessage') });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleStartChat = async () => {
        if (!adminId || adminId === user.uid) return;

        const chatsRef = collection(db, 'chats');
        const sortedParticipants = [adminId, user.uid].sort();
        
        const q = query(chatsRef, where('participants', '==', sortedParticipants));
        
        try {
            const querySnapshot = await getDocs(q);
            let chatId: string | null = null;
            if (!querySnapshot.empty) {
                chatId = querySnapshot.docs[0].id;
            } else {
                const newChatRef = doc(collection(db, 'chats'));
                await setDoc(newChatRef, {
                    participants: sortedParticipants,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                    lastMessage: `Conversation initiée par un administrateur.`,
                });
                chatId = newChatRef.id;
            }
            router.push(`/messages/${chatId}`);
        } catch (error) {
            console.error("Error starting chat:", error);
            toast({ variant: 'destructive', title: 'Erreur de messagerie', description: 'Impossible de démarrer la conversation.' });
        }
    };
    
    const handleCongratulate = async () => {
        setIsSubmitting(true);
        try {
            const result = await sendEncouragementMessage({ studentId: user.uid });
            if (result.success) {
                toast({ title: t('congrats_sent_title'), description: t('congrats_sent_desc', { name: user.fullName }) });
            } else {
                throw new Error(result.error);
            }
        } catch (error: any) {
             toast({ variant: 'destructive', title: t('errorTitle'), description: error.message || t('congrats_sent_error') });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Ouvrir le menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="dark:bg-slate-800 dark:border-slate-700 dark:text-white">
                    <DropdownMenuLabel>{t('actions')}</DropdownMenuLabel>
                    <DropdownMenuItem onSelect={handleCongratulate} disabled={isSubmitting} className="cursor-pointer dark:focus:bg-slate-700">
                        <Sparkles className="mr-2 h-4 w-4 text-amber-400" />
                        {t('congratulate')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={handleStartChat} className="cursor-pointer dark:focus:bg-slate-700">
                        <MessageSquare className="mr-2 h-4 w-4" />
                        {t('contact')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setIsRoleDialogOpen(true)} className="cursor-pointer dark:focus:bg-slate-700">
                        <UserCog className="mr-2 h-4 w-4"/>
                        {t('editRole')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={handleStatusToggle} disabled={isSubmitting} className="cursor-pointer dark:focus:bg-slate-700">
                        <Ban className="mr-2 h-4 w-4"/>
                        {user.status === 'suspended' ? t('reactivate') : t('suspend')}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="dark:bg-slate-700" />
                    <DropdownMenuItem onSelect={() => setIsDeleteAlertOpen(true)} className="text-destructive dark:text-red-400 cursor-pointer dark:focus:bg-destructive/10 dark:focus:text-red-400">
                        <Trash2 className="mr-2 h-4 w-4"/>
                        {t('delete')}
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
            
            {/* Role Change Dialog */}
            <Dialog open={isRoleDialogOpen} onOpenChange={setIsRoleDialogOpen}>
                <DialogContent className="dark:bg-slate-800 dark:border-slate-700">
                    <DialogHeader>
                        <DialogTitle className="dark:text-white">{t('editRoleFor', { name: user.fullName })}</DialogTitle>
                        <DialogDescription className="dark:text-slate-400">
                            {t('editRoleDescription')}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Select value={selectedRole} onValueChange={(value: UserRole) => setSelectedRole(value)}>
                            <SelectTrigger className="dark:bg-slate-700 dark:border-slate-600 dark:text-white">
                                <SelectValue placeholder={t('chooseRole')} />
                            </SelectTrigger>
                            <SelectContent className="dark:bg-slate-800 dark:border-slate-700 dark:text-white">
                                <SelectItem value="student" className="cursor-pointer dark:focus:bg-slate-700">{t('roleStudent')}</SelectItem>
                                <SelectItem value="instructor" className="cursor-pointer dark:focus:bg-slate-700">{t('roleInstructor')}</SelectItem>
                                <SelectItem value="admin" className="cursor-pointer dark:focus:bg-slate-700">{t('roleAdmin')}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsRoleDialogOpen(false)} className="dark:hover:bg-slate-700">{t('cancelButton')}</Button>
                        <Button onClick={handleRoleChange} disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {t('confirmButton')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Alert */}
            <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
                <AlertDialogContent className="dark:bg-slate-800 dark:border-slate-700">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="dark:text-white">{t('deleteUserConfirmationTitle')}</AlertDialogTitle>
                        <AlertDialogDescription className="dark:text-slate-400">
                             {t('deleteUserConfirmationMessage', { name: user.fullName })}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="dark:bg-slate-700 dark:hover:bg-slate-600">{t('cancelButton')}</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteUser} className="bg-destructive hover:bg-destructive/90">
                             {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : t('deleteButton')}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
};


export default function AdminUsersPage() {
  const { t } = useTranslation();
  const { formaAfriqueUser: adminUser, isUserLoading } = useRole();
  const db = getFirestore();
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const usersQuery = useMemoFirebase(
    () => query(collection(db, 'users'), where('role', 'in', ['student', 'instructor', 'admin'])),
    [db]
  );
  const { data: users, isLoading: usersLoading } = useCollection<FormaAfriqueUser & {createdAt?: any; status?: 'active' | 'suspended'}>(usersQuery);

  const filteredUsers = useMemo(() => {
    if (!users) return [];
    if (!debouncedSearchTerm) return users;
    return users.filter(user =>
      user.fullName?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
    );
  }, [users, debouncedSearchTerm]);

  const isLoading = isUserLoading || usersLoading;

  if (adminUser?.role !== 'admin') {
    return <div className="p-8 text-center">{t('unauthorizedAccess')}</div>;
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4">
      <header>
        <h1 className="text-3xl font-bold dark:text-white">{t('navUsers')}</h1>
        <p className="text-muted-foreground dark:text-slate-400">{t('manageUsersDescription')}</p>
      </header>

      <Card className="dark:bg-[#1e293b] dark:border-slate-700">
        <CardHeader>
          <CardTitle className="dark:text-white">{t('user_list')}</CardTitle>
          <CardDescription className="dark:text-slate-400">
            {t('allRegisteredUsers')}
          </CardDescription>
          <div className="relative pt-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('search_placeholder')}
              className="max-w-sm pl-10 dark:bg-slate-700 dark:border-slate-600"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table className="hidden md:table">
              <TableHeader>
                <TableRow className="dark:hover:bg-slate-700/50 dark:border-slate-700">
                  <TableHead className="dark:text-slate-400">{t('name')}</TableHead>
                  <TableHead className="hidden md:table-cell dark:text-slate-400">{t('emailLabel')}</TableHead>
                  <TableHead className="hidden lg:table-cell dark:text-slate-400">{t('role')}</TableHead>
                  <TableHead className="hidden sm:table-cell dark:text-slate-400">{t('status')}</TableHead>
                  <TableHead className="text-right dark:text-slate-400">{t('actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
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
                      <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto dark:bg-slate-700" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredUsers.length > 0 ? (
                  filteredUsers.map((user) => (
                    <TableRow key={user.uid} className="dark:hover:bg-slate-700/50 dark:border-slate-700 tv:focus-within:bg-slate-700/50 tv:focus-within:scale-105 transition-transform duration-200">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarImage src={user.profilePictureURL} alt={user.fullName} />
                            <AvatarFallback>{user.fullName?.charAt(0) || 'U'}</AvatarFallback>
                          </Avatar>
                          <div>
                            <span className="font-medium dark:text-slate-100">{user.fullName}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground hidden md:table-cell dark:text-slate-400">{user.email}</TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <Badge variant={getRoleBadgeVariant(user.role)} className="capitalize">
                          {t(`role${user.role.charAt(0).toUpperCase() + user.role.slice(1)}` as any)}
                        </Badge>
                      </TableCell>
                       <TableCell className="hidden sm:table-cell">
                          <Badge variant={getStatusBadgeVariant(user.status)} className={cn(user.status !== 'suspended' && 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300')}>
                            {user.status === 'suspended' ? t('banned') : t('active')}
                          </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                          <UserActions user={user} adminId={adminUser?.uid} />
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow className="dark:border-slate-700">
                    <TableCell colSpan={5} className="h-48 text-center">
                      <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground dark:text-slate-400">
                          <UserX className="h-12 w-12" />
                          <p className="font-medium">{t('noUsersFound')}</p>
                          <p className="text-sm">
                              {searchTerm 
                                  ? t('noResultsFor', { term: searchTerm })
                                  : t('noUsersYet')
                              }
                          </p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            
            {/* Mobile Card View */}
            <div className="grid grid-cols-1 gap-4 md:hidden">
                 {isLoading ? (
                  [...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-32 w-full dark:bg-slate-800" />
                  ))
                 ) : filteredUsers.length > 0 ? (
                    filteredUsers.map(user => (
                        <Card key={user.uid} className="dark:bg-slate-800 dark:border-slate-700">
                            <CardContent className="p-4 flex items-center gap-4">
                                <Avatar className="h-12 w-12">
                                    <AvatarImage src={user.profilePictureURL} alt={user.fullName} />
                                    <AvatarFallback>{user.fullName?.charAt(0) || 'U'}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1">
                                    <p className="font-bold text-base dark:text-white">{user.fullName}</p>
                                    <p className="text-xs text-muted-foreground dark:text-slate-400">{user.email}</p>
                                    <div className="flex items-center gap-2 mt-2">
                                        <Badge variant={getRoleBadgeVariant(user.role)} className="capitalize">{t(`role${user.role.charAt(0).toUpperCase() + user.role.slice(1)}` as any)}</Badge>
                                        <Badge variant={getStatusBadgeVariant(user.status)} className={cn(user.status !== 'suspended' && 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300')}>
                                            {user.status === 'suspended' ? t('banned') : t('active')}
                                        </Badge>
                                    </div>
                                </div>
                                <UserActions user={user} adminId={adminUser?.uid} />
                            </CardContent>
                        </Card>
                    ))
                 ) : null}
            </div>

          </div>
        </CardContent>
      </Card>
    </div>
  );
}

    
