'use client';

/**
 * @fileOverview Mon Profil - Identification & Bio Ndara Afrique.
 * ✅ DESIGN : Forest & Wealth (Android-First).
 * ✅ SÉCURITÉ : Certification des numéros Mobile Money par opérateur local.
 * ✅ DYNAMIQUE : Affiche uniquement les opérateurs du pays de l'utilisateur.
 */

import { useState, useEffect, useRef, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRole } from '@/context/RoleContext';
import { useToast } from '@/hooks/use-toast';
import { updateUserProfileAction } from '@/actions/userActions';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Camera, CheckCircle2, ShieldCheck, User, AtSign, Smartphone, ArrowLeft, Lock, ShieldAlert, AlertCircle } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ImageCropper } from '@/components/ui/ImageCropper';
import { useRouter } from 'next/navigation';
import { africanCountries } from '@/lib/countries';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { OperatorLogo } from '@/components/ui/OperatorLogo';

// Mapping des opérateurs par pays pour la certification
const COUNTRY_OPERATORS: Record<string, { id: string, name: string, logo: string }[]> = {
    CM: [
        { id: 'mtn', name: 'MTN MoMo', logo: 'mtn-momo.png' },
        { id: 'orange', name: 'Orange Money', logo: 'orange-money.png' }
    ],
    CI: [
        { id: 'mtn', name: 'MTN MoMo', logo: 'mtn-momo.png' },
        { id: 'orange', name: 'Orange Money', logo: 'orange-money.png' },
        { id: 'wave', name: 'Wave', logo: 'wave.png' }
    ],
    BJ: [
        { id: 'mtn', name: 'MTN MoMo', logo: 'mtn-momo.png' },
        { id: 'moov', name: 'Moov Money', logo: 'wallet' }
    ],
    RW: [{ id: 'mtn', name: 'MTN MoMo', logo: 'mtn-momo.png' }],
    UG: [{ id: 'mtn', name: 'MTN MoMo', logo: 'mtn-momo.png' }],
    KE: [{ id: 'mpesa', name: 'M-Pesa', logo: 'wallet' }]
};

const accountSchema = z.object({
  username: z.string().min(3, "Min. 3 caractères.").max(20).regex(/^[a-zA-Z0-9_]+$/, "Lettres, chiffres et _ uniquement."),
  fullName: z.string().min(3, "Nom requis."),
  bio: z.string().max(500).optional().nullable().or(z.literal('')),
  phoneNumber: z.string().optional().nullable().or(z.literal('')),
  interestDomain: z.string().min(2, "Domaine requis."),
  countryCode: z.string().min(2, "Pays requis."),
  linkedinUrl: z.string().url("Lien invalide").optional().nullable().or(z.literal('')),
  portfolioUrl: z.string().url("URL invalide").optional().nullable().or(z.literal('')),
  // Chasseur dynamique pour les numéros certifiés
  certifiedNumbers: z.record(z.string()).optional(),
});

