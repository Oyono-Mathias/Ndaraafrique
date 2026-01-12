
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRole } from '@/context/RoleContext';
import { getAuth, updateProfile, sendPasswordResetEmail, signOut } from 'firebase/auth';
import { getFirestore, doc, updateDoc, collection, query, where, getCountFromServer } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import Image from 'next/image';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from '@/hooks/use-toast';
import { Loader2, Edit3, Shield, CreditCard, Linkedin, Twitter, Youtube, AlertTriangle, Wallet, Bell, BookOpen, Award, Sparkles } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { useCollection } from '@/firebase';
import { useRouter } from 'next/navigation';


// --- PAN-AFRICAN Country and Payment Data ---
type Region = 'UEMOA' | 'CEMAC' | 'EAST_AFRICA' | 'NORTH_AFRICA' | 'SOUTHERN_AFRICA' | 'OTHER_WEST' | 'OTHER';

interface Country {
  code: string;
  name: string;
  emoji: string;
  prefix: string;
  region: Region;
}

const africanCountries: Country[] = [
  { code: 'DZ', name: 'Algérie', emoji: '🇩🇿', prefix: '213', region: 'NORTH_AFRICA' as Region },
  { code: 'AO', name: 'Angola', emoji: '🇦🇴', prefix: '244', region: 'OTHER' as Region },
  { code: 'BJ', name: 'Bénin', emoji: '🇧🇯', prefix: '229', region: 'UEMOA' as Region },
  { code: 'BW', name: 'Botswana', emoji: '🇧🇼', prefix: '267', region: 'SOUTHERN_AFRICA' as Region },
  { code: 'BF', name: 'Burkina Faso', emoji: '🇧🇫', prefix: '226', region: 'UEMOA' as Region },
  { code: 'BI', name: 'Burundi', emoji: '🇧🇮', prefix: '257', region: 'EAST_AFRICA' as Region },
  { code: 'CV', name: 'Cabo Verde', emoji: '🇨🇻', prefix: '238', region: 'OTHER_WEST' as Region },
  { code: 'CM', name: 'Cameroun', emoji: '🇨🇲', prefix: '237', region: 'CEMAC' as Region },
  { code: 'CF', name: 'République centrafricaine', emoji: '🇨🇫', prefix: '236', region: 'CEMAC' as Region },
  { code: 'TD', name: 'Tchad', emoji: '🇹🇩', prefix: '235', region: 'CEMAC' as Region },
  { code: 'KM', name: 'Comores', emoji: '🇰🇲', prefix: '269', region: 'EAST_AFRICA' as Region },
  { code: 'CG', name: 'Congo', emoji: '🇨🇬', prefix: '242', region: 'CEMAC' as Region },
  { code: 'CD', name: 'RD Congo', emoji: '🇨🇩', prefix: '243', region: 'CEMAC' as Region },
  { code: 'CI', name: 'Côte d\'Ivoire', emoji: '🇨🇮', prefix: '225', region: 'UEMOA' as Region },
  { code: 'DJ', name: 'Djibouti', emoji: '🇩🇯', prefix: '253', region: 'EAST_AFRICA' as Region },
  { code: 'EG', name: 'Égypte', emoji: '🇪🇬', prefix: '20', region: 'NORTH_AFRICA' as Region },
  { code: 'GQ', name: 'Guinée équatoriale', emoji: '🇬🇶', prefix: '240', region: 'CEMAC' as Region },
  { code: 'ER', name: 'Érythrée', emoji: '🇪🇷', prefix: '291', region: 'EAST_AFRICA' as Region },
  { code: 'SZ', name: 'Eswatini', emoji: '🇸🇿', prefix: '268', region: 'SOUTHERN_AFRICA' as Region },
  { code: 'ET', name: 'Éthiopie', emoji: '🇪🇹', prefix: '251', region: 'EAST_AFRICA' as Region },
  { code: 'GA', name: 'Gabon', emoji: '🇬🇦', prefix: '241', region: 'CEMAC' as Region },
  { code: 'GM', name: 'Gambie', emoji: '🇬🇲', prefix: '220', region: 'OTHER_WEST' as Region },
  { code: 'GH', name: 'Ghana', emoji: '🇬🇭', prefix: '233', region: 'OTHER_WEST' as Region },
  { code: 'GN', name: 'Guinée', emoji: '🇬🇳', prefix: '224', region: 'OTHER_WEST' as Region },
  { code: 'GW', name: 'Guinée-Bissau', emoji: '🇬🇼', prefix: '245', region: 'UEMOA' as Region },
  { code: 'KE', name: 'Kenya', emoji: '🇰🇪', prefix: '254', region: 'EAST_AFRICA' as Region },
  { code: 'LS', name: 'Lesotho', emoji: '🇱🇸', prefix: '266', region: 'SOUTHERN_AFRICA' as Region },
  { code: 'LR', name: 'Libéria', emoji: '🇱🇷', prefix: '231', region: 'OTHER_WEST' as Region },
  { code: 'LY', name: 'Libye', emoji: '🇱🇾', prefix: '218', region: 'NORTH_AFRICA' as Region },
  { code: 'MG', name: 'Madagascar', emoji: '🇲🇬', prefix: '261', region: 'EAST_AFRICA' as Region },
  { code: 'MW', name: 'Malawi', emoji: '🇲🇼', prefix: '265', region: 'SOUTHERN_AFRICA' as Region },
  { code: 'ML', name: 'Mali', emoji: '🇲🇱', prefix: '223', region: 'UEMOA' as Region },
  { code: 'MR', name: 'Mauritanie', emoji: '🇲🇷', prefix: '222', region: 'OTHER_WEST' as Region },
  { code: 'MU', name: 'Maurice', emoji: '🇲🇺', prefix: '230', region: 'EAST_AFRICA' as Region },
  { code: 'MA', name: 'Maroc', emoji: '🇲🇦', prefix: '212', region: 'NORTH_AFRICA' as Region },
  { code: 'MZ', name: 'Mozambique', emoji: '🇲🇿', prefix: '258', region: 'SOUTHERN_AFRICA' as Region },
  { code: 'NA', name: 'Namibie', emoji: '🇳🇦', prefix: '264', region: 'SOUTHERN_AFRICA' as Region },
  { code: 'NE', name: 'Niger', emoji: '🇳🇪', prefix: '227', region: 'UEMOA' as Region },
  { code: 'NG', name: 'Nigéria', emoji: '🇳🇬', prefix: '234', region: 'OTHER_WEST' as Region },
  { code: 'RW', name: 'Rwanda', emoji: '🇷🇼', prefix: '250', region: 'EAST_AFRICA' as Region },
  { code: 'ST', name: 'Sao Tomé-et-Principe', emoji: '🇸🇹', prefix: '239', region: 'CEMAC' as Region },
  { code: 'SN', name: 'Sénégal', emoji: '🇸🇳', prefix: '221', region: 'UEMOA' as Region },
  { code: 'SC', name: 'Seychelles', emoji: '🇸🇨', prefix: '248', region: 'EAST_AFRICA' as Region },
  { code: 'SL', name: 'Sierra Leone', emoji: '🇸🇱', prefix: '232', region: 'OTHER_WEST' as Region },
  { code: 'SO', name: 'Somalie', emoji: '🇸🇴', prefix: '252', region: 'EAST_AFRICA' as Region },
  { code: 'ZA', name: 'Afrique du Sud', emoji: '🇿🇦', prefix: '27', region: 'SOUTHERN_AFRICA' as Region },
  { code: 'SS', name: 'Soudan du Sud', emoji: '🇸🇸', prefix: '211', region: 'EAST_AFRICA' as Region },
  { code: 'SD', name: 'Soudan', emoji: '🇸🇩', prefix: '249', region: 'NORTH_AFRICA' as Region },
  { code: 'TZ', name: 'Tanzanie', emoji: '🇹🇿', prefix: '255', region: 'EAST_AFRICA' as Region },
  { code: 'TG', name: 'Togo', emoji: '🇹🇬', prefix: '228', region: 'UEMOA' as Region },
  { code: 'TN', name: 'Tunisie', emoji: '🇹🇳', prefix: '216', region: 'NORTH_AFRICA' as Region },
  { code: 'UG', name: 'Ouganda', emoji: '🇺🇬', prefix: '256', region: 'EAST_AFRICA' as Region },
  { code: 'ZM', name: 'Zambie', emoji: '🇿🇲', prefix: '260', region: 'SOUTHERN_AFRICA' as Region },
  { code: 'ZW', name: 'Zimbabwe', emoji: '🇿🇼', prefix: '263', region: 'SOUTHERN_AFRICA' as Region },
].sort((a, b) => a.name.localeCompare(b.name));

