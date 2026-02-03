'use client';

/**
 * @fileOverview Page de paramètres complète pour les instructeurs.
 * Gère le profil professionnel, l'avatar, les réseaux sociaux et les préférences IA.
 */

export const dynamic = 'force-dynamic';

import { useState, useEffect, useMemo } from 'react';
import { useRole } from '@/context/RoleContext';
import { useDoc } from '@/firebase';
import { getFirestore, doc, updateDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ImageCropper } from '@/components/ui/ImageCropper';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { 
  Loader2, 
  User, 
  Briefcase, 
  Camera, 
  Linkedin, 
  Twitter, 
  Globe, 
  Bell, 
  Bot, 
  ShieldCheck,
  Save
} from 'lucide-react';
import type { NdaraUser } from '@/lib/types';

const settingsSchema = z.object({
  fullName: z.string().min(3, "Le nom doit contenir au moins 3 caractères."),
  specialty: z.string().min(2, "Veuillez indiquer votre spécialité."),
  bio: z.string().max(1000, "La biographie ne peut pas dépasser 1000 caractères."),
  linkedin: z.string().url().or(z.literal('')).optional(),
  twitter: z.string().url().or(z.literal('')).optional(),
  website: z.string().url().or(z.literal('')).optional(),
  // Préférences
  notifyEnrollment: z.boolean(),
  notifyMessages: z.boolean(),
  notifyAssignments: z.boolean(),
  aiAssistance: z.boolean(),
});

type SettingsValues = z.infer<typeof settingsSchema>;