export default function AccountPage() {
  const { currentUser, isUserLoading, user } = useRole();
  const { toast } = useToast();
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const form = useForm<z.infer<typeof accountSchema>>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
        username: '',
        fullName: '',
        bio: '',
        phoneNumber: '',
        interestDomain: '',
        countryCode: '',
        linkedinUrl: '',
        portfolioUrl: '',
        certifiedNumbers: {},
    }
  });

  useEffect(() => {
    if (currentUser) {
      form.reset({
        username: currentUser.username || '',
        fullName: currentUser.fullName || '',
        bio: currentUser.bio || '',
        phoneNumber: currentUser.phoneNumber || '',
        countryCode: currentUser.countryCode || '',
        interestDomain: currentUser.careerGoals?.interestDomain || '',
        linkedinUrl: currentUser.socialLinks?.linkedin || '',
        portfolioUrl: currentUser.socialLinks?.website || '',
        certifiedNumbers: currentUser.certifiedMobileNumbers || {},
      });
    }
  }, [currentUser, form]);

  const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setSelectedImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const onCropComplete = async (croppedFile: File) => {
    if (!user) return;
    setSelectedImage(null);
    setIsUploading(true);

    try {
        const formData = new FormData();
        formData.append('file', croppedFile);
        formData.append('userId', user.uid);
        formData.append('folder', 'avatars');

        const response = await fetch('/api/storage/upload', { method: 'POST', body: formData });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);

        await updateUserProfileAction({ userId: user.uid, data: { profilePictureURL: data.url }, requesterId: user.uid });
        toast({ title: "Photo mise à jour !" });
    } catch (error: any) {
        toast({ variant: 'destructive', title: "Échec", description: error.message });
    } finally {
        setIsUploading(false);
    }
  };

  const onSubmit = async (values: z.infer<typeof accountSchema>) => {
    if (!currentUser) return;
    setIsSaving(true);

    const selectedCountry = africanCountries.find(c => c.code === values.countryCode);

    try {
        const result = await updateUserProfileAction({
            userId: currentUser.uid,
            data: {
                username: values.username,
                fullName: values.fullName,
                bio: values.bio || '',
                phoneNumber: values.phoneNumber || '',
                countryCode: values.countryCode,
                countryName: selectedCountry?.name || '',
                'careerGoals.interestDomain': values.interestDomain,
                'socialLinks.linkedin': values.linkedinUrl || '',
                'socialLinks.website': values.portfolioUrl || '',
                certifiedMobileNumbers: values.certifiedNumbers || {},
                isProfileComplete: true
            },
            requesterId: currentUser.uid
        });
        if (result.success) toast({ title: "Profil mis à jour !" });
        else throw new Error(result.error);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erreur', description: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  if (isUserLoading || !currentUser) {
    return <div className="flex h-screen items-center justify-center bg-[#0f172a]"><Loader2 className="h-10 w-10 animate-spin text-primary"/></div>;
  }

  // Opérateurs spécifiques au pays de l'utilisateur
  const userCountryOperators = COUNTRY_OPERATORS[currentUser.countryCode || ''] || [];

  return (
    <div className="max-w-md mx-auto min-h-screen bg-[#0f172a] relative flex flex-col font-sans">
      <div className="grain-overlay" />
      
      {selectedImage && <ImageCropper image={selectedImage} onCropComplete={onCropComplete} onClose={() => setSelectedImage(null)} />}

      <header className="fixed top-0 w-full max-w-md z-50 bg-[#0f172a]/95 backdrop-blur-md safe-area-pt border-b border-white/5">
        <div className="px-6 py-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
                <button onClick={() => router.back()} className="w-10 h-10 rounded-full bg-[#1e293b] flex items-center justify-center text-gray-400 hover:text-white transition active:scale-90 shadow-xl">
                    <ArrowLeft size={20} />
                </button>
                <h1 className="font-black text-xl text-white uppercase tracking-tight">Mon Identité</h1>
            </div>
            {currentUser.isInstructorApproved && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20">
                    <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                    <span className="text-[9px] font-black text-primary uppercase tracking-widest">Expert</span>
                </div>
            )}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto hide-scrollbar pt-32 pb-40">
        <div className="px-6 space-y-10 animate-in fade-in duration-700">
            
            <div className="flex flex-col items-center">
                <div className="relative group avatar-upload" onClick={() => fileInputRef.current?.click()}>
                    <div className="p-1 rounded-full bg-gradient-to-tr from-primary to-blue-500 shadow-[0_0_30px_rgba(16,185,129,0.3)]">
                        <Avatar className="h-32 w-32 border-4 border-[#0f172a] shadow-2xl overflow-hidden relative">
                            <AvatarImage src={currentUser.profilePictureURL} className="object-cover" />
                            <AvatarFallback className="bg-slate-800 text-4xl font-black text-slate-500">{currentUser.fullName?.charAt(0)}</AvatarFallback>
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <Camera className="text-white h-8 w-8" />
                            </div>
                        </Avatar>
                    </div>
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={onFileSelect} />
                    <div className="absolute bottom-1 right-1 h-9 w-9 rounded-full bg-primary flex items-center justify-center shadow-xl border-4 border-[#0f172a]">
                        <Camera className="h-4 w-4 text-[#0f172a]" />
                    </div>
                </div>
            </div>

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                    
                    <div className="bg-[#1e293b] rounded-4xl p-6 border border-white/5 shadow-xl space-y-6">
                        <h3 className="font-black text-slate-400 text-[10px] uppercase tracking-[0.3em] mb-2 border-b border-white/5 pb-2">Identité Publique</h3>

                        <FormField control={form.control} name="fullName" render={({ field }) => (
                            <FormItem className="space-y-2">
                                <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Nom Complet</FormLabel>
                                <FormControl>
                                    <Input {...field} value={field.value ?? ''} className="h-14 bg-[#0f172a] border-white/5 rounded-[1.5rem] text-white font-bold" placeholder="Jean Ndara" />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}/>

                        <FormField control={form.control} name="countryCode" render={({ field }) => (
                            <FormItem className="space-y-2">
                                <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Pays de résidence</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                                    <FormControl>
                                        <SelectTrigger className="h-14 bg-[#0f172a] border-white/5 rounded-[1.5rem] text-white font-bold">
                                            <div className="flex items-center gap-2">
                                                <SelectValue placeholder="Choisir votre pays" />
                                            </div>
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent className="bg-[#1e293b] border-white/10 text-white max-h-80">
                                        {africanCountries.map(country => (
                                            <SelectItem key={country.code} value={country.code} className="py-3 font-bold">
                                                <span className="mr-3">{country.emoji}</span>
                                                {country.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}/>
                    </div>

                    {/* 🛡️ SECTION SÉCURITÉ PAIEMENTS : FILTRÉE PAR PAYS */}
                    <div className="bg-[#1e293b] rounded-4xl p-6 border border-emerald-500/20 shadow-xl space-y-6 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-5"><Lock size={80} /></div>
                        
                        <div className="flex items-center gap-3 mb-2 border-b border-white/5 pb-2">
                            <ShieldAlert className="h-4 w-4 text-emerald-500" />
                            <h3 className="font-black text-emerald-500 text-[10px] uppercase tracking-[0.3em]">Certification Mobile Money</h3>
                        </div>

                        {userCountryOperators.length > 0 ? (
                            <>
                                <FormDescription className="text-[10px] text-slate-400 italic leading-relaxed">
                                    "Enregistrez vos numéros pour votre pays ({currentUser.countryName}). Une fois certifiés, ils sont scellés pour votre sécurité."
                                </FormDescription>

                                <div className="grid gap-4">
                                    {userCountryOperators.map(op => (
                                        <OperatorCertifiedInput 
                                            key={op.id}
                                            form={form} 
                                            operator={op}
                                            countryCode={currentUser.countryCode || ''}
                                            isCert={!!currentUser.certifiedMobileNumbers?.[`${currentUser.countryCode}_${op.id.toUpperCase()}`]} 
                                        />
                                    ))}
                                </div>
                            </>
                        ) : (
                            <div className="p-4 bg-slate-950/50 rounded-2xl text-center space-y-3">
                                <AlertCircle className="mx-auto text-slate-600 h-8 w-8" />
                                <p className="text-[10px] font-black uppercase text-slate-500 leading-relaxed">
                                    Aucun opérateur n'est encore supporté pour votre région ({currentUser.countryName}).
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="bg-[#1e293b] rounded-4xl p-6 border border-white/5 shadow-xl space-y-6">
                        <h3 className="font-black text-slate-400 text-[10px] uppercase tracking-[0.3em] mb-2 border-b border-white/5 pb-2">Expertise & Histoire</h3>

                        <FormField control={form.control} name="interestDomain" render={({ field }) => (
                            <FormItem className="space-y-2">
                                <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Domaine d'Expertise</FormLabel>
                                <FormControl>
                                    <Input placeholder="Ex: AgriTech Specialist" {...field} value={field.value ?? ''} className="h-14 bg-[#0f172a] border-white/5 rounded-[1.5rem] text-white font-bold" />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}/>

                        <FormField control={form.control} name="bio" render={({ field }) => (
                            <FormItem className="space-y-2">
                                <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Biographie Inspirante</FormLabel>
                                <FormControl>
                                    <Textarea 
                                        {...field} 
                                        value={field.value ?? ''} 
                                        rows={6} 
                                        className="bg-[#0f172a] border-white/5 rounded-[1.5rem] text-gray-200 resize-none p-4 leading-relaxed italic font-serif" 
                                        placeholder="Racontez votre histoire..."
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}/>
                    </div>

                    <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-[#0f172a] via-[#0f172a] to-transparent z-40 safe-area-pb">
                        <Button 
                            type="submit" 
                            disabled={isSaving} 
                            className="w-full h-16 rounded-[2.5rem] bg-gradient-to-r from-primary to-emerald-600 text-[#0f172a] font-black uppercase text-xs tracking-[0.2em] shadow-[0_0_25px_rgba(16,185,129,0.4)] transition-all active:scale-95 animate-pulse-glow border-none"
                        >
                            {isSaving ? <Loader2 className="h-5 w-5 animate-spin"/> : <><CheckCircle2 className="mr-2 h-5 w-5" /> Sauvegarder mon héritage</>}
                        </Button>
                    </div>
                </form>
            </Form>
        </div>
      </main>
    </div>
  );
}

function OperatorCertifiedInput({ form, operator, countryCode, isCert }: { form: any, operator: any, countryCode: string, isCert: boolean }) {
    const fieldName = `certifiedNumbers.${countryCode}_${operator.id.toUpperCase()}`;

    return (
        <FormField control={form.control} name={fieldName} render={({ field }) => (
            <FormItem className="space-y-1">
                <div className="flex justify-between items-center px-1">
                    <FormLabel className="text-[9px] font-black uppercase text-slate-500 flex items-center gap-1.5">
                        <OperatorLogo logo={operator.logo} size={18} /> {operator.name}
                    </FormLabel>
                    {isCert && (
                        <div className="flex items-center gap-1 text-[8px] font-black text-emerald-500 uppercase bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 shadow-inner">
                            <CheckCircle2 size={10} /> Certifié
                        </div>
                    )}
                </div>
                <FormControl>
                    <div className="relative">
                        <Input 
                            {...field} 
                            disabled={isCert} 
                            placeholder={isCert ? field.value : "Numéro de compte..."}
                            className={cn(
                                "h-12 bg-[#0f172a] border-white/5 rounded-xl font-mono text-sm tracking-widest",
                                isCert ? "opacity-60 text-slate-400 border-emerald-500/20 bg-slate-900" : "text-white focus:border-primary/40"
                            )} 
                        />
                        {isCert && <div className="absolute inset-0 bg-transparent z-10 cursor-not-allowed" />}
                    </div>
                </FormControl>
            </FormItem>
        )}/>
    );
}