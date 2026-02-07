'use client';

/**
 * @fileOverview Interface de gestion des Rôles & Permissions.
 * Permet de configurer dynamiquement les accès pour chaque type d'utilisateur.
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Loader2, ShieldCheck, ShieldAlert, Lock, AlertCircle, Database, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function RolesManager() {
    const db = getFirestore();
    const { toast } = useToast();
    const { currentUser } = useRole();

    const rolesQuery = useMemo(() => query(collection(db, 'roles'), orderBy('name')), [db]);
    const { data: roles, isLoading: rolesLoading, error } = useCollection<Role>(rolesQuery);

    const [selectedRoleId, setSelectedRoleId] = useState<string | undefined>(undefined);
    const [savingStates, setSavingStates] = useState<Record<string, boolean>>({});
    const [isInitializing, setIsInitializing] = useState(false);

    // ✅ Sélection automatique du premier rôle trouvé
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
        if (!selectedRoleId || !currentUser) return;

        // Empêcher la modification si c'est l'admin (pour la sécurité)
        if (selectedRole?.name === 'admin') return;

        setSavingStates(prev => ({ ...prev, [permissionKey]: true }));

        try {
            const result = await updateRolePermissions({
                roleId: selectedRoleId,
                permissions: {
                    [permissionKey]: checked
                },
                adminId: currentUser.uid,
            });

            if (result.success) {
                toast({
                    title: 'Permission mise à jour',
                    description: `Le rôle '${selectedRole?.name}' a été mis à jour.`,
                });
            } else {
                throw new Error(result.error);
            }
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Erreur de sauvegarde',
                description: error.message || 'Impossible de mettre à jour la permission.',
            });
        } finally {
            setSavingStates(prev => ({ ...prev, [permissionKey]: false }));
        }
    };

    const handleInitialize = async () => {
        if (!currentUser) return;
        setIsInitializing(true);
        try {
            const result = await initializeDefaultRoles(currentUser.uid);
            if (result.success) {
                toast({ title: "Rôles initialisés !", description: "Les définitions de rôles ont été créées." });
            } else {
                toast({ variant: 'destructive', title: "Erreur", description: result.error });
            }
        } catch (e) {
            toast({ variant: 'destructive', title: "Erreur technique" });
        } finally {
            setIsInitializing(false);
        }
    };

    if (rolesLoading) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-12 w-64 bg-slate-800 rounded-xl" />
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-64 w-full bg-slate-800 rounded-2xl" />)}
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center bg-red-500/5 border border-red-500/20 rounded-3xl">
                <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
                <h3 className="text-xl font-bold text-white uppercase tracking-tight">Erreur d'accès</h3>
                <p className="text-slate-400 mt-2 max-w-md">
                    Impossible de charger les rôles. Vérifiez vos permissions ou la configuration de la base de données.
                </p>
            </div>
        );
    }

    if (roles && roles.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center bg-slate-900/20 border-2 border-dashed border-slate-800 rounded-[2.5rem] animate-in fade-in duration-700">
                <Database className="h-16 w-16 text-slate-700 mb-6" />
                <h3 className="text-2xl font-black text-white uppercase tracking-tight">Configuration requise</h3>
                <p className="text-slate-500 mt-3 max-w-md mx-auto leading-relaxed">
                    Vos utilisateurs ont des rôles, mais les **définitions de permissions** n'existent pas encore dans la collection `roles`.
                </p>
                <Button 
                    onClick={handleInitialize} 
                    disabled={isInitializing}
                    className="mt-8 h-14 px-10 rounded-2xl bg-primary hover:bg-primary/90 font-black uppercase text-xs tracking-widest shadow-2xl shadow-primary/20"
                >
                    {isInitializing ? (
                        <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    ) : (
                        <Sparkles className="h-5 w-5 mr-2" />
                    )}
                    Initialiser les rôles par défaut
                </Button>
            </div>
        );
    }
    
    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="flex-1">
                    <Label htmlFor="role-selector" className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Configuration du rôle</Label>
                    <Select onValueChange={setSelectedRoleId} value={selectedRoleId}>
                        <SelectTrigger id="role-selector" className="w-full md:w-80 mt-1.5 bg-slate-900 border-slate-800 h-12 text-base rounded-xl">
                            <SelectValue placeholder="Sélectionnez un rôle" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 border-slate-800 text-white">
                            {roles?.map(role => (
                                <SelectItem key={role.id} value={role.id} className="capitalize font-bold py-3">
                                    {role.name === 'admin' ? '🛡️ Administrateur' : role.name === 'instructor' ? '🎓 Formateur' : '👤 Étudiant'}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                
                {selectedRole?.name === 'admin' && (
                    <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl flex gap-3 max-w-sm">
                        <ShieldAlert className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                        <p className="text-[10px] font-bold text-amber-400 uppercase tracking-tighter leading-tight">
                            Rôle Maître : Les permissions administrateur sont verrouillées au maximum pour garantir l'intégrité du système.
                        </p>
                    </div>
                )}
            </div>

            {selectedRole ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {Object.entries(PERMISSION_GROUPS).map(([groupName, permissions]) => (
                        <Card key={groupName} className="bg-slate-900 border-slate-800 shadow-xl rounded-2xl overflow-hidden">
                            <CardHeader className="bg-slate-800/30 border-b border-white/5 py-4">
                                <CardTitle className="text-sm font-black uppercase tracking-widest text-primary flex items-center gap-2">
                                    <ShieldCheck className="h-4 w-4" />
                                    {groupName}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 space-y-3">
                                {Object.entries(permissions).map(([key, description]) => {
                                    const isSaving = savingStates[key];
                                    const isAdmin = selectedRole.name === 'admin';
                                    
                                    return (
                                        <div key={key} className={cn(
                                            "flex items-center justify-between p-3 rounded-xl border transition-all",
                                            selectedRole.permissions?.[key] ? "bg-primary/5 border-primary/20" : "bg-slate-950/50 border-slate-800 opacity-60"
                                        )}>
                                            <div className="flex-1 pr-4">
                                                <Label 
                                                    htmlFor={`switch-${key}`} 
                                                    className="text-xs font-bold text-slate-200 cursor-pointer block"
                                                >
                                                    {description}
                                                </Label>
                                                <p className="text-[9px] text-slate-500 font-mono mt-0.5">{key}</p>
                                            </div>
                                            
                                            <div className="w-10 flex justify-center">
                                                {isSaving ? (
                                                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                                                ) : isAdmin ? (
                                                    <Lock className="h-4 w-4 text-slate-600" />
                                                ) : (
                                                    <Switch
                                                        id={`switch-${key}`}
                                                        checked={selectedRole.permissions?.[key] || false}
                                                        onCheckedChange={(checked) => handlePermissionChange(key, checked)}
                                                        className="data-[state=checked]:bg-primary"
                                                    />
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : (
                <div className="text-center py-20 opacity-30">
                    <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4" />
                    <p className="font-black uppercase tracking-[0.3em]">Initialisation du rôle...</p>
                </div>
            )}
        </div>
    );
}
