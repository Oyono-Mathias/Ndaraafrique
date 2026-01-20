
'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getFirestore, collection, query, orderBy, doc, updateDoc, getDocs, limit, where } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { useRole } from '@/context/RoleContext';
import { deleteUserAccount, importUsersAction, updateUserStatus, grantCourseAccess, updateUserRole } from '@/actions/userActions';
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
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent
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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { MoreHorizontal, Search, UserX, Loader2, UserCog, Trash2, Ban, Upload, CheckCircle, AlertTriangle, MessageSquare, Gift } from 'lucide-react';
import type { NdaraUser, Course, UserRole } from '@/lib/types';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';
import React from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { startChat } from '@/lib/chat';
import { useCollection } from '@/firebase';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

// --- SKELETON LOADERS ---
const UserTableSkeleton = () => (
    <React.Fragment>
      {[...Array(5)].map((_, i) => (
        <TableRow key={i} className="dark:border-slate-700">
          <TableCell>
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full dark:bg-slate-700" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-24 dark:bg-slate-700" />
                <Skeleton className="h-3 w-32 dark:bg-slate-700" />
              </div>
            </div>
          </TableCell>
          <TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-48 dark:bg-slate-700" /></TableCell>
          <TableCell className="hidden sm:table-cell"><Skeleton className="h-6 w-20 rounded-full dark:bg-slate-700" /></TableCell>
          <TableCell className="hidden md:table-cell"><Skeleton className="h-6 w-20 rounded-full dark:bg-slate-700" /></TableCell>
          <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-24 dark:bg-slate-700" /></TableCell>
          <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto dark:bg-slate-700" /></TableCell>
        </TableRow>
      ))}
    </React.Fragment>
);

const UserCardSkeleton = () => (
    <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
             <Card key={i} className="p-4 dark:bg-slate-900/50 dark:border-slate-700">
                <div className="flex items-start gap-4">
                    <Skeleton className="h-10 w-10 rounded-full dark:bg-slate-700" />
                    <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-3/5 dark:bg-slate-700" />
                        <Skeleton className="h-3 w-4/5 dark:bg-slate-700" />
                    </div>
                     <Skeleton className="h-8 w-8 rounded-md dark:bg-slate-700" />
                </div>
                <div className="flex items-center justify-between mt-4 pt-3 border-t dark:border-slate-800">
                    <Skeleton className="h-5 w-16 rounded-full dark:bg-slate-700" />
                    <Skeleton className="h-5 w-20 rounded-full dark:bg-slate-700" />
                </div>
            </Card>
        ))}
    </div>
);


// --- COMPOSANTS DE L'INTERFACE ---
const getRoleBadgeVariant = (role: NdaraUser['role']) => {
  switch (role) {
    case 'admin': return 'destructive';
    case 'instructor': return 'default';
    default: return 'secondary';
  }
};

const getStatusBadgeVariant = (status: NdaraUser['status'] = 'active') => {
  return status === 'suspended' ? 'destructive' : 'default';
};

