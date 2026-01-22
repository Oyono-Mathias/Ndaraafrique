'use client';

import { useState, useMemo } from 'react';
import { useCollection, useMemoFirebase } from '@/firebase';
import { getFirestore, collection, query, orderBy } from 'firebase/firestore';
import type { Role } from '@/lib/types';
import { useRole } from '@/context/RoleContext';
import { PERMISSION_GROUPS } from '@/lib/permissions';
import { updateRolePermissions } from '@/actions/roleActions';
import { useToast } from '@/hooks/use-toast';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export function RolesManager() {
    const db = getFirestore();
    const { toast } = useToast();
    const { currentUser } = useRole();

    const rolesQuery = useMemoFirebase(() => query(collection(db, 'roles'), orderBy('name')), [db]);
    const { data: roles, isLoading: rolesLoading } = useCollection<Role>(rolesQuery);

    const [selectedRoleId, setSelectedRoleId] = useState<string | undefined>(undefined);
    const [savingStates, setSavingStates] = useState<Record<string, boolean>>({});

    const selectedRole = useMemo(() => {
        return roles?.find(r => r.id === selectedRoleId);
    }, [roles, selectedRoleId]);

    // Set default role selection
    useState(() => {
        if (roles && roles.length > 0 && !selectedRoleId) {
            setSelectedRoleId(roles.find(r => r.name === 'instructor')?.id || roles[0].id);
        }
    });

    const handlePermissionChange = async (permissionKey: string, checked: boolean) => {
        if (!selectedRoleId || !currentUser) return;

        setSavingStates(prev => ({ ...prev, [permissionKey]: true }));

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
                description: `Le rôle '${selectedRole?.name}' a été modifié.`,
            });
        } else {
            toast({
                variant: 'destructive',
                title: 'Erreur',
                description: result.error || 'Impossible de mettre à jour la permission.',
            });
        }
        setSavingStates(prev => ({ ...prev, [permissionKey]: false }));
    };

    if (rolesLoading) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-10 w-64" />
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-60 w-full" />)}
                </div>
            </div>
        );
    }
    
    return (
        <div className="space-y-6">
            <div>
                <Label htmlFor="role-selector" className="text-base font-semibold">Éditer le rôle</Label>
                <Select onValueChange={setSelectedRoleId} defaultValue={selectedRoleId}>
                    <SelectTrigger id="role-selector" className="w-full md:w-72 mt-2 dark:bg-slate-800 h-12 text-base">
                        <SelectValue placeholder="Sélectionnez un rôle" />
                    </SelectTrigger>
                    <SelectContent>
                        {roles?.map(role => (
                            <SelectItem key={role.id} value={role.id} className="capitalize">{role.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {selectedRole ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {Object.entries(PERMISSION_GROUPS).map(([groupName, permissions]) => (
                        <Card key={groupName} className="dark:bg-slate-800/50 dark:border-slate-700/80">
                            <CardHeader>
                                <CardTitle className="text-lg text-white">{groupName}</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {Object.entries(permissions).map(([key, description]) => (
                                    <TooltipProvider key={key} delayDuration={100}>
                                        <Tooltip>
                                            <TooltipTrigger className="w-full">
                                                <div className="flex items-center justify-between p-3 border rounded-lg dark:border-slate-700">
                                                    <Label htmlFor={`switch-${key}`} className="text-sm cursor-pointer dark:text-slate-300 text-left flex-1 pr-2">{description}</Label>
                                                    <div className="w-10 h-6 flex items-center justify-center">
                                                        {savingStates[key] ? (
                                                            <Loader2 className="h-4 w-4 animate-spin" />
                                                        ) : (
                                                            <Switch
                                                                id={`switch-${key}`}
                                                                checked={selectedRole.permissions?.[key] || false}
                                                                onCheckedChange={(checked) => handlePermissionChange(key, checked)}
                                                                disabled={selectedRole.name === 'admin'}
                                                            />
                                                        )}
                                                    </div>
                                                </div>
                                            </TooltipTrigger>
                                            {selectedRole.name === 'admin' && (
                                                 <TooltipContent>
                                                    <p>Les administrateurs ont toutes les permissions par défaut.</p>
                                                </TooltipContent>
                                            )}
                                        </Tooltip>
                                    </TooltipProvider>
                                ))}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : (
                <p>Veuillez sélectionner un rôle pour voir ses permissions.</p>
            )}
        </div>
    );
}
