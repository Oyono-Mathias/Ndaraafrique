'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRole } from '@/context/RoleContext';
import { getFirestore, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Loader2, UploadCloud, File as FileIcon, X } from 'lucide-react';
import Link from 'next/link';

const instructorApplicationSchema = z.object({
  motivation: z.string().min(50, { message: 'Veuillez décrire vos motivations avec au moins 50 caractères.' }),
  verificationDoc: z.instanceof(File).refine(file => file.size > 0, 'Un document est requis.'),
});

type ApplicationFormValues = z.infer<typeof instructorApplicationSchema>;

export default function BecomeInstructorPage() {
  const router = useRouter();
  const { user, formaAfriqueUser, isUserLoading } = useRole();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  const form = useForm<ApplicationFormValues>({
    resolver: zodResolver(instructorApplicationSchema),
  });
  
  useEffect(() => {
    // If not loading and not logged in, redirect to login
    if (!isUserLoading && !user) {
        toast({
            variant: "destructive",
            title: "Accès refusé",
            description: "Veuillez créer un compte pour accéder à ce contenu.",
        });
        router.push('/login?tab=register');
    }
  }, [user, isUserLoading, router, toast]);

  const onSubmit = async (data: ApplicationFormValues) => {
    if (!formaAfriqueUser) return;

    setIsSubmitting(true);
    const { motivation, verificationDoc } = data;

    const storage = getStorage();
    const filePath = `verification_docs/${formaAfriqueUser.uid}/${verificationDoc.name}`;
    const storageRef = ref(storage, filePath);
    const uploadTask = uploadBytesResumable(storageRef, verificationDoc);

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setUploadProgress(progress);
      },
      (error) => {
        console.error("Upload failed:", error);
        toast({ variant: 'destructive', title: 'Erreur d\'upload', description: 'Impossible de téléverser votre document.' });
        setIsSubmitting(false);
        setUploadProgress(null);
      },
      async () => {
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
        const db = getFirestore();
        const userDocRef = doc(db, 'users', formaAfriqueUser.uid);

        try {
          await updateDoc(userDocRef, {
            role: 'instructor',
            isInstructorApproved: false,
            instructorApplication: {
              motivation: motivation,
              verificationDocUrl: downloadURL,
              submittedAt: serverTimestamp(),
            }
          });

          toast({
            title: 'Candidature envoyée !',
            description: "Votre demande a bien été reçue et sera examinée par notre équipe.",
          });
          router.push('/dashboard');
        } catch (error) {
          console.error("Failed to update user role:", error);
          toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de soumettre votre candidature.' });
          setIsSubmitting(false);
        }
      }
    );
  };
  
   if (isUserLoading || (!isUserLoading && !user)) {
    return <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }
  
  if (formaAfriqueUser?.role === 'instructor' && formaAfriqueUser?.isInstructorApproved) {
    return (
        <div className="text-center p-8">
            <h1 className="text-2xl font-bold">Vous êtes déjà un instructeur !</h1>
            <p className="text-muted-foreground mt-2">Vous pouvez commencer à créer des cours.</p>
            <Button asChild className="mt-4"><Link href="/instructor/courses/create">Créer un cours</Link></Button>
        </div>
    );
  }
  
   if (formaAfriqueUser?.role === 'instructor' && !formaAfriqueUser?.isInstructorApproved) {
    return (
        <div className="text-center p-8">
            <h1 className="text-2xl font-bold">Votre candidature est en cours d'examen</h1>
            <p className="text-muted-foreground mt-2">Nous vous notifierons dès que votre profil sera validé.</p>
             <Button asChild className="mt-4"><Link href="/dashboard">Retour au tableau de bord</Link></Button>
        </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-12 px-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Devenez Instructeur sur FormaAfrique</CardTitle>
          <CardDescription>Partagez votre expertise et générez des revenus en formant la prochaine génération de talents.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="motivation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pourquoi souhaitez-vous enseigner ?</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Décrivez votre expérience et votre passion pour l'enseignement..." {...field} rows={5} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="verificationDoc"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Justificatif d'identité ou de compétence</FormLabel>
                    <FormDescription>Téléchargez une pièce d'identité (CNI, Passeport) ou un document prouvant votre expertise (diplôme, certificat).</FormDescription>
                    <FormControl>
                      <div>
                        {!form.watch('verificationDoc')?.size ? (
                          <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted">
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                              <UploadCloud className="w-8 h-8 mb-2 text-muted-foreground" />
                              <p className="text-sm text-muted-foreground">Cliquez pour uploader (PDF, JPG, PNG)</p>
                            </div>
                            <Input
                              type="file"
                              className="hidden"
                              accept=".pdf,.png,.jpg,.jpeg"
                              onChange={(e) => field.onChange(e.target.files?.[0])}
                            />
                          </label>
                        ) : (
                          <div className="flex items-center justify-between p-2 border rounded-lg">
                            <div className="flex items-center gap-2">
                                <FileIcon className="h-5 w-5" />
                                <span className="text-sm font-medium">{form.watch('verificationDoc').name}</span>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => form.setValue('verificationDoc', new File([], ''))}><X className="h-4 w-4"/></Button>
                          </div>
                        )}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {uploadProgress !== null && <Progress value={uploadProgress} className="w-full" />}

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {isSubmitting ? 'Envoi en cours...' : 'Envoyer ma candidature'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