const UserActions = ({ user, adminId, onActionStart, onActionEnd, onUserUpdate, onGrantAccess }: { user: NdaraUser, adminId: string, onActionStart: () => void, onActionEnd: () => void, onUserUpdate: (userId: string, update: Partial<NdaraUser>) => void, onGrantAccess: (user: NdaraUser) => void }) => {
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const { toast } = useToast();
  const db = getFirestore();
  const auth = getAuth();
  const router = useRouter();
  const { currentUser } = useRole();
  
  const handleContact = async () => {
    if (!currentUser) return;
    onActionStart();
    try {
        const chatId = await startChat(currentUser.uid, user.uid);
        router.push(`/messages/${chatId}`);
    } catch (error: any) {
        toast({
            variant: "destructive",
            title: "Erreur de messagerie",
            description: error.message,
        });
    } finally {
        onActionEnd();
    }
  };

  const handleDelete = async () => {
    onActionStart();
    const adminUser = auth.currentUser;
    if (!adminUser) {
        toast({ variant: 'destructive', title: "Erreur", description: "Vous n'êtes pas authentifié en tant qu'administrateur." });
        onActionEnd();
        return;
    }
    const idToken = await adminUser.getIdToken();
    const result = await deleteUserAccount({ userId: user.uid, idToken });
    if (result.success) {
        toast({ title: "Utilisateur supprimé", description: `${user.fullName} a été supprimé.` });
        onUserUpdate(user.uid, { status: 'deleted' } as any); // Optimistic update
    } else {
        toast({ variant: 'destructive', title: "Erreur de suppression", description: result.error });
    }
    onActionEnd();
  };

  const handleUpdate = async (field: 'role' | 'status', value: string) => {
    onActionStart();
    if (field === 'status') {
      const result = await updateUserStatus({ userId: user.uid, status: value as 'active' | 'suspended', adminId });
      if (result.success) {
        toast({ title: "Mise à jour réussie", description: `Le statut de ${user.fullName} a été mis à jour.`});
        onUserUpdate(user.uid, { status: value as 'active' | 'suspended' });
      } else {
        toast({ variant: 'destructive', title: "Erreur", description: result.error });
      }
    } else if (field === 'role') {
        const result = await updateUserRole({ userId: user.uid, role: value as UserRole, adminId });
        if (result.success) {
            toast({ title: "Mise à jour réussie", description: `Le rôle de ${user.fullName} a été mis à jour.` });
            onUserUpdate(user.uid, { role: value as UserRole });
        } else {
            toast({ variant: 'destructive', title: "Erreur", description: result.error });
        }
    }
    onActionEnd();
  }

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
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuItem onClick={handleContact} className="cursor-pointer dark:focus:bg-slate-700">
            <MessageSquare className="mr-2 h-4 w-4"/>
            Contacter
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onGrantAccess(user)} className="cursor-pointer dark:focus:bg-slate-700">
            <Gift className="mr-2 h-4 w-4"/>
            Offrir un cours
          </DropdownMenuItem>
           <DropdownMenuSub>
            <DropdownMenuSubTrigger className="cursor-pointer dark:focus:bg-slate-700">
              <UserCog className="mr-2 h-4 w-4"/>
              Changer le rôle
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="dark:bg-slate-800 dark:border-slate-700">
              <DropdownMenuItem onClick={() => handleUpdate('role', 'student')} className="cursor-pointer dark:focus:bg-slate-700">Étudiant</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleUpdate('role', 'instructor')} className="cursor-pointer dark:focus:bg-slate-700">Instructeur</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleUpdate('role', 'admin')} className="cursor-pointer dark:focus:bg-slate-700">Admin</DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuItem onClick={() => handleUpdate('status', user.status === 'suspended' ? 'active' : 'suspended')} className="cursor-pointer dark:focus:bg-slate-700">
            <Ban className="mr-2 h-4 w-4"/>
            {user.status === 'suspended' ? 'Réactiver' : 'Suspendre'}
          </DropdownMenuItem>
          <DropdownMenuSeparator className="dark:bg-slate-700" />
          <DropdownMenuItem onClick={() => setIsAlertOpen(true)} className="text-destructive dark:text-red-400 cursor-pointer dark:focus:bg-destructive/10 dark:focus:text-red-400">
            <Trash2 className="mr-2 h-4 w-4"/>
            Supprimer
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      
       <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
          <AlertDialogContent>
              <AlertDialogHeader>
                  <AlertDialogTitle>Supprimer {user.fullName} ?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Cette action est irréversible et supprimera définitivement le compte et toutes les données associées.
                  </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
                      Supprimer
                  </AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

const grantAccessSchema = z.object({
  courseId: z.string().min(1, "Veuillez sélectionner un cours."),
  reason: z.string().min(10, "Veuillez fournir une brève raison."),
  expirationInDays: z.coerce.number().int().min(1, "La durée doit être d'au moins 1 jour.").optional().or(z.literal('')),
});

