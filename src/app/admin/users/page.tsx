
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCollection, useMemoFirebase } from '@/firebase';
import { getFirestore, collection, query, orderBy, doc, updateDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { useRole } from '@/context/RoleContext';
import { deleteUserAccount, importUsersAction } from '@/app/actions/userActions';
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
import { MoreHorizontal, Search, UserX, Loader2, UserCog, Trash2, Ban, Upload, CheckCircle, AlertTriangle } from 'lucide-react';
import type { FormaAfriqueUser } from '@/context/RoleContext';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';
import { useTranslation } from 'react-i18next';


// --- SKELETON LOADER ---
const UserTableSkeleton = () => (
    <>
      {[...Array(5)].map((_, i) => (
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
      ))}
    </>
);

// --- COMPOSANTS DE L'INTERFACE ---
const getRoleBadgeVariant = (role: FormaAfriqueUser['role']) => {
  switch (role) {
    case 'admin': return 'destructive';
    case 'instructor': return 'default';
    default: return 'secondary';
  }
};

const getStatusBadgeVariant = (status: FormaAfriqueUser['status'] = 'active') => {
  return status === 'suspended' ? 'destructive' : 'default';
};

const UserActions = ({ user, onActionStart, onActionEnd }: { user: FormaAfriqueUser, onActionStart: () => void, onActionEnd: () => void }) => {
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const { toast } = useToast();
  const db = getFirestore();
  const auth = getAuth();
  
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
    } else {
        toast({ variant: 'destructive', title: "Erreur de suppression", description: result.error });
    }
    onActionEnd();
  };

  const handleUpdate = async (field: 'role' | 'status', value: string) => {
    onActionStart();
    const userDocRef = doc(db, 'users', user.uid);
    try {
        await updateDoc(userDocRef, { [field]: value });
        toast({ title: "Mise à jour réussie", description: `Le ${field} de ${user.fullName} a été mis à jour.`});
    } catch (error) {
        console.error(`Error updating ${field}:`, error);
        toast({ variant: 'destructive', title: "Erreur", description: "Impossible de mettre à jour l'utilisateur."});
    } finally {
        onActionEnd();
    }
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
                  <AlertDialogTitle>Confirmer la suppression ?</AlertDialogTitle>
                  <AlertDialogDescription>
                      Cette action est irréversible. Elle supprimera définitivement l'utilisateur <strong>{user.fullName}</strong> de l'authentification et de la base de données.
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

const ImportUsersDialog = ({ isOpen, onOpenChange }: { isOpen: boolean, onOpenChange: (open: boolean) => void }) => {
    const { t } = useTranslation();
    const [file, setFile] = useState<File | null>(null);
    const [usersToImport, setUsersToImport] = useState<{ fullName: string; email: string }[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [importResults, setImportResults] = useState<{ email: string, status: 'success' | 'error', error?: string }[] | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            const reader = new FileReader();
            reader.onload = (event) => {
                const data = new Uint8Array(event.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const json = XLSX.utils.sheet_to_json<{ Nom: string; Email: string }>(worksheet);
                const parsedUsers = json.map(row => ({ fullName: row.Nom, email: row.Email }));
                setUsersToImport(parsedUsers);
            };
            reader.readAsArrayBuffer(selectedFile);
        }
    };
    
    const handleImport = async () => {
        setIsLoading(true);
        setImportResults(null);
        const result = await importUsersAction(usersToImport);
        setImportResults(result.results);
        setIsLoading(false);
    }
    
    const reset = () => {
        setFile(null);
        setUsersToImport([]);
        setImportResults(null);
    }

    return (
        <Dialog open={isOpen} onOpenChange={open => { if(!open) reset(); onOpenChange(open); }}>
            <DialogContent className="sm:max-w-2xl dark:bg-slate-900 dark:border-slate-800">
                <DialogHeader>
                    <DialogTitle className="dark:text-white">Importer des utilisateurs</DialogTitle>
                    <DialogDescription className="dark:text-slate-400">
                        Importez une liste d'étudiants via un fichier Excel (.xlsx). Le fichier doit contenir les colonnes "Nom" et "Email".
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                   {!importResults ? (
                     <>
                        <label htmlFor="import-file" className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-slate-800/50 dark:border-slate-700">
                            <div className="flex flex-col items-center justify-center pt-5 pb-6 text-slate-400">
                                <Upload className="w-8 h-8 mb-2" />
                                <p className="text-sm">{file ? file.name : "Cliquez pour choisir un fichier"}</p>
                            </div>
                            <Input id="import-file" type="file" className="hidden" accept=".xlsx" onChange={handleFileChange}/>
                        </label>
                        {usersToImport.length > 0 && (
                            <div className="text-sm text-slate-300">{usersToImport.length} utilisateur(s) trouvé(s) et prêt(s) à être importé(s).</div>
                        )}
                     </>
                   ) : (
                     <div className="max-h-64 overflow-y-auto space-y-2 p-2 rounded-lg bg-slate-800/50">
                        <h4 className="font-semibold text-white">Résultats de l'importation :</h4>
                         {importResults.map(res => (
                            <div key={res.email} className="flex justify-between items-center text-sm">
                                <span className="text-slate-300">{res.email}</span>
                                {res.status === 'success' ? <CheckCircle className="h-4 w-4 text-green-500" /> : <AlertTriangle className="h-4 w-4 text-red-500" title={res.error} />}
                            </div>
                         ))}
                     </div>
                   )}
                </div>
                 <DialogFooter>
                    {importResults ? (
                        <Button onClick={() => onOpenChange(false)}>Fermer</Button>
                    ) : (
                        <Button onClick={handleImport} disabled={usersToImport.length === 0 || isLoading}>
                            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Importer"}
                        </Button>
                    )}
                 </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};


// --- PAGE PRINCIPALE ---
export default function AdminUsersPage() {
  const db = getFirestore();
  const [searchTerm, setSearchTerm] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);

  const usersQuery = useMemoFirebase(() => query(collection(db, 'users'), orderBy('createdAt', 'desc')), [db]);
  const { data: users, isLoading, error } = useCollection<FormaAfriqueUser>(usersQuery);

  const filteredUsers = useMemo(() => {
    if (!users) return [];
    if (!searchTerm) return users;
    return users.filter(user =>
      user.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [users, searchTerm]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4">
      <header className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold dark:text-white">Utilisateurs</h1>
          <p className="text-muted-foreground dark:text-slate-400">Gérez les membres de la plateforme.</p>
        </div>
        <Button onClick={() => setIsImportOpen(true)}>
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
                      <TableRow key={user.uid} className={cn("dark:hover:bg-slate-700/50", isUpdating && 'opacity-50')}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarImage src={user.profilePictureURL} alt={user.fullName} />
                              <AvatarFallback>{user.fullName?.charAt(0)}</AvatarFallback>
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
                           {user.createdAt ? format((user.createdAt as any).toDate(), 'dd MMM yyyy', { locale: fr }) : 'N/A'}
                        </TableCell>
                        <TableCell className="text-right">
                          <UserActions user={user} onActionStart={() => setIsUpdating(true)} onActionEnd={() => setIsUpdating(false)} />
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
      <ImportUsersDialog isOpen={isImportOpen} onOpenChange={setIsImportOpen} />
    </div>
  );
}