export default function InstructorSettingsPage() {
  const { currentUser } = useRole();
  const db = getFirestore();
  const { toast } = useToast();
  
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);

  // Utilisation de useDoc pour le temps réel comme demandé
  const userRef = useMemo(() => currentUser ? doc(db, 'users', currentUser.uid) : null, [db, currentUser]);
  const { data: userData, isLoading: userDataLoading } = useDoc<NdaraUser>(userRef);

  const form = useForm<SettingsValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      fullName: '',
      specialty: '',
      bio: '',
      linkedin: '',
      twitter: '',
      website: '',
      notifyEnrollment: true,
      notifyMessages: true,
      notifyAssignments: true,
      aiAssistance: true,
    },
  });

  // Synchronisation du formulaire avec les données Firestore
  useEffect(() => {
    if (userData) {
      form.reset({
        fullName: userData.fullName || '',
        specialty: userData.careerGoals?.currentRole || userData.instructorApplication?.specialty || '',
        bio: userData.bio || '',
        linkedin: userData.socialLinks?.linkedin || '',
        twitter: userData.socialLinks?.twitter || '',
        website: userData.socialLinks?.website || '',
        notifyEnrollment: userData.instructorNotificationPreferences?.newEnrollment ?? true,
        notifyMessages: userData.instructorNotificationPreferences?.newMessage ?? true,
        notifyAssignments: userData.instructorNotificationPreferences?.newAssignmentSubmission ?? true,
        aiAssistance: userData.pedagogicalPreferences?.aiAssistanceEnabled ?? true,
      });
    }
  }, [userData, form]);

  const handleAvatarUpload = async (croppedImage: File) => {
    if (!currentUser) return;
    setImageToCrop(null);
    setIsUploading(true);

    const storage = getStorage();
    const storageRef = ref(storage, `avatars/${currentUser.uid}/profile_${Date.now()}.webp`);

    try {
      const snapshot = await uploadBytes(storageRef, croppedImage);
      const downloadURL = await getDownloadURL(snapshot.ref);
      await updateDoc(doc(db, 'users', currentUser.uid), { profilePictureURL: downloadURL });
      toast({ title: "Photo de profil mise à jour" });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erreur', description: "Impossible de téléverser l'image." });
    } finally {
      setIsUploading(false);
    }
  };

  const onSubmit = async (values: SettingsValues) => {
    if (!currentUser) return;
    setIsSaving(true);

    try {
      await updateDoc(doc(db, 'users', currentUser.uid), {
        fullName: values.fullName,
        bio: values.bio,
        'careerGoals.currentRole': values.specialty,
        'socialLinks.linkedin': values.linkedin,
        'socialLinks.twitter': values.twitter,
        'socialLinks.website': values.website,
        'instructorNotificationPreferences.newEnrollment': values.notifyEnrollment,
        'instructorNotificationPreferences.newMessage': values.notifyMessages,
        'instructorNotificationPreferences.newAssignmentSubmission': values.notifyAssignments,
        'pedagogicalPreferences.aiAssistanceEnabled': values.aiAssistance,
      });
      toast({ title: "Paramètres enregistrés" });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erreur', description: "Une erreur est survenue lors de la sauvegarde." });
    } finally {
      setIsSaving(false);
    }
  };

  if (userDataLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      <ImageCropper 
        image={imageToCrop}
        onCropComplete={handleAvatarUpload}
        onClose={() => setImageToCrop(null)}
      />

      <header>
        <h1 className="text-3xl font-bold text-white">Paramètres Formateur</h1>
        <p className="text-slate-400">Gérez votre profil public et vos préférences de plateforme.</p>
      </header>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          
          {/* --- SECTION 1: PROFIL PROFESSIONNEL --- */}
          <Card className="bg-slate-800/50 border-slate-700/80">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <User className="h-5 w-5 text-primary" />
                Profil Professionnel
              </CardTitle>
              <CardDescription>Ces informations sont visibles par vos étudiants.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              
              <div className="flex flex-col sm:flex-row items-center gap-6 pb-6 border-b border-slate-700/50">
                <div className="relative group">
                  <Avatar className="h-24 w-24 border-4 border-slate-700 shadow-xl">
                    <AvatarImage src={userData?.profilePictureURL} />
                    <AvatarFallback className="text-3xl bg-slate-700 text-white">{userData?.fullName?.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <label 
                    htmlFor="avatar-input" 
                    className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-full cursor-pointer"
                  >
                    <Camera className="h-6 w-6 text-white" />
                    <input 
                      id="avatar-input" 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={(e) => e.target.files?.[0] && setImageToCrop(URL.createObjectURL(e.target.files[0]))}
                      disabled={isUploading}
                    />
                  </label>
                  {isUploading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full">
                      <Loader2 className="h-6 w-6 animate-spin text-white" />
                    </div>
                  )}
                </div>
                <div className="space-y-1 text-center sm:text-left">
                  <h3 className="font-bold text-lg text-white">Photo de profil</h3>
                  <p className="text-sm text-slate-400 text-balance">Recommandé : Image carrée, min. 400x400px.</p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nom Complet</FormLabel>
                      <FormControl><Input {...field} className="bg-slate-900 border-slate-700" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="specialty"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Spécialité / Titre</FormLabel>
                      <FormControl><Input placeholder="Ex: Expert en Développement Web" {...field} className="bg-slate-900 border-slate-700" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="bio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Biographie professionnelle</FormLabel>
                    <FormControl>
                      <Textarea 
                        rows={6} 
                        placeholder="Présentez votre parcours et votre expertise..." 
                        {...field} 
                        className="bg-slate-900 border-slate-700 resize-none"
                      />
                    </FormControl>
                    <FormDescription>Dites aux étudiants pourquoi ils devraient suivre vos cours.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* --- SECTION 2: RÉSEAUX SOCIAUX --- */}
          <Card className="bg-slate-800/50 border-slate-700/80">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Globe className="h-5 w-5 text-primary" />
                Liens & Réseaux
              </CardTitle>
              <CardDescription>Aidez les étudiants à vous retrouver ailleurs.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="linkedin"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center gap-3">
                      <Linkedin className="h-5 w-5 text-slate-400 shrink-0" />
                      <FormControl><Input placeholder="https://linkedin.com/in/nom" {...field} className="bg-slate-900 border-slate-700" /></FormControl>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="twitter"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center gap-3">
                      <Twitter className="h-5 w-5 text-slate-400 shrink-0" />
                      <FormControl><Input placeholder="https://twitter.com/nom" {...field} className="bg-slate-900 border-slate-700" /></FormControl>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="website"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center gap-3">
                      <Globe className="h-5 w-5 text-slate-400 shrink-0" />
                      <FormControl><Input placeholder="https://votresite.com" {...field} className="bg-slate-900 border-slate-700" /></FormControl>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* --- SECTION 3: PRÉFÉRENCES & NOTIFICATIONS --- */}
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="bg-slate-800/50 border-slate-700/80">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white text-lg">
                  <Bell className="h-5 w-5 text-primary" />
                  Notifications
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="notifyEnrollment"
                  render={({ field }) => (
                    <div className="flex items-center justify-between p-3 border border-slate-700 rounded-lg">
                      <Label className="cursor-pointer">Nouvelles inscriptions</Label>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </div>
                  )}
                />
                <FormField
                  control={form.control}
                  name="notifyMessages"
                  render={({ field }) => (
                    <div className="flex items-center justify-between p-3 border border-slate-700 rounded-lg">
                      <Label className="cursor-pointer">Nouveaux messages</Label>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </div>
                  )}
                />
                <FormField
                  control={form.control}
                  name="notifyAssignments"
                  render={({ field }) => (
                    <div className="flex items-center justify-between p-3 border border-slate-700 rounded-lg">
                      <Label className="cursor-pointer">Soumissions de devoirs</Label>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </div>
                  )}
                />
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700/80 border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white text-lg">
                  <Bot className="h-5 w-5 text-primary" />
                  Assistance IA (Mathias)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="aiAssistance"
                  render={({ field }) => (
                    <div className="flex items-center justify-between p-3 border border-slate-700 rounded-lg">
                      <div>
                        <Label className="cursor-pointer">Aide à la correction</Label>
                        <p className="text-xs text-slate-500">Active les suggestions de notes basées sur vos guides.</p>
                      </div>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </div>
                  )}
                />
                <div className="p-3 bg-primary/5 border border-primary/10 rounded-lg">
                  <div className="flex items-center gap-2 text-primary font-semibold text-sm mb-1">
                    <ShieldCheck className="h-4 w-4" />
                    Éthique IA
                  </div>
                  <p className="text-[11px] text-slate-400">MATHIAS analyse les travaux mais la décision finale de notation vous appartient toujours.</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-end gap-4 sticky bottom-6 z-20">
            <Button 
              type="button" 
              variant="outline" 
              className="bg-slate-900 border-slate-700"
              onClick={() => window.location.reload()}
            >
              Réinitialiser
            </Button>
            <Button type="submit" size="lg" disabled={isSaving} className="shadow-lg shadow-primary/20">
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Enregistrer les modifications
            </Button>
          </div>

        </form>
      </Form>
    </div>
  );
}
