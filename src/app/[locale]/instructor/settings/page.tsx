'use client';

/**
 * @fileOverview Page de paramètres spécifiques pour les instructeurs.
 * Permet de gérer les notifications et les préférences pédagogiques.
 */

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { useRole } from '@/context/RoleContext';
import { getFirestore, doc, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Loader2, Bell, Bot, ShieldCheck } from 'lucide-react';

export default function InstructorSettingsPage() {
  const { currentUser, isUserLoading } = useRole();
  const { toast } = useToast();
  const db = getFirestore();
  const [isSaving, setIsSaving] = useState(false);

  // État local synchronisé avec les préférences du currentUser
  const [prefs, setPrefs] = useState({
    newEnrollment: currentUser?.instructorNotificationPreferences?.newEnrollment ?? true,
    newMessage: currentUser?.instructorNotificationPreferences?.newMessage ?? true,
    newAssignmentSubmission: currentUser?.instructorNotificationPreferences?.newAssignmentSubmission ?? true,
    aiAssistanceEnabled: currentUser?.pedagogicalPreferences?.aiAssistanceEnabled ?? true,
  });

  const handleToggle = (key: keyof typeof prefs) => {
    setPrefs(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    if (!currentUser) return;
    setIsSaving(true);
    try {
      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, {
        'instructorNotificationPreferences.newEnrollment': prefs.newEnrollment,
        'instructorNotificationPreferences.newMessage': prefs.newMessage,
        'instructorNotificationPreferences.newAssignmentSubmission': prefs.newAssignmentSubmission,
        'pedagogicalPreferences.aiAssistanceEnabled': prefs.aiAssistanceEnabled,
      });
      toast({ title: "Paramètres mis à jour", description: "Vos préférences ont été enregistrées." });
    } catch (error) {
      toast({ variant: 'destructive', title: "Erreur", description: "Impossible de sauvegarder les modifications." });
    } finally {
      setIsSaving(false);
    }
  };

  if (isUserLoading || !currentUser) {
    return <div className="flex h-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary"/></div>;
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <header>
        <h1 className="text-3xl font-bold text-white">Paramètres Formateur</h1>
        <p className="text-slate-400">Gérez vos notifications et vos outils pédagogiques.</p>
      </header>

      <div className="grid gap-6">
        <Card className="bg-slate-800/50 border-slate-700/80">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Bell className="h-5 w-5 text-primary" />
              Notifications d'Activité
            </CardTitle>
            <CardDescription>Choisissez les événements pour lesquels vous souhaitez être alerté.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 border border-slate-700 rounded-lg">
              <Label htmlFor="notify-enrollment" className="cursor-pointer">Nouvelles inscriptions</Label>
              <Switch id="notify-enrollment" checked={prefs.newEnrollment} onCheckedChange={() => handleToggle('newEnrollment')} />
            </div>
            <div className="flex items-center justify-between p-4 border border-slate-700 rounded-lg">
              <Label htmlFor="notify-message" className="cursor-pointer">Nouveaux messages étudiants</Label>
              <Switch id="notify-message" checked={prefs.newMessage} onCheckedChange={() => handleToggle('newMessage')} />
            </div>
            <div className="flex items-center justify-between p-4 border border-slate-700 rounded-lg">
              <Label htmlFor="notify-assignment" className="cursor-pointer">Soumissions de devoirs</Label>
              <Switch id="notify-assignment" checked={prefs.newAssignmentSubmission} onCheckedChange={() => handleToggle('newAssignmentSubmission')} />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700/80">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Bot className="h-5 w-5 text-primary" />
              Intelligence Artificielle (Mathias)
            </CardTitle>
            <CardDescription>Activez les outils d'assistance IA pour la correction et la création.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 border border-slate-700 rounded-lg">
              <div className="space-y-0.5">
                <Label htmlFor="ai-assist" className="cursor-pointer">Aide à la correction</Label>
                <p className="text-xs text-slate-500">L'IA Mathias vous suggérera des notes et des feedbacks basés sur vos guides.</p>
              </div>
              <Switch id="ai-assist" checked={prefs.aiAssistanceEnabled} onCheckedChange={() => handleToggle('aiAssistanceEnabled')} />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button variant="outline" onClick={() => window.location.reload()}>Réinitialiser</Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Enregistrer les préférences
          </Button>
        </div>
      </div>
    </div>
  );
}
