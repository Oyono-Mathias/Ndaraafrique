
'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getFirestore, collection, query, orderBy, doc, updateDoc, getDocs, limit, where, startAfter, QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { MoreHorizontal, Search, UserX, Loader2, UserCog, Trash2, Ban, Upload, CheckCircle, AlertTriangle, MessageSquare, Gift, FileUp, User as UserIcon } from 'lucide-react';
import type { NdaraUser, Course, UserRole } from '@/lib/types';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';
import React from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { startChat } from '@/lib/chat';
import { useCollection, useMemoFirebase } from '@/firebase';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm } from "react-hook-form";
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useDebounce } from '@/hooks/use-debounce';

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


// --- UI COMPONENTS ---
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
          <DropdownMenuItem onClick={() => router.push(`/admin/users/${user.uid}`)} className="cursor-pointer dark:focus:bg-slate-700">
            <UserIcon className="mr-2 h-4 w-4"/>
            Voir le profil
          </DropdownMenuItem>
          <DropdownMenuSeparator className="dark:bg-slate-700" />
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
    
    const coursesQuery = useMemoFirebase(() => query(collection(db, 'courses'), where('status', '==', 'Published')), [db]);
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

const ImportUsersDialog = ({ isOpen, onOpenChange }: { isOpen: boolean, onOpenChange: (open: boolean) => void }) => {
    const [step, setStep] = useState<'select' | 'preview' | 'importing' | 'report'>('select');
    const [usersToImport, setUsersToImport] = useState<any[]>([]);
    const [importResults, setImportResults] = useState<{ email: string, status: string, error?: string }[]>([]);
    const [fileName, setFileName] = useState('');
    const [error, setError] = useState<string | null>(null);
    const { currentUser } = useRole();
    const { toast } = useToast();

    useEffect(() => {
        if (!isOpen) {
            // Reset state when modal closes
            setTimeout(() => {
                setStep('select');
                setUsersToImport([]);
                setImportResults([]);
                setFileName('');
                setError(null);
            }, 300);
        }
    }, [isOpen]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            parseFile(file);
        }
    };

    const parseFile = (file: File) => {
        setError(null);
        setFileName(file.name);
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const json = XLSX.utils.sheet_to_json(worksheet);

                // Validate data
                if (json.length > 0 && ('fullName' in json[0] && 'email' in json[0])) {
                    setUsersToImport(json);
                    setStep('preview');
                } else {
                    setError("Fichier invalide. Assurez-vous qu'il contient les colonnes 'fullName' et 'email'.");
                }
            } catch (err) {
                setError("Erreur lors de l'analyse du fichier.");
                console.error(err);
            }
        };
        reader.readAsArrayBuffer(file);
    };

    const handleConfirmImport = async () => {
        if (!currentUser) return;
        setStep('importing');
        const result = await importUsersAction({ users: usersToImport, adminId: currentUser.uid });
        setImportResults(result.results);
        setStep('report');
    };

    const successCount = importResults.filter(r => r.status === 'success').length;
    const errorCount = importResults.filter(r => r.status === 'error').length;
    
    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl dark:bg-slate-900 dark:border-slate-800">
                <DialogHeader>
                    <DialogTitle className="dark:text-white">Importer des Utilisateurs</DialogTitle>
                    <DialogDescription className="dark:text-slate-400">
                        {step === 'select' && "Sélectionnez un fichier .xlsx ou .csv à importer."}
                        {step === 'preview' && `Aperçu des ${usersToImport.length} utilisateurs à importer.`}
                        {step === 'importing' && "Importation en cours, veuillez patienter..."}
                        {step === 'report' && "Rapport d'importation."}
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    {step === 'select' && (
                        <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer hover:bg-slate-800/50 dark:border-slate-700">
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                <FileUp className="w-10 h-10 mb-3 text-slate-400" />
                                <p className="text-sm text-slate-400"><span className="font-semibold text-primary">Cliquez pour téléverser</span> ou glissez-déposez</p>
                                <p className="text-xs text-slate-500">XLSX, CSV (max. 5MB)</p>
                            </div>
                            <Input id="dropzone-file" type="file" className="hidden" onChange={handleFileChange} accept=".xlsx, .csv" />
                            {error && <p className="text-sm text-destructive mt-2">{error}</p>}
                        </label>
                    )}
                    {step === 'preview' && (
                         <div className="space-y-4">
                            <p className="text-sm">Fichier : <span className="font-semibold">{fileName}</span></p>
                            <div className="h-64 overflow-y-auto border rounded-lg dark:border-slate-700">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="dark:border-slate-700">
                                            <TableHead>Nom complet</TableHead><TableHead>Email</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {usersToImport.slice(0, 100).map((user, i) => (
                                            <TableRow key={i}><TableCell>{user.fullName}</TableCell><TableCell>{user.email}</TableCell></TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                         </div>
                    )}
                     {step === 'importing' && (
                        <div className="flex flex-col items-center justify-center h-48 text-center">
                            <Loader2 className="h-12 w-12 animate-spin text-primary" />
                            <p className="mt-4 text-lg font-semibold">Création des comptes...</p>
                            <p className="text-sm text-slate-400">Cela peut prendre quelques instants.</p>
                        </div>
                    )}
                    {step === 'report' && (
                        <div className="space-y-4">
                            <div className="p-4 rounded-lg bg-slate-800/50 border dark:border-slate-700 text-center">
                                <h3 className="text-xl font-bold text-white">Importation Terminée</h3>
                                <div className="flex justify-center gap-8 mt-2">
                                    <div className="text-green-400"><span className="font-bold text-2xl">{successCount}</span> Succès</div>
                                    <div className="text-red-400"><span className="font-bold text-2xl">{errorCount}</span> Erreurs</div>
                                </div>
                            </div>
                            {errorCount > 0 && (
                                <div className="h-48 overflow-y-auto border rounded-lg p-2 dark:border-slate-700">
                                     {importResults.filter(r => r.status === 'error').map((res, i) => (
                                        <div key={i} className="text-xs p-2 rounded bg-red-900/50">
                                           <span className="font-bold">{res.email}:</span> {res.error?.includes('email-already-exists') ? 'Email déjà utilisé' : res.error}
                                        </div>
                                     ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
                 <DialogFooter>
                    {step === 'preview' && (
                        <>
                            <Button variant="ghost" onClick={() => setStep('select')}>Annuler</Button>
                            <Button onClick={handleConfirmImport}>Confirmer l'import</Button>
                        </>
                    )}
                    {step === 'report' && (
                        <Button onClick={() => onOpenChange(false)}>Fermer</Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

// --- PAGE PRINCIPALE ---
export default function AdminUsersPage() {
  const [users, setUsers] = useState<NdaraUser[]>([]);
  const [lastVisible, setLastVisible] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [grantUser, setGrantUser] = useState<NdaraUser | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  
  const { currentUser, isUserLoading } = useRole();
  const db = getFirestore();
  const { toast } = useToast();
  const PAGE_SIZE = 50;

  const fetchUsers = useCallback(async (loadMore = false) => {
    if (!currentUser) return;

    if (loadMore) {
        setIsLoadingMore(true);
    } else {
        setIsLoading(true);
    }

    try {
        let q = query(collection(db, 'users'), orderBy('createdAt', 'desc'), limit(PAGE_SIZE));

        if (loadMore && lastVisible) {
            q = query(collection(db, 'users'), orderBy('createdAt', 'desc'), startAfter(lastVisible), limit(PAGE_SIZE));
        }

        const documentSnapshots = await getDocs(q);
        const newUsers = documentSnapshots.docs.map(doc => doc.data() as NdaraUser);
        
        setHasMore(newUsers.length === PAGE_SIZE);
        setLastVisible(documentSnapshots.docs[documentSnapshots.docs.length - 1]);
        setUsers(prev => loadMore ? [...prev, ...newUsers] : newUsers);

    } catch (error) {
        console.error("Error fetching users: ", error);
        toast({ variant: 'destructive', title: 'Erreur', description: "Impossible de charger la liste des utilisateurs." });
    } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
    }
  }, [db, currentUser, toast, lastVisible]);
  
  useEffect(() => {
    if(currentUser) {
        fetchUsers();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);


  const onUserUpdate = useCallback((userId: string, update: Partial<NdaraUser>) => {
      setUsers(prevUsers => {
          if (update.status === 'deleted' as any) {
              return prevUsers.filter(u => u.uid !== userId);
          }
          return prevUsers.map(u => u.uid === userId ? { ...u, ...update } : u);
      });
  }, []);

  const filteredUsers = useMemo(() => {
    return users.filter(user =>
      user.fullName?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
    );
  }, [users, debouncedSearchTerm]);
  
  const finalLoading = isLoading || isUserLoading;

  return (
    <>
      <div className="space-y-6">
        <header className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold dark:text-white">Utilisateurs</h1>
            <p className="text-muted-foreground dark:text-slate-400">Gérez les membres de la plateforme.</p>
          </div>
           <Button onClick={() => setIsImportModalOpen(true)}>
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
                   {finalLoading ? <UserTableSkeleton /> : filteredUsers.length > 0 ? (
                        filteredUsers.map(user => (
                            <TableRow key={user.uid} className={cn("dark:border-slate-700", isUpdating && "opacity-50")}>
                                <TableCell>
                                    <div className="flex items-center gap-3">
                                        <Avatar className="h-10 w-10 border dark:border-slate-600">
                                            <AvatarImage src={user.profilePictureURL} alt={user.fullName} />
                                            <AvatarFallback>{user.fullName?.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <p className="font-semibold text-sm dark:text-white">{user.fullName}</p>
                                            <p className="text-xs text-muted-foreground dark:text-slate-400">@{user.username}</p>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell className="text-sm dark:text-slate-300">{user.email}</TableCell>
                                <TableCell><Badge variant={getRoleBadgeVariant(user.role)} className="capitalize">{user.role}</Badge></TableCell>
                                <TableCell><Badge variant={getStatusBadgeVariant(user.status)}>{user.status === 'suspended' ? 'Suspendu' : 'Actif'}</Badge></TableCell>
                                <TableCell className="text-xs text-muted-foreground dark:text-slate-400">{user.createdAt ? format(user.createdAt.toDate(), 'dd MMM yyyy', { locale: fr }) : 'N/A'}</TableCell>
                                <TableCell className="text-right">
                                    <UserActions 
                                        user={user} 
                                        adminId={currentUser?.uid || ''}
                                        onActionStart={() => setIsUpdating(true)} 
                                        onActionEnd={() => setIsUpdating(false)}
                                        onUserUpdate={onUserUpdate}
                                        onGrantAccess={setGrantUser}
                                    />
                                </TableCell>
                            </TableRow>
                        ))
                    ) : (
                        <TableRow><TableCell colSpan={6} className="h-48 text-center text-muted-foreground dark:text-slate-400">
                            <UserX className="mx-auto h-12 w-12" />
                            <p className="mt-2 font-medium">Aucun utilisateur trouvé</p>
                        </TableCell></TableRow>
                    )}
                </TableBody>
              </Table>
            </div>
            
             {/* Mobile Card View */}
             <div className="md:hidden space-y-4">
                {finalLoading ? <UserCardSkeleton /> : filteredUsers.length > 0 ? (
                    filteredUsers.map(user => (
                        <Card key={user.uid} className="p-4 dark:bg-slate-900/50 dark:border-slate-700">
                             <div className="flex items-start gap-4">
                                <Avatar className="h-10 w-10">
                                    <AvatarImage src={user.profilePictureURL} alt={user.fullName} />
                                    <AvatarFallback>{user.fullName?.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1">
                                    <p className="font-bold text-sm text-white">{user.fullName}</p>
                                    <p className="text-xs text-muted-foreground dark:text-slate-400">{user.email}</p>
                                </div>
                                 <UserActions 
                                    user={user} 
                                    adminId={currentUser?.uid || ''}
                                    onActionStart={() => setIsUpdating(true)} 
                                    onActionEnd={() => setIsUpdating(false)}
                                    onUserUpdate={onUserUpdate}
                                    onGrantAccess={setGrantUser}
                                />
                            </div>
                            <div className="flex items-center justify-between mt-4 pt-3 border-t dark:border-slate-800">
                                <Badge variant={getRoleBadgeVariant(user.role)} className="capitalize">{user.role}</Badge>
                                <Badge variant={getStatusBadgeVariant(user.status)}>{user.status === 'suspended' ? 'Suspendu' : 'Actif'}</Badge>
                                <span className="text-xs text-muted-foreground">{user.createdAt ? format(user.createdAt.toDate(), 'dd/MM/yy') : 'N/A'}</span>
                            </div>
                        </Card>
                    ))
                ) : (
                    <div className="h-48 text-center flex flex-col items-center justify-center text-muted-foreground dark:text-slate-400">
                        <UserX className="mx-auto h-12 w-12" />
                        <p className="font-medium">Aucun utilisateur trouvé</p>
                    </div>
                )}
             </div>
             {hasMore && !finalLoading && (
                <div className="mt-6 text-center">
                    <Button onClick={() => fetchUsers(true)} disabled={isLoadingMore}>
                        {isLoadingMore ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                        Charger plus
                    </Button>
                </div>
             )}
          </CardContent>
        </Card>
      </div>
      <GrantAccessDialog user={grantUser} isOpen={!!grantUser} onOpenChange={() => setGrantUser(null)} />
      <ImportUsersDialog isOpen={isImportModalOpen} onOpenChange={setIsImportModalOpen} />
    </>
  );
}

    