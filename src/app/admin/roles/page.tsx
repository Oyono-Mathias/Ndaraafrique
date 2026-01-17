
'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { getFirestore, collection, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { useCollection } from '@/firebase/firestore/use-collection';
import { useMemoFirebase } from '@/firebase/provider';
import { PERMISSION_GROUPS } from '@/lib/permissions';
import { useRole } from '@/context/RoleContext';
import { useToast } from '@/hooks/use-toast';
import { updateRolePermissions } from '@/actions/roleActions';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Switch } from '@/components/ui/switch';
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2 } from 'lucide-react';

interface Role {
  id: string;
  name: string;
  permissions: { [key: string]: boolean };
}

const roleSchema = z.object({
  id: z.string(),
  name: z.string(),
  permissions: z.record(z.boolean()),
});

const formSchema = z.object({
  roles: z.array(roleSchema),
});

type FormValues = z.infer<typeof formSchema>;

export default function AdminRolesPage() {
  const { toast } = useToast();
  const { currentUser } = useRole();
  const db = getFirestore();
  const [isSaving, setIsSaving] = useState(false);

  const rolesQuery = useMemoFirebase(() => collection(db, 'roles'), [db]);
  const { data: rolesData, isLoading } = useCollection<Role>(rolesQuery);

  const form = useForm<FormValues>({
    defaultValues: { roles: [] },
  });

  useEffect(() => {
    if (rolesData) {
      form.reset({ roles: rolesData });
    }
  }, [rolesData, form]);

  const onSubmit = async (data: FormValues) => {
    if (!currentUser) return;
    setIsSaving(true);
    
    try {
      for (const role of data.roles) {
        // Prevent admin from locking themselves out of role management
        if (role.id === 'admin' && !role.permissions['admin.roles.manage']) {
            toast({
                variant: 'destructive',
                title: 'Action non autorisée',
                description: 'Vous ne pouvez pas retirer la permission de gestion des rôles au groupe administrateur.'
            });
            // Re-check the box in the UI
            form.setValue(`roles.${data.roles.findIndex(r => r.id === 'admin')}.permissions.admin.roles.manage`, true);
            continue; // Skip this update
        }

        await updateRolePermissions({
          roleId: role.id,
          permissions: role.permissions,
          adminId: currentUser.uid,
        });
      }
      toast({ title: 'Permissions sauvegardées', description: 'Les rôles ont été mis à jour.' });
    } catch (error) {
      console.error("Error updating roles:", error);
      toast({ variant: 'destructive', title: 'Erreur', description: "La mise à jour des permissions a échoué." });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
        <div className="space-y-4">
            <Skeleton className="h-12 w-1/4"/>
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-40 w-full" />
        </div>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-white">Rôles et Permissions</h1>
        <p className="text-muted-foreground">Gérez précisément ce que chaque rôle peut faire sur la plateforme.</p>
      </header>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Accordion type="multiple" defaultValue={rolesData?.map(r => r.id)} className="space-y-4">
            {form.getValues('roles').map((role, roleIndex) => (
              <AccordionItem key={role.id} value={role.id} className="border rounded-xl bg-card dark:bg-slate-800 dark:border-slate-700">
                <AccordionTrigger className="p-6 text-lg font-semibold hover:no-underline text-white capitalize">
                  {role.name}
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-6">
                  <div className="space-y-6">
                    {Object.entries(PERMISSION_GROUPS).map(([groupName, permissions]) => (
                      <div key={groupName}>
                        <h4 className="font-semibold mb-3 text-slate-300">{groupName}</h4>
                        <div className="space-y-3">
                          {Object.entries(permissions).map(([permKey, permDesc]) => (
                            <FormField
                              key={permKey}
                              control={form.control}
                              name={`roles.${roleIndex}.permissions.${permKey}`}
                              render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 dark:border-slate-700/50">
                                  <div className="space-y-0.5">
                                    <FormLabel className="text-sm font-medium text-slate-200">
                                      {permDesc}
                                    </FormLabel>
                                    <p className="text-xs text-muted-foreground font-mono">{permKey}</p>
                                  </div>
                                  <FormControl>
                                    <Switch
                                      checked={field.value}
                                      onCheckedChange={field.onChange}
                                      disabled={role.id === 'admin' && permKey === 'admin.access'}
                                    />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
           <div className="flex justify-end pt-4">
            <Button type="submit" disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Enregistrer les modifications
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