const PaymentMethodLogo = ({ method, className }: { method?: string, className?: string }) => {
    const logos: Record<string, React.FC<React.SVGProps<SVGSVGElement>>> = {
        'mobile_money_wave': (props) => (<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-2.29-2.29l-1.42-1.42L12 12.59l3.71-3.71 1.42 1.42L13.41 14l3.71 3.71-1.42 1.42L12 15.41l-3.71 3.71z" fill="#4B0082"/></svg>),
        'mobile_money_mtn': (props) => (<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}><path d="M32 0C14.33 0 0 14.33 0 32s14.33 32 32 32 32-14.33 32-32S49.67 0 32 0z" fill="#FFCC00"/><path d="M32 6c-14.36 0-26 11.64-26 26s11.64 26 26 26 26-11.64 26-26S46.36 6 32 6z" fill="#0073B3"/><path d="M21.5 22.5h-5v19h5v-19zm9.75 0h-5v19h5v-19zm9.75 0h-5v19h5v-19zm9.75 0h-5v19h5v-19z" fill="#fff"/></svg>),
        'mobile_money_orange': (props) => (<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" {...props}><path d="M12,2A10,10,0,1,0,22,12,10,10,0,0,0,12,2Zm0,18a8,8,0,1,1,8-8A8,8,0,0,1,12,20Z" fill="#ff7900"/><path d="M12,7a5,5,0,1,0,5,5A5,5,0,0,0,12,7Zm0,8a3,3,0,1,1,3-3A3,3,0,0,1,12,15Z" fill="#ff7900"/></svg>),
        'mobile_money_airtel': (props) => (<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" {...props}><path d="M22.45 15.75c-.38-.2-7.85-3.87-7.85-3.87s-.44-.22-.68.06c-.24.28-.56.7-.65.83-.1.13-.19.16-.36.08-.17-.08-2.6-1.02-4.13-2.93-.84-.84-1.4-1.88-1.47-2.02-.07-.14.02-.21.13-.32.12-.11.26-.28.39-.42.13-.14.17-.24.25-.4.08-.16.04-.3-.02-.42l-2.04-4.94c-.2-.48-.4-.42-.54-.42H3.34c-.16 0-.42.06-.64.3C2.48 6.47.6 8.35.6 11.23c0 2.88 2.62 5.25 2.86 5.5.24.25 5.2 8.3 12.63 10.43 1.76.5 3.1.45 4.02.26 1.07-.22 3.12-1.74 3.56-3.32.44-1.58.44-2.92.32-3.15-.12-.22-.38-.34-.78-.54z" fill="#E40000"/></svg>),
        'paypal': (props) => (<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" {...props}><path d="M3.3,16.8h4.8c3,0,4.8-1.5,5.2-4.5h-4.3c-0.4,1.4-1.3,2-2.5,2H5.6L4,4.2h5.4c0.8,0,1.4,0.1,1.7,1 c0.5,1.2,0,2.6-0.7,3.6H15c-0.2-2.8-2.3-5.6-5.8-5.6H4.4L1.1,21H8c2.9,0,4.6-1.4,5-4.2h-4.3c-0.3,1.1-1,1.7-2.1,1.7H5.7L3.3,16.8z" fill="#0070BA"/><path d="M12.9,9.4H17c-0.2-2.8-2.3-5.6-5.8-5.6H6.4L3.1,21h6.6c3.4,0,5.7-2.5,6.2-6.2h-4.1 C11.4,16.4,10,18.5,7.6,18.5H5.1L4.2,14h5.3c2.7,0,4.3-1.6,4.7-4.6H12.9z" fill="#009CDE"/></svg>),
        'bank_transfer': (props) => (<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" {...props}><path fill="#707070" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9v-4H7v4H5v-6h6v6zm6 0h-2v-4h-2v4h-2v-6h6v6z"/></svg>),
    };

    const Logo = logos[method || ''] || Wallet;
    return <Logo className={cn("h-6 w-6", className)} />;
};

const paymentMethodsByRegion: Record<Region, { value: string; label: string; }[]> = {
    UEMOA: [ // Senegal, CIV, Benin...
        { value: 'mobile_money_wave', label: 'Mobile Money (Wave)' },
        { value: 'mobile_money_orange', label: 'Mobile Money (Orange)' },
        { value: 'bank_transfer', label: 'Virement Bancaire' },
    ],
    CEMAC: [ // Cameroun, Gabon...
        { value: 'mobile_money_mtn', label: 'Mobile Money (MTN)' },
        { value: 'mobile_money_orange', label: 'Mobile Money (Orange)' },
        { value: 'bank_transfer', label: 'Virement Bancaire' },
    ],
    EAST_AFRICA: [ // Kenya, TZ...
        { value: 'mobile_money_mpesa', label: 'Mobile Money (M-Pesa)' },
        { value: 'mobile_money_airtel', label: 'Mobile Money (Airtel)' },
        { value: 'bank_transfer', label: 'Virement Bancaire' },
    ],
    OTHER_WEST: [ // Nigeria, Ghana...
        { value: 'flutterwave', label: 'Flutterwave / Paystack' },
        { value: 'bank_transfer', label: 'Virement Bancaire' },
    ],
    NORTH_AFRICA: [
        { value: 'paypal', label: 'PayPal' },
        { value: 'bank_transfer', label: 'Virement Bancaire' },
    ],
    SOUTHERN_AFRICA: [
        { value: 'bank_transfer', label: 'Virement Bancaire' },
        { value: 'paypal', label: 'PayPal' },
    ],
    OTHER: [
        { value: 'bank_transfer', label: 'Virement Bancaire' },
        { value: 'paypal', label: 'PayPal' },
    ]
};

const profileFormSchema = z.object({
  fullName: z.string().min(3, { message: 'Le nom complet doit contenir au moins 3 caractères.' }),
  bio: z.string().optional(),
  socialLinks: z.object({
    linkedin: z.string().url({ message: "Veuillez entrer une URL valide." }).optional().or(z.literal('')),
    twitter: z.string().url({ message: "Veuillez entrer une URL valide." }).optional().or(z.literal('')),
    youtube: z.string().url({ message: "Veuillez entrer une URL valide." }).optional().or(z.literal('')),
  }).optional(),
});

const paymentFormSchema = z.object({
  country: z.string().min(2, "Veuillez sélectionner votre pays de résidence."),
  method: z.string().min(1, "Veuillez sélectionner une méthode de paiement."),
  details: z.object({
    phoneNumber: z.string().optional(),
    bankName: z.string().optional(),
    iban: z.string().optional(),
    swiftCode: z.string().optional(),
    paypalEmail: z.string().email("Veuillez entrer une adresse e-mail PayPal valide.").optional().or(z.literal('')),
  }),
}).refine(data => {
    if (data.method.startsWith('mobile_money')) {
        return !!data.details.phoneNumber && /^\d{7,15}$/.test(data.details.phoneNumber);
    }
    if (data.method === 'bank_transfer') {
        return !!data.details.bankName && !!data.details.iban && !!data.details.swiftCode;
    }
    if (data.method === 'paypal') {
        return !!data.details.paypalEmail;
    }
    return true;
}, {
    message: "Veuillez remplir tous les champs requis pour la méthode sélectionnée.",
    path: ["details"],
});

const notificationFormSchema = z.object({
  promotions: z.boolean().default(false),
  reminders: z.boolean().default(false),
});


type ProfileFormValues = z.infer<typeof profileFormSchema>;
type PaymentFormValues = z.infer<typeof paymentFormSchema>;
type NotificationFormValues = z.infer<typeof notificationFormSchema>;

const StatCard = ({ title, icon, value, isLoading }: { title: string, icon: React.ElementType, value: number | string, isLoading: boolean }) => {
    const Icon = icon;
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                {isLoading ? <Skeleton className="h-8 w-1/2" /> : <div className="text-2xl font-bold">{value}</div>}
            </CardContent>
        </Card>
    );
};


export default function AccountPage() {
  const { user, formaAfriqueUser, isUserLoading, role } = useRole();
  const router = useRouter();
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPayment, setIsSavingPayment] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [avatarVersion, setAvatarVersion] = useState(0);
  const [isClient, setIsClient] = useState(false);
  const [stats, setStats] = useState({ enrolled: 0, completed: 0 });
  const [statsLoading, setStatsLoading] = useState(true);
  const db = getFirestore();

  useEffect(() => {
    setIsClient(true);
    if(user){
        const fetchStats = async () => {
            setStatsLoading(true);
            const enrollmentsRef = collection(db, 'enrollments');
            const q = query(enrollmentsRef, where('studentId', '==', user.uid));
            const completedQuery = query(q, where('progress', '==', 100));

            try {
                const [totalSnapshot, completedSnapshot] = await Promise.all([
                    getCountFromServer(q),
                    getCountFromServer(completedQuery)
                ]);
                setStats({
                    enrolled: totalSnapshot.data().count,
                    completed: completedSnapshot.data().count
                });
            } catch (e) {
                console.error("Could not fetch user stats", e);
            } finally {
                setStatsLoading(false);
            }
        };
        fetchStats();
    }
  }, [user, db]);

  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: { fullName: '', bio: '', socialLinks: { linkedin: '', twitter: '', youtube: '' } },
  });

  const paymentForm = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: { country: undefined, method: undefined, details: { phoneNumber: '', bankName: '', iban: '', swiftCode: '', paypalEmail: '' } },
  });
  
  const notificationForm = useForm<NotificationFormValues>({
    resolver: zodResolver(notificationFormSchema),
    defaultValues: {
      promotions: true,
      reminders: true,
    },
  });

  const selectedCountryCode = paymentForm.watch('country');
  const selectedPaymentMethod = paymentForm.watch('method');
  const paymentDetails = paymentForm.watch('details');

  const selectedCountry = useMemo(() => africanCountries.find(c => c.code === selectedCountryCode), [selectedCountryCode]);
  const availablePaymentMethods = selectedCountry ? paymentMethodsByRegion[selectedCountry.region] : [];

  useEffect(() => {
    if (formaAfriqueUser) {
      profileForm.reset({
        fullName: formaAfriqueUser.fullName || '',
        bio: formaAfriqueUser.bio || '',
        socialLinks: {
            linkedin: formaAfriqueUser.socialLinks?.linkedin || '',
            twitter: formaAfriqueUser.socialLinks?.twitter || '',
            youtube: formaAfriqueUser.socialLinks?.youtube || '',
        }
      });
      const payoutData = (formaAfriqueUser as any).payoutMethod;
      if (payoutData) {
          paymentForm.reset({
              country: payoutData.country,
              method: payoutData.method,
              details: payoutData.details || {},
          });
      }
      if (formaAfriqueUser.notificationPreferences) {
        notificationForm.reset(formaAfriqueUser.notificationPreferences);
      }
    }
  }, [formaAfriqueUser, profileForm, paymentForm, notificationForm]);
  
  const onProfileSubmit = async (data: ProfileFormValues) => {
    if (!formaAfriqueUser) return;
    setIsSavingProfile(true);

    const auth = getAuth();
    const userDocRef = doc(db, 'users', formaAfriqueUser.uid);

    try {
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, { displayName: data.fullName });
      }
      await updateDoc(userDocRef, {
        fullName: data.fullName,
        bio: data.bio,
        socialLinks: data.socialLinks,
      });
      toast({ title: 'Profil mis à jour !' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de mettre à jour le profil.' });
      console.error(error);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handlePasswordReset = async () => {
    const auth = getAuth();
    if (auth.currentUser?.email) {
      try {
        await sendPasswordResetEmail(auth, auth.currentUser.email);
        toast({ title: 'E-mail envoyé', description: 'Vérifiez votre boîte de réception pour réinitialiser votre mot de passe.' });
      } catch (error) {
        toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible d\'envoyer l\'e-mail.' });
      }
    }
  };

  const onPaymentSubmit = async (data: PaymentFormValues) => {
    if (!formaAfriqueUser) return;
    setIsSavingPayment(true);
    
    const userDocRef = doc(db, 'users', formaAfriqueUser.uid);

    try {
        await updateDoc(userDocRef, { payoutMethod: data });
        toast({ title: 'Informations de paiement mises à jour !' });
    } catch (error) {
        toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de sauvegarder les informations.'});
    } finally {
        setIsSavingPayment(false);
    }
  };
  
  const onNotificationChange = async (data: NotificationFormValues) => {
    if (!formaAfriqueUser) return;
    try {
      const userDocRef = doc(db, 'users', formaAfriqueUser.uid);
      await updateDoc(userDocRef, {
        notificationPreferences: data
      });
      toast({ title: 'Préférences sauvegardées' });
    } catch (error) {
      console.error("Failed to save notification preferences:", error);
      toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de sauvegarder les préférences.' });
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0 || !formaAfriqueUser) {
      return;
    }
    const file = event.target.files[0];
    setIsUploading(true);

    const storage = getStorage();
    const auth = getAuth();
    const filePath = `avatars/${formaAfriqueUser.uid}/${file.name}`;
    const storageRef = ref(storage, filePath);

    try {
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);

      if (auth.currentUser) {
        await updateProfile(auth.currentUser, { photoURL: downloadURL });
      }
      const userDocRef = doc(db, 'users', formaAfriqueUser.uid);
      await updateDoc(userDocRef, { profilePictureURL: downloadURL });

      toast({ title: 'Avatar mis à jour !' });
      setAvatarVersion(v => v + 1);

    } catch (error) {
      toast({ variant: 'destructive', title: 'Erreur d\'upload', description: 'Impossible de changer l\'avatar.' });
      console.error(error);
    } finally {
      setIsUploading(false);
    }
  };

  if (!isClient) {
    return <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }
  
  if (isUserLoading || !formaAfriqueUser) {
    return <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col sm:flex-row items-center gap-6">
         <Avatar className="h-24 w-24 border-4 border-amber-300 shadow-lg" key={avatarVersion}>
            <AvatarImage src={formaAfriqueUser.profilePictureURL} />
            <AvatarFallback className="text-3xl">{formaAfriqueUser.fullName?.charAt(0)}</AvatarFallback>
        </Avatar>
        <div className="text-center sm:text-left">
            <h1 className="text-3xl font-bold text-foreground">Bonjour, {formaAfriqueUser.fullName} !</h1>
            <p className="text-muted-foreground">{formaAfriqueUser.email}</p>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard title="Cours Inscrits" icon={BookOpen} value={stats.enrolled} isLoading={statsLoading} />
        <StatCard title="Certificats Obtenus" icon={Award} value={stats.completed} isLoading={statsLoading} />
        <StatCard title="Badge" icon={Sparkles} value={formaAfriqueUser.badges?.includes('pioneer') ? 'Pionnier' : 'Membre Actif'} isLoading={false} />
      </div>

      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList>
          <TabsTrigger value="profile"><Edit3 className="mr-2 h-4 w-4"/>Profil</TabsTrigger>
          {role === 'instructor' && <TabsTrigger value="payment"><CreditCard className="mr-2 h-4 w-4"/>Paiements</TabsTrigger>}
          <TabsTrigger value="notifications"><Bell className="mr-2 h-4 w-4"/>Notifications</TabsTrigger>
          <TabsTrigger value="security"><Shield className="mr-2 h-4 w-4"/>Sécurité</TabsTrigger>
        </TabsList>
        
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Profil Public</CardTitle>
              <CardDescription>Ces informations seront visibles par les autres utilisateurs.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Button asChild variant="outline">
                    <label htmlFor="avatar-upload" className="cursor-pointer">
                      {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Edit3 className="mr-2 h-4 w-4" />}
                      Changer l'avatar
                    </label>
                  </Button>
                   <Input id="avatar-upload" type="file" accept="image/*" className="absolute w-full h-full top-0 left-0 opacity-0 cursor-pointer" onChange={handleAvatarUpload} disabled={isUploading}/>
                </div>
              </div>
              <Form {...profileForm}>
                <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
                  <FormField control={profileForm.control} name="fullName" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nom complet</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={profileForm.control} name="bio" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Biographie</FormLabel>
                      <FormControl><Textarea placeholder="Parlez un peu de vous..." {...field} rows={4} /></FormControl>
                       <FormMessage />
                    </FormItem>
                  )} />

                  <div className="space-y-4 pt-4 border-t">
                     <h3 className="text-sm font-medium">Réseaux Sociaux</h3>
                     <FormField control={profileForm.control} name="socialLinks.linkedin" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2"><Linkedin className="h-4 w-4"/> LinkedIn</FormLabel>
                          <FormControl><Input placeholder="https://www.linkedin.com/in/..." {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                     )} />
                     <FormField control={profileForm.control} name="socialLinks.twitter" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2"><Twitter className="h-4 w-4"/> Twitter / X</FormLabel>
                          <FormControl><Input placeholder="https://twitter.com/..." {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                     )} />
                     <FormField control={profileForm.control} name="socialLinks.youtube" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2"><Youtube className="h-4 w-4"/> YouTube</FormLabel>
                          <FormControl><Input placeholder="https://www.youtube.com/channel/..." {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                     )} />
                  </div>

                  <Button type="submit" disabled={isSavingProfile}>
                    {isSavingProfile && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Enregistrer les modifications
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        {role === 'instructor' && (
          <TabsContent value="payment">
            <Card>
                <CardHeader>
                    <CardTitle>Informations de Paiement</CardTitle>
                    <CardDescription>Configurez la réception de vos revenus de manière internationale.</CardDescription>
                </CardHeader>
                <CardContent>
                     {isClient ? (
                       <Form {...paymentForm}>
                          <form onSubmit={paymentForm.handleSubmit(onPaymentSubmit)} className="space-y-6">
                               {paymentDetails && (selectedPaymentMethod && ((selectedPaymentMethod.startsWith("mobile") && paymentDetails.phoneNumber) || (selectedPaymentMethod === "bank_transfer" && paymentDetails.iban) || (selectedPaymentMethod === "paypal" && paymentDetails.paypalEmail) ) ) && (
                                  <Card className="bg-muted/50 border-dashed">
                                      <CardHeader>
                                          <CardTitle className="text-base flex items-center justify-between">
                                              <span>Méthode de retrait active</span>
                                              <Button variant="link" size="sm" className="p-0 h-auto" onClick={() => paymentForm.reset()}>Changer</Button>
                                          </CardTitle>
                                      </CardHeader>
                                      <CardContent className="flex items-center gap-4">
                                          <PaymentMethodLogo method={selectedPaymentMethod} className="h-12 w-12" />
                                          <div>
                                              <p className="font-semibold">{availablePaymentMethods.find(m => m.value === selectedPaymentMethod)?.label}</p>
                                              <p className="text-muted-foreground text-sm font-mono">
                                                  {selectedPaymentMethod.startsWith('mobile_money') ? `+${selectedCountry?.prefix} ${paymentDetails.phoneNumber}` :
                                                   selectedPaymentMethod === 'bank_transfer' ? `${paymentDetails.iban}` :
                                                   paymentDetails.paypalEmail
                                                  }
                                              </p>
                                          </div>
                                      </CardContent>
                                  </Card>
                              )}
  
                              <FormField
                                  control={paymentForm.control}
                                  name="country"
                                  render={({ field }) => (
                                      <FormItem>
                                          <FormLabel>Pays de résidence</FormLabel>
                                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                                              <FormControl>
                                                  <SelectTrigger>
                                                      <SelectValue placeholder="Sélectionnez votre pays">
                                                          {selectedCountry && <span>{selectedCountry.emoji} {selectedCountry.name}</span>}
                                                      </SelectValue>
                                                  </SelectTrigger>
                                              </FormControl>
                                              <SelectContent>
                                                  {africanCountries.map(c => (
                                                      <SelectItem key={c.code} value={c.code}>
                                                          <div className="flex items-center gap-2">
                                                              <span>{c.emoji}</span>
                                                              <span>{c.name}</span>
                                                          </div>
                                                      </SelectItem>
                                                  ))}
                                              </SelectContent>
                                          </Select>
                                          <FormMessage />
                                      </FormItem>
                                  )}
                              />
  
                              {selectedCountry && (
                                  <FormField
                                      control={paymentForm.control}
                                      name="method"
                                      render={({ field }) => (
                                          <FormItem>
                                              <FormLabel>Méthode de retrait</FormLabel>
                                              <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                                                  <FormControl>
                                                      <SelectTrigger>
                                                          <SelectValue placeholder="Sélectionnez une méthode" />
                                                      </SelectTrigger>
                                                  </FormControl>
                                                  <SelectContent>
                                                      {availablePaymentMethods.map(m => (
                                                          <SelectItem key={m.value} value={m.value}>
                                                              <div className="flex items-center gap-2">
                                                                  <PaymentMethodLogo method={m.value} />
                                                                  <span>{m.label}</span>
                                                              </div>
                                                          </SelectItem>
                                                      ))}
                                                  </SelectContent>
                                              </Select>
                                              <FormMessage />
                                          </FormItem>
                                      )}
                                  />
                              )}
  
                              {selectedPaymentMethod?.startsWith('mobile_money') && selectedCountry && (
                                  <FormField
                                      control={paymentForm.control}
                                      name="details.phoneNumber"
                                      render={({ field }) => (
                                          <FormItem>
                                              <FormLabel>Numéro de téléphone</FormLabel>
                                              <FormControl>
                                                  <div className="flex items-center">
                                                      <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-input bg-muted text-muted-foreground text-sm h-10">+{selectedCountry.prefix}</span>
                                                      <Input placeholder="Numéro sans l'indicatif" {...field} className="rounded-l-none" />
                                                  </div>
                                              </FormControl>
                                              <FormMessage />
                                          </FormItem>
                                      )}
                                  />
                              )}
  
                               {selectedPaymentMethod === 'paypal' && (
                                  <FormField control={paymentForm.control} name="details.paypalEmail" render={({ field }) => (
                                      <FormItem><FormLabel>Adresse e-mail PayPal</FormLabel><FormControl><Input placeholder="votre.email@paypal.com" {...field} /></FormControl><FormMessage /></FormItem>
                                  )} />
                               )}
  
                              {selectedPaymentMethod === 'bank_transfer' && (
                                  <div className="space-y-4 p-4 border rounded-lg">
                                       <FormField control={paymentForm.control} name="details.bankName" render={({ field }) => (
                                          <FormItem><FormLabel>Nom de la banque</FormLabel><FormControl><Input placeholder="Nom de votre banque" {...field} /></FormControl><FormMessage /></FormItem>
                                       )} />
                                       <FormField control={paymentForm.control} name="details.iban" render={({ field }) => (
                                          <FormItem><FormLabel>IBAN / RIB</FormLabel><FormControl><Input placeholder="Votre numéro de compte" {...field} /></FormControl><FormMessage /></FormItem>
                                       )} />
                                       <FormField control={paymentForm.control} name="details.swiftCode" render={({ field }) => (
                                          <FormItem><FormLabel>Code SWIFT</FormLabel><FormControl><Input placeholder="Code SWIFT/BIC de votre banque" {...field} /></FormControl><FormMessage /></FormItem>
                                       )} />
                                  </div>
                              )}
  
                               <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                                  <AlertTriangle className="h-5 w-5 text-muted-foreground mt-0.5"/>
                                  <p className="text-xs text-muted-foreground">
                                      Ces informations sont cryptées et ne seront utilisées que pour le traitement de vos paiements. Les montants affichés en XOF (FCFA) seront convertis dans votre devise locale au taux du jour lors du retrait.
                                  </p>
                              </div>
                               <Button type="submit" disabled={isSavingPayment}>
                                  {isSavingPayment && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                  Enregistrer
                               </Button>
                          </form>
                      </Form>
                     ) : (
                        <div className="space-y-4">
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-10 w-24" />
                        </div>
                     )}
                </CardContent>
            </Card>
          </TabsContent>
        )}
        
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Préférences de notification</CardTitle>
              <CardDescription>Gérez les e-mails que vous recevez de notre part.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <Form {...notificationForm}>
                    <form className="space-y-4">
                        <FormField
                            control={notificationForm.control}
                            name="promotions"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                    <div className="space-y-0.5">
                                        <FormLabel className="text-base">Promotions et nouveautés</FormLabel>
                                        <FormDescription>Recevez des e-mails sur les nouveaux cours, les offres et les actualités.</FormDescription>
                                    </div>
                                    <FormControl>
                                        <Switch
                                            checked={field.value}
                                            onCheckedChange={(checked) => {
                                                field.onChange(checked);
                                                onNotificationChange({ ...notificationForm.getValues(), promotions: checked });
                                            }}
                                        />
                                    </FormControl>
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={notificationForm.control}
                            name="reminders"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                    <div className="space-y-0.5">
                                        <FormLabel className="text-base">Rappels d'apprentissage</FormLabel>
                                        <FormDescription>Recevez des rappels pour continuer votre progression dans les cours.</FormDescription>
                                    </div>
                                    <FormControl>
                                         <Switch
                                            checked={field.value}
                                            onCheckedChange={(checked) => {
                                                field.onChange(checked);
                                                onNotificationChange({ ...notificationForm.getValues(), reminders: checked });
                                            }}
                                        />
                                    </FormControl>
                                </FormItem>
                            )}
                        />
                    </form>
                </Form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Sécurité du compte</CardTitle>
              <CardDescription>Gérez la sécurité de votre compte.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-medium">Mot de passe</h3>
                <p className="text-sm text-muted-foreground">Vous n'avez pas de mot de passe ? Configurez-en un ou utilisez la connexion via Google.</p>
                <Button variant="outline" className="mt-2" onClick={handlePasswordReset}>
                  Réinitialiser le mot de passe par e-mail
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
      </Tabs>
    </div>
  );
}
