'use client';

/**
 * @fileOverview Gestionnaire de Rôles & Permissions - Design Elite Qwen.
 * ✅ ANDROID-FIRST : Sélecteur de rôle par pilules et cartes segmentées.
 * ✅ SÉCURITÉ : Marquage des permissions critiques et verrouillage Admin.
 */

import { useState, useMemo, useEffect } from 'react';
import { useCollection } from '@/firebase';
import { getFirestore, collection, query, orderBy } from 'firebase/firestore';
import type { Role } from '@/lib/types';
import { useRole } from '@/context/RoleContext';
import { PERMISSION_GROUPS } from '@/lib/permissions';
import { updateRolePermissions, initializeDefaultRoles } from '@/actions/roleActions';
import { useToast } from '@/hooks/use-toast';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { 
    Loader2, 
    ShieldCheck, 
    ShieldAlert, 
    Lock, 
    AlertCircle, 
    Database, 
    Sparkles,
    Check,
    ChevronRight,
    BookOpen,
    Wallet,
    Shield
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// Liste des permissions considérées comme critiques
const CRITICAL_PERMISSIONS = [
    'admin.payouts.manage',
    'admin.roles.manage',
    'admin.users.manage',
    'admin.settings.manage',
    'admin.security.read'
];

const GroupIcon = ({ name }: { name: string }) => {
    if (name.includes('Contenu')) return <BookOpen className="h-4 w-4 text-blue-400" />;
    if (name.includes('Finance') || name.includes('Revenu')) return <Wallet className="h-4 w-4 text-emerald-400" />;
    return <Shield className="h-4 w-4 text-purple-400" />;
};

export function RolesManager() {
    const db = getFirestore();
    const { toast } = useToast();
    const { currentUser } = useRole();

    const rolesQuery = useMemo(() => query(collection(db, 'roles'), orderBy('name')), [db]);
    const { data: roles, isLoading: rolesLoading, error } = useCollection<Role>(rolesQuery);

    const [selectedRoleId, setSelectedRoleId] = useState<string | undefined>(undefined);
    const [savingStates, setSavingStates] = useState<Record<string, boolean>>({});
    const [isInitializing, setIsInitializing] = useState(false);

    useEffect(() => {
        if (roles && roles.length > 0 && !selectedRoleId) {
            const instructorRole = roles.find(r => r.name === 'instructor');
            setSelectedRoleId(instructorRole?.id || roles[0].id);
        }
    }, [roles, selectedRoleId]);

    const selectedRole = useMemo(() => {
        return roles?.find(r => r.id === selectedRoleId);
    }, [roles, selectedRoleId]);

    const handlePermissionChange = async (permissionKey: string, checked: boolean) => {
        if (!selectedRoleId || !currentUser || selectedRole?.name === 'admin') return;

        setSavingStates(prev => ({ ...prev, [permissionKey]: true }));

        try {
            const result = await updateRolePermissions({
                roleId: selectedRoleId,
                permissions: { [permissionKey]: checked },
                adminId: currentUser.uid,
            });

            if (result.success) {
                toast({ title: 'Permission mise à jour' });
            } else {
                throw new Error(result.error);
            }
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Erreur', description: error.message });
        } finally {
            setSavingStates(prev => ({ ...prev, [permissionKey]: false }));
        }
    };

    const handleInitialize = async () => {
        if (!currentUser) return;
        setIsInitializing(true);
        const result = await initializeDefaultRoles(currentUser.uid);
        if (result.success) toast({ title: "Rôles initialisés !" });
        else toast({ variant: 'destructive', title: "Erreur", description: result.error });
        setIsInitializing(false);
    };

    if (rolesLoading) return <div className="space-y-6"><Skeleton className="h-14 w-full rounded-2xl bg-slate-900" /><Skeleton className="h-64 w-full rounded-3xl bg-slate-900" /></div>;

    if (roles && roles.length === 0) {
        return (
            <div className="py-20 text-center bg-slate-900/20 border-2 border-dashed border-slate-800 rounded-[3rem] opacity-30">
                <Database className="h-16 w-16 mx-auto mb-6 text-slate-700" />
                <h3 className="text-xl font-black text-white uppercase tracking-tight">Initialisation requise</h3>
                <Button onClick={handleInitialize} disabled={isInitializing} className="mt-6 h-14 rounded-2xl bg-primary">
                    {isInitializing ? <Loader2 className="animate-spin" /> : <Sparkles className="mr-2" />} Initialiser les permissions
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-10 animate-in fade-in duration-700">
            
            {/* --- ROLE SELECTOR PILLS --- */}
            <div className="space-y-3">
                <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] ml-1">Rôle à configurer</p>
                <div className="flex overflow-x-auto hide-scrollbar gap-2 pb-2">
                    {roles?.map(role => (
                        <button
                            key={role.id}
                            onClick={() => setSelectedRoleId(role.id)}
                            className={cn(
                                "flex-shrink-0 px-6 py-3 rounded-full border text-[10px] font-black uppercase tracking-widest transition-all active:scale-95",
                                selectedRoleId === role.id 
                                    ? "bg-primary text-slate-950 border-primary shadow-lg shadow-primary/20" 
                                    : "bg-slate-900 border-white/5 text-slate-500 hover:text-white"
                            )}
                        >
                            {role.name === 'admin' ? '🛡️ Administrateur' : role.name === 'instructor' ? '🎓 Expert' : '👤 Étudiant'}
                        </button>
                    ))}
                </div>
            </div>

            {selectedRole?.name === 'admin' && (
                <div className="bg-amber-500/10 border border-amber-500/20 p-5 rounded-[2rem] flex items-start gap-4 shadow-xl">
                    <ShieldAlert className="h-6 w-6 text-amber-500 shrink-0 mt-1" />
                    <div>
                        <p className="text-sm font-black text-white uppercase tracking-tight">Régime de Protection Admin</p>
                        <p className="text-xs text-amber-200/60 italic leading-relaxed mt-1">
                            Les accès du rôle Administrateur sont verrouillés par le système pour prévenir toute perte accidentelle de contrôle sur l'infrastructure Ndara Afrique.
                        </p>
                    </div>
                </div>
            )}

            {/* --- PERMISSION GROUPS --- */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-20">
                {Object.entries(PERMISSION_GROUPS).map(([groupName, permissions]) => (
                    <div key={groupName} className="space-y-4 animate-in slide-in-from-bottom-4 duration-500">
                        <div className="flex items-center gap-2 ml-1">
                            <div className="p-2 bg-slate-800 rounded-lg">
                                <GroupIcon name={groupName} />
                            </div>
                            <h2 className="font-black text-white text-xs uppercase tracking-[0.2em]">{groupName}</h2>
                        </div>

                        <div className="bg-slate-900 border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl divide-y divide-white/5">
                            {Object.entries(permissions).map(([key, description]) => {
                                const isCritical = CRITICAL_PERMISSIONS.includes(key);
                                const isSaving = savingStates[key];
                                const isLocked = selectedRole?.name === 'admin';
                                const isActive = selectedRole?.permissions?.[key] || false;

                                return (
                                    <div key={key} className={cn(
                                        "p-5 flex items-center justify-between transition-colors",
                                        isCritical && !isLocked && isActive ? "bg-red-500/[0.02]" : "hover:bg-white/[0.02]",
                                        isLocked && "opacity-60"
                                    )}>
                                        <div className="flex-1 pr-6">
                                            <div className="flex items-center gap-2 mb-1">
                                                <p className={cn("text-sm font-bold tracking-tight", isActive ? "text-white" : "text-slate-500")}>
                                                    {description}
                                                </p>
                                                {isCritical && (
                                                    <span className="bg-red-500/20 text-red-400 text-[7px] font-black px-1.5 py-0.5 rounded border border-red-500/30 uppercase">CRITIQUE</span>
                                                )}
                                            </div>
                                            <p className="text-[9px] font-mono text-slate-600 uppercase tracking-tighter">{key}</p>
                                        </div>

                                        <div className="shrink-0 flex items-center gap-3">
                                            {isSaving ? (
                                                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                                            ) : isLocked ? (
                                                <Lock className="h-4 w-4 text-slate-700" />
                                            ) : (
                                                <Switch 
                                                    checked={isActive} 
                                                    onCheckedChange={(v: boolean) => handlePermissionChange(key, v)}
                                                    className="data-[state=checked]:bg-primary"
                                                />
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>

            {/* --- STICKY STATUS --- */}
            <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-slate-950 via-slate-950/90 to-transparent z-40 safe-area-pb pointer-events-none">
                <div className="max-w-md mx-auto bg-slate-900 border border-white/10 p-4 rounded-3xl shadow-2xl flex items-center justify-between pointer-events-auto">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary shadow-inner">
                            <Check size={16} />
                        </div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Système Synchronisé</p>
                    </div>
                    <Badge variant="outline" className="border-primary/30 text-primary font-black text-[8px] uppercase px-2">LIVE</Badge>
                </div>
            </div>
        </div>
    );
}
