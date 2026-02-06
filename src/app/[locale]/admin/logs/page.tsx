'use client';

/**
 * @fileOverview Journal d'audit et de sécurité pour Ndara Afrique.
 * Permet de surveiller les actions critiques effectuées par les admins et le système.
 */

import { useState, useMemo } from 'react';
import { useCollection } from '@/firebase';
import { getFirestore, collection, query, orderBy, limit } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { History, ShieldAlert, ShieldCheck, UserCog, Database, CreditCard, Lock, Info } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { AdminAuditLog, SecurityLog } from '@/lib/types';
import { cn } from '@/lib/utils';

const LogIcon = ({ type }: { type: string }) => {
  if (type.includes('user')) return <UserCog className="h-4 w-4 text-blue-400" />;
  if (type.includes('course')) return <Database className="h-4 w-4 text-emerald-400" />;
  if (type.includes('payment') || type.includes('payout')) return <CreditCard className="h-4 w-4 text-amber-400" />;
  if (type.includes('security') || type.includes('suspicious')) return <Lock className="h-4 w-4 text-red-400" />;
  return <Info className="h-4 w-4 text-slate-400" />;
};

export default function AdminLogsPage() {
  const db = getFirestore();
  const [logType, setLogType] = useState<'audit' | 'security'>('audit');

  const auditQuery = useMemo(() => query(collection(db, 'admin_audit_logs'), orderBy('timestamp', 'desc'), limit(100)), [db]);
  const securityQuery = useMemo(() => query(collection(db, 'security_logs'), orderBy('timestamp', 'desc'), limit(100)), [db]);

  const { data: auditLogs, isLoading: loadingAudit } = useCollection<AdminAuditLog>(auditQuery);
  const { data: securityLogs, isLoading: loadingSecurity } = useCollection<SecurityLog>(securityQuery);

  const isLoading = loadingAudit || loadingSecurity;

  return (
    <div className="space-y-8 pb-20">
      <header className="flex flex-col sm:flex-row justify-between sm:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white uppercase tracking-tight">Journal Système</h1>
          <p className="text-slate-400">Suivez l'historique des actions et les alertes de sécurité.</p>
        </div>
        <div className="flex gap-2 p-1 bg-slate-900 rounded-xl border border-slate-800">
          <Button 
            variant={logType === 'audit' ? 'default' : 'ghost'} 
            onClick={() => setLogType('audit')}
            size="sm"
            className="rounded-lg font-bold text-xs"
          >
            <History className="mr-2 h-3.5 w-3.5" /> AUDIT ADMIN
          </Button>
          <Button 
            variant={logType === 'security' ? 'default' : 'ghost'} 
            onClick={() => setLogType('security')}
            size="sm"
            className="rounded-lg font-bold text-xs"
          >
            <ShieldAlert className="mr-2 h-3.5 w-3.5" /> SÉCURITÉ
          </Button>
        </div>
      </header>

      <Card className="bg-slate-900 border-slate-800 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-800 bg-slate-800/30">
                <TableHead className="text-[10px] font-black uppercase tracking-widest py-4">Événement</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest">Détails</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest">Auteur / Cible</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-right pr-6">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(8)].map((_, i) => (
                  <TableRow key={i}><TableCell colSpan={4}><Skeleton className="h-10 w-full bg-slate-800" /></TableCell></TableRow>
                ))
              ) : logType === 'audit' ? (
                auditLogs && auditLogs.length > 0 ? (
                  auditLogs.map(log => (
                    <TableRow key={log.id} className="border-slate-800 hover:bg-slate-800/20">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <LogIcon type={log.eventType} />
                          <Badge variant="outline" className="text-[9px] border-slate-700 bg-slate-800 text-slate-300">
                            {log.eventType.replace(/\./g, ' ')}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-slate-300 max-w-xs">{log.details}</TableCell>
                      <TableCell className="text-[10px] font-mono text-slate-500">
                        Admin: {log.adminId.substring(0, 8)}...
                      </TableCell>
                      <TableCell className="text-right pr-6 text-[10px] text-slate-500 font-bold uppercase">
                        {log.timestamp && typeof (log.timestamp as any).toDate === 'function' 
                          ? format((log.timestamp as any).toDate(), 'dd MMM, HH:mm', { locale: fr }) 
                          : 'Date...'}
                      </TableCell>
                    </TableRow>
                  ))
                ) : <EmptyLogs message="Aucun log d'audit." />
              ) : (
                securityLogs && securityLogs.length > 0 ? (
                  securityLogs.map(log => (
                    <TableRow key={log.id} className="border-slate-800 hover:bg-slate-800/20">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <LogIcon type={log.eventType} />
                          <Badge variant={log.status === 'open' ? 'destructive' : 'success'} className="text-[9px]">
                            {log.eventType.replace(/_/g, ' ')}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-slate-300">{log.details}</TableCell>
                      <TableCell className="text-[10px] font-mono text-slate-500">
                        Target: {log.targetId.substring(0, 8)}...
                      </TableCell>
                      <TableCell className="text-right pr-6 text-[10px] text-slate-500 font-bold uppercase">
                        {log.timestamp && typeof (log.timestamp as any).toDate === 'function' 
                          ? format((log.timestamp as any).toDate(), 'dd MMM, HH:mm', { locale: fr }) 
                          : 'Date...'}
                      </TableCell>
                    </TableRow>
                  ))
                ) : <EmptyLogs message="Aucune alerte de sécurité." />
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}

function EmptyLogs({ message }: { message: string }) {
  return (
    <TableRow>
      <TableCell colSpan={4} className="h-48 text-center opacity-30">
        <ShieldCheck className="mx-auto h-12 w-12 mb-2" />
        <p className="font-black uppercase tracking-widest text-xs">{message}</p>
      </TableCell>
    </TableRow>
  );
}
