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
  Camera, 
  Linkedin, 
  Twitter, 
  Globe, 
  Bell, 
  Bot, 
  ShieldCheck,
  Save,
  ArrowLeft
} from 'lucide-react';
import Link from 'next/link';
import type { NdaraUser } from '@/lib/types';

const settingsSchema = z.object({
  fullName: z.string().min(3, "Le nom doit contenir au moins 3 caractères."),
  specialty: z.string().min(2, "Veuillez indiquer votre spécialité."),
  bio: z.string().max(1000, "La biographie ne peut pas dépasser 1000 caractères."),
  linkedin: z.string().url("URL LinkedIn invalide").or(z.literal('')).optional(),
  twitter: z.string().url("URL Twitter/X invalide").or(z.literal('')).optional(),
  website: z.string().url("URL de site web invalide").or(z.literal('')).optional(),
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

  useEffect(() => {
    if (userData) {
      form.reset({
        fullName: userData.fullName || '',
        specialty: userData.careerGoals?.currentRole || '',
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

    try {
      const storage = getStorage();
      const fileName = `profile_${Date.now()}.webp`;
      const storageRef = ref(storage, `avatars/${currentUser.uid}/${fileName}`);

      console.log("Démarrage de l'upload vers Firebase Storage...");
      const snapshot = await uploadBytes(storageRef, croppedImage);
      
      console.log("Récupération de l'URL de téléchargement...");
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      console.log("Mise à jour du document utilisateur dans Firestore...");
      await updateDoc(doc(db, 'users', currentUser.uid), { 
        profilePictureURL: downloadURL 
      });

      toast({ 
        title: "Photo de profil mise à jour", 
        description: "Votre nouvel avatar a été enregistré avec succès." 
      });
    } catch (error: any) {
      console.error("Erreur critique lors de l'upload de l'avatar :", error);
      toast({ 
        variant: 'destructive', 
        title: 'Échec de l\'upload', 
        description: error.message || "Une erreur inconnue est survenue. Vérifiez votre connexion." 
      });
    } finally {
      // On s'assure que le loader s'arrête systématiquement
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
      toast({ title: "Paramètres enregistrés avec succès" });
    } catch (error: any) {
      console.error("Erreur lors de la sauvegarde des paramètres :", error);
      toast({ 
        variant: 'destructive', 
        title: 'Erreur', 
        description: "Impossible de sauvegarder vos modifications." 
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (userDataLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-900">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      <ImageCropper 
        image={imageToCrop}
        onCropComplete={handleAvatarUpload}
        onClose={() => {
          setImageToCrop(null);
          setIsUploading(false);
        }}
      />

      <header className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
            <h1 className="text-3xl font-bold text-white">Paramètres Formateur</h1>
            <p className="text-slate-400">Gérez votre identité professionnelle et vos outils pédagogiques.</p>
        </div>
        <Button variant="outline" asChild className="bg-slate-800 border-slate-700">
            <Link href="/instructor/dashboard">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Retour au tableau de bord
            </Link>
        </Button>
      </header>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          
          <Card className="bg-slate-800/50 border-slate-700/80 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <User className="h-5 w-5 text-primary" />
                Profil Public
              </CardTitle>
              <CardDescription>Ces informations aident les étudiants à mieux vous connaître.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              
              <div className="flex flex-col sm:flex-row items-center gap-6 pb-6 border-b border-slate-700/50">
                <div className="relative group">
                  <Avatar className="h-28 w-24 border-4 border-slate-700 shadow-xl rounded-2xl">
                    <AvatarImage src={userData?.profilePictureURL} className="object-cover" />
                    <AvatarFallback className="text-3xl bg-slate-700 text-white rounded-2xl">{userData?.fullName?.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <label 
                    htmlFor="avatar-input" 
                    className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl cursor-pointer"
                  >
                    <Camera className="h-6 w-6 text-white" />
                    <input 
                      id="avatar-input" 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setImageToCrop(URL.createObjectURL(file));
                        }
                      }}
                      disabled={isUploading}
                    />
                  </label>
                  {isUploading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-2xl">
                      <Loader2 className="h-6 w-6 animate-spin text-white" />
                    </div>
                  )}
                </div>
                <div className="space-y-1 text-center sm:text-left">
                  <h3 className="font-bold text-lg text-white">Photo de profil</h3>
                  <p className="text-sm text-slate-400">Cliquez sur l'image pour la modifier.</p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nom Complet</FormLabel>
                      <FormControl><Input {...field} className="bg-slate-900 border-slate-700 h-11" /></FormControl>
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
                      <FormControl><Input placeholder="Ex: Senior Developer, Expert Marketing..." {...field} className="bg-slate-900 border-slate-700 h-11" /></FormControl>
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
                    <FormLabel>Ma Biographie</FormLabel>
                    <FormControl>
                      <Textarea 
                        rows={6} 
                        placeholder="Présentez votre expertise et votre passion pour l'enseignement..." 
                        {...field} 
                        className="bg-slate-900 border-slate-700 resize-none text-base"
                      />
                    </FormControl>
                    <FormDescription>Un profil détaillé inspire plus confiance aux apprenants.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700/80 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Globe className="h-5 w-5 text-primary" />
                Présence en ligne
              </CardTitle>
              <CardDescription>Liez vos comptes pour augmenter votre visibilité.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="linkedin"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-slate-900 rounded-lg border border-slate-700"><Linkedin className="h-5 w-5 text-[#0077b5]" /></div>
                      <FormControl><Input placeholder="Lien vers votre profil LinkedIn" {...field} className="bg-slate-900 border-slate-700 h-11" /></FormControl>
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
                      <div className="p-2 bg-slate-900 rounded-lg border border-slate-700"><Twitter className="h-5 w-5 text-white" /></div>
                      <FormControl><Input placeholder="Lien vers votre profil Twitter / X" {...field} className="bg-slate-900 border-slate-700 h-11" /></FormControl>
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
                      <div className="p-2 bg-slate-900 rounded-lg border border-slate-700"><Globe className="h-5 w-5 text-emerald-400" /></div>
                      <FormControl><Input placeholder="Votre site web ou portfolio" {...field} className="bg-slate-900 border-slate-700 h-11" /></FormControl>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-2 gap-6">
            <Card className="bg-slate-800/50 border-slate-700/80 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white text-lg">
                  <Bell className="h-5 w-5 text-primary" />
                  Alertes & Notifications
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="notifyEnrollment"
                  render={({ field }) => (
                    <div className="flex items-center justify-between p-3 border border-slate-700 rounded-xl bg-slate-900/30">
                      <Label className="cursor-pointer font-medium">Inscriptions aux cours</Label>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </div>
                  )}
                />
                <FormField
                  control={form.control}
                  name="notifyMessages"
                  render={({ field }) => (
                    <div className="flex items-center justify-between p-3 border border-slate-700 rounded-xl bg-slate-900/30">
                      <Label className="cursor-pointer font-medium">Messages des étudiants</Label>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </div>
                  )}
                />
                <FormField
                  control={form.control}
                  name="notifyAssignments"
                  render={({ field }) => (
                    <div className="flex items-center justify-between p-3 border border-slate-700 rounded-xl bg-slate-900/30">
                      <Label className="cursor-pointer font-medium">Soumissions de devoirs</Label>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </div>
                  )}
                />
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700/80 border-primary/30 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white text-lg">
                  <Bot className="h-5 w-5 text-primary" />
                  Copilote MATHIAS (IA)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="aiAssistance"
                  render={({ field }) => (
                    <div className="flex items-center justify-between p-3 border border-primary/20 rounded-xl bg-primary/5">
                      <div>
                        <Label className="cursor-pointer font-bold text-primary">Aide à la correction</Label>
                        <p className="text-[11px] text-slate-400 mt-0.5">Suggérer des notes et feedbacks basés sur vos guides.</p>
                      </div>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </div>
                  )}
                />
                <div className="p-4 bg-slate-900/50 border border-slate-700 rounded-xl flex gap-3">
                  <ShieldCheck className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-xs text-white uppercase tracking-wider">Sécurité IA</p>
                    <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                      L'assistant Mathias traite vos données localement au niveau de la session pour vous aider, mais vous gardez le contrôle total sur chaque décision finale.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-end gap-4 sticky bottom-6 z-20 pt-4">
            <Button 
              type="submit" 
              size="lg" 
              disabled={isSaving || isUploading} 
              className="h-12 px-10 shadow-2xl shadow-primary/30 text-base font-bold"
            >
              {isSaving ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />}
              Enregistrer les modifications
            </Button>
          </div>

        </form>
      </Form>
    </div>
  );
}