const GrantAccessDialog = ({ user, isOpen, onOpenChange }: { user: NdaraUser | null, isOpen: boolean, onOpenChange: () => void }) => {
    const db = getFirestore();
    const { currentUser: adminUser } = useRole();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const coursesQuery = useMemo(() => query(collection(db, 'courses'), where('status', '==', 'Published')), [db]);
    const { data: courses, isLoading: coursesLoading } = useCollection<Course>(coursesQuery);

    const form = useForm<z.infer<typeof grantAccessSchema>>({
        resolver: zodResolver(grantAccessSchema),
    });
    
    useEffect(() => {
        if (!isOpen) {
            form.reset();
        }
    }, [isOpen, form]);

    const onSubmit = async (values: z.infer<typeof grantAccessSchema>) => {
        if (!user || !adminUser) return;
        setIsSubmitting(true);
        const result = await grantCourseAccess({
            studentId: user.uid,
            courseId: values.courseId,
            adminId: adminUser.uid,
            reason: values.reason,
            expirationInDays: values.expirationInDays ? Number(values.expirationInDays) : undefined,
        });

        if (result.success) {
            toast({ title: "Accès accordé !", description: `${user.fullName} a maintenant accès au cours.` });
            onOpenChange();
        } else {
            toast({ variant: 'destructive', title: 'Erreur', description: result.error });
        }
        setIsSubmitting(false);
    };

    if (!user) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="dark:bg-slate-900 dark:border-slate-800">
                <DialogHeader>
                    <DialogTitle className="dark:text-white">Offrir un cours à {user.fullName}</DialogTitle>
                    <DialogDescription className="dark:text-slate-400">Sélectionnez le cours à offrir gratuitement à cet utilisateur.</DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                        <FormField
                            control={form.control}
                            name="courseId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Cours</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger disabled={coursesLoading} className="dark:bg-slate-800 dark:border-slate-700">
                                                <SelectValue placeholder={coursesLoading ? "Chargement..." : "Sélectionner un cours"} />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent className="dark:bg-slate-800 dark:border-slate-700">
                                            {courses?.map(course => <SelectItem key={course.id} value={course.id}>{course.title}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="reason"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Raison</FormLabel>
                                    <FormControl>
                                        <Input {...field} placeholder="Ex: Gagnant du concours, partenaire..." className="dark:bg-slate-800 dark:border-slate-700" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="expirationInDays"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Durée d'accès (en jours)</FormLabel>
                                    <FormControl>
                                        <Input type="number" {...field} placeholder="Optionnel (ex: 30 pour 1 mois)" className="dark:bg-slate-800 dark:border-slate-700" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter>
                            <Button type="button" variant="ghost" onClick={onOpenChange}>Annuler</Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Offrir l'accès
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
};


// --- PAGE PRINCIPALE ---
export default function AdminUsersPage() {
  const [users, setUsers] = useState<NdaraUser[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [grantUser, setGrantUser] = useState<NdaraUser | null>(null);

  const onUserUpdate = (userId: string, update: Partial<NdaraUser>) => {
      setUsers(prevUsers => {
          if (update.status === 'deleted') {
              return prevUsers.filter(u => u.uid !== userId);
          }
          return prevUsers.map(u => u.uid === userId ? { ...u, ...update } : u);
      });
  };

  return (
    <div className="space-y-6">
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
          {/* Desktop Table View */}
          <div className="overflow-x-auto hidden md:block">
            <Table>
              <TableHeader>
                <TableRow className="dark:hover:bg-slate-700/50 dark:border-b dark:border-slate-700">
                  <TableHead className="dark:text-slate-400">Nom</TableHead>
                  <TableHead className="dark:text-slate-400">Email</TableHead>
                  <TableHead className="dark:text-slate-400">Rôle</TableHead>
                  <TableHead className="dark:text-slate-400">Statut</TableHead>
                  <TableHead className="dark:text-slate-400">Date d'inscription</TableHead>
                  <TableHead className="text-right dark:text-slate-400">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <UserTableSkeleton />
              </TableBody>
            </Table>
          </div>
          
           {/* Mobile Card View */}
           <div className="md:hidden space-y-4">
              <UserCardSkeleton />
           </div>

        </CardContent>
      </Card>
    </div>
  );
}
