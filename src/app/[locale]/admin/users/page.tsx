'use client';

/**
 * @fileOverview Répertoire des Membres Ndara Afrique.
 * ✅ GESTION : Liste exhaustive et outils de régularisation.
 */

import { UsersTable } from '@/components/admin/users/users-table';
import { Button } from '@/components/ui/button';
import { RefreshCw, ShieldAlert, Loader2, Users } from 'lucide-react';
import { useRole } from '@/context/RoleContext';
import { useState } from 'react';
import { syncAuthUsersToFirestoreAction } from '@/actions/adminActions';
import { useToast } from '@/hooks/use-toast';

export default function AdminUsersPage() {
  const { currentUser } = useRole();
  const { toast } = useToast();
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSyncAuth = async () => {
    if (!currentUser || isSyncing) return;
    
    setIsSyncing(true);
    try {
      const result = await syncAuthUsersToFirestoreAction(currentUser.uid);
      if (result.success) {
        toast({ 
            title: "Régularisation terminée", 
            description: `${result.usersCreated} nouveaux documents créés sur ${result.usersProcessed} comptes vérifiés.` 
        });
      } else {
        toast({ variant: 'destructive', title: "Erreur Sync", description: result.error });
      }
    } catch (e) {
      toast({ variant: 'destructive', title: "Erreur technique" });
    } finally {
      setIsSyncing(false);
    }
  };

  const isMasterAdmin = currentUser?.email?.toLowerCase() === 'salguienow@gmail.com';

  return (
    <div className="space-y-10 pb-20 animate-in fade-in duration-700">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <div className="flex items-center gap-2 text-primary mb-1">
            <Users className="h-4 w-4" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em]">Gestion du Capital Humain</span>
          </div>
          <h1 className="text-3xl font-black text-white uppercase tracking-tight">Répertoire des Membres</h1>
          <p className="text-slate-400 text-sm font-medium mt-1">Gérez les accès, les profils et les identifiants de la communauté.</p>
        </div>

        {isMasterAdmin && (
            <div className="flex gap-3">
                <Button 
                    onClick={handleSyncAuth}
                    disabled={isSyncing}
                    variant="outline"
                    className="h-12 rounded-2xl border-white/5 bg-slate-900 font-bold uppercase text-[10px] tracking-widest text-primary hover:bg-primary hover:text-slate-950 transition-all shadow-xl"
                >
                    {isSyncing ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                    Régulariser Comptes Google
                </Button>
            </div>
        )}
      </header>

      {/* Alert for Super-Admin only tools */}
      {isMasterAdmin && (
          <div className="bg-primary/5 border border-primary/10 p-4 rounded-2xl flex items-start gap-4">
              <ShieldAlert className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-relaxed">
                  "L'outil de régularisation synchronise Firebase Auth avec Firestore. À utiliser si des membres Google n'apparaissent pas dans la liste."
              </p>
          </div>
      )}

      <main className="space-y-6">
        <UsersTable />
      </main>
    </div>
  );
}
