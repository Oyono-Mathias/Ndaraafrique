
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRole } from '@/context/RoleContext';
import {
  getFirestore,
  collection,
  query,
  orderBy,
  where,
  onSnapshot,
  getDocs
} from 'firebase/firestore';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, History, User, BookOpen, Landmark, AlertTriangle } from 'lucide-react';
import type { AdminAuditLog, NdaraUser } from '@/lib/types';
import { useDebounce } from '@/hooks/use-debounce';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';


const eventTypeMap = {
    'user.status.update': { label: "Statut utilisateur", icon: User },
    'user.role.update': { label: "Rôle utilisateur", icon: User },
    'course.moderation': { label: "Modération cours", icon: BookOpen },
    'payout.process': { label: "Traitement retrait", icon: Landmark },
    'security.resolve': { label: "Résolution alerte", icon: AlertTriangle },
};

const LogIcon = ({ eventType }: { eventType: AdminAuditLog['eventType'] }) => {
    const Icon = eventTypeMap[eventType]?.icon || History;
    return <Icon className="h-4 w-4 text-muted-foreground" />;
}

export default function AdminLogsPage() {
  const { currentUser, isUserLoading } = useRole();
  const db = getFirestore();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  
  const [logs, setLogs] = useState<AdminAuditLog[]>([]);
  const [admins, setAdmins] = useState<Map<string, NdaraUser>>(new Map());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isUserLoading || currentUser?.role !== 'admin') {
      if(!isUserLoading) setIsLoading(false);
      return;
    }

    let q = query(collection(db, 'admin_audit_logs'), orderBy('timestamp', 'desc'));
    if (filterType !== 'all') {
        q = query(q, where('eventType', '==', filterType));
    }
    
    const unsubscribe = onSnapshot(q, async (snapshot) => {
        const logsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AdminAuditLog));
        setLogs(logsData);
        
        const adminIds = [...new Set(logsData.map(log => log.adminId))];
        if (adminIds.length > 0) {
            const newAdminsMap = new Map(admins);
            const idsToFetch = adminIds.filter(id => !newAdminsMap.has(id));
            
            if (idsToFetch.length > 0) {
                const usersQuery = query(collection(db, 'users'), where('uid', 'in', idsToFetch.slice(0, 30)));
                const usersSnap = await getDocs(usersQuery);
                usersSnap.forEach(doc => newAdminsMap.set(doc.data().uid, doc.data() as NdaraUser));
                setAdmins(newAdminsMap);
            }
        }
        setIsLoading(false);
    });

    return () => unsubscribe();
  }, [db, filterType, admins, currentUser, isUserLoading]);

  const filteredLogs = useMemo(() => {
    if (!debouncedSearchTerm) return logs;
    return logs.filter(log =>
      log.details.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
      log.target.id.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
    );
  }, [logs, debouncedSearchTerm]);


  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold dark:text-white">Journal d'Audit</h1>
        <p className="text-muted-foreground dark:text-slate-400">Suivi de toutes les actions administratives sur la plateforme.</p>
      </header>

      <Card className="dark:bg-slate-800 dark:border-slate-700">
        <CardHeader>
          <CardTitle className="dark:text-white">Historique des actions</CardTitle>
          <div className="flex flex-col sm:flex-row gap-2 pt-4">
            <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher par détails ou ID..."
                  className="pl-10 dark:bg-slate-700 dark:border-slate-600"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
             <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-full sm:w-[200px] dark:bg-slate-700 dark:border-slate-600">
                    <SelectValue placeholder="Filtrer par type" />
                </SelectTrigger>
                <SelectContent className="dark:bg-slate-800 dark:border-slate-700">
                    <SelectItem value="all">Tous les types</SelectItem>
                    {Object.entries(eventTypeMap).map(([key, { label }]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="dark:hover:bg-slate-700/50 dark:border-slate-700">
                  <TableHead className="dark:text-slate-400">Action</TableHead>
                  <TableHead className="dark:text-slate-400">Administrateur</TableHead>
                  <TableHead className="dark:text-slate-400">Date</TableHead>
                  <TableHead className="hidden md:table-cell dark:text-slate-400">Détails</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  [...Array(5)].map((_, i) => (
                    <TableRow key={i} className="dark:border-slate-700">
                      <TableCell><div className="flex items-center gap-3"><Skeleton className="h-5 w-32 dark:bg-slate-700" /></div></TableCell>
                      <TableCell><Skeleton className="h-4 w-28 dark:bg-slate-700" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24 dark:bg-slate-700" /></TableCell>
                      <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-full dark:bg-slate-700" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredLogs.length > 0 ? (
                  filteredLogs.map((log) => {
                    const admin = admins.get(log.adminId);
                    return (
                        <TableRow key={log.id} className="dark:hover:bg-slate-700/50 dark:border-slate-700">
                          <TableCell>
                              <div className="flex items-center gap-3">
                                <LogIcon eventType={log.eventType} />
                                <span className="font-semibold text-sm dark:text-white">{eventTypeMap[log.eventType]?.label || log.eventType}</span>
                              </div>
                          </TableCell>
                           <TableCell>
                               <div className="flex items-center gap-2">
                                 <Avatar className="h-6 w-6">
                                    <AvatarImage src={admin?.profilePictureURL} />
                                    <AvatarFallback className="text-xs">{admin?.fullName?.charAt(0)}</AvatarFallback>
                                 </Avatar>
                                 <span className="text-sm dark:text-slate-300">{admin?.fullName || log.adminId}</span>
                               </div>
                           </TableCell>
                           <TableCell className="text-xs text-muted-foreground dark:text-slate-400">
                               {log.timestamp ? format(log.timestamp.toDate(), 'dd MMM yy, HH:mm', { locale: fr }) : 'N/A'}
                           </TableCell>
                           <TableCell className="hidden md:table-cell text-sm text-muted-foreground dark:text-slate-500">
                               {log.details}
                           </TableCell>
                        </TableRow>
                    )
                  })
                ) : (
                   <TableRow>
                    <TableCell colSpan={5} className="h-48 text-center text-muted-foreground dark:text-slate-400">
                        <History className="mx-auto h-12 w-12" />
                        <p className="mt-2 font-medium">Aucun journal trouvé</p>
                        <p className="text-sm">
                           Aucun enregistrement ne correspond à vos filtres.
                        </p>
                    </TableCell>
                   </TableRow>
                )}
              </TableBody>
            </Table>
        </CardContent>
      </Card>
    </div>
  );
}
