
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { getFirestore, doc, updateDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import Image from 'next/image';
import { useDoc, useMemoFirebase } from '@/firebase';
import { useRole } from '@/context/RoleContext';
import { assistCourseCreation, AssistCourseCreationOutput } from '@/ai/flows/assist-course-creation';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Sparkles, PlusCircle, Trash2, Video, Book, Image as ImageIcon } from 'lucide-react';
import type { Course } from '@/lib/types';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useTranslation } from 'react-i18next';
import { ImageCropper } from '@/components/ui/ImageCropper';

const courseEditSchema = z.object({
  title: z.string().min(5, 'Le titre doit contenir au moins 5 caractères.'),
  description: z.string().min(20, 'La description doit contenir au moins 20 caractères.'),
  category: z.string().min(3, 'La catégorie est requise.'),
  imageUrl: z.string().url("Veuillez entrer une URL d'image valide.").optional().or(z.literal('')),
  learningObjectives: z.array(z.object({ value: z.string().min(1, "L'objectif ne peut pas être vide.") })).optional(),
  prerequisites: z.array(z.object({ value: z.string().min(1, "Le prérequis ne peut pas être vide.") })).optional(),
  targetAudience: z.string().optional(),
  contentType: z.enum(['video', 'ebook']).default('video'),
  ebookUrl: z.string().url("Veuillez entrer une URL de PDF valide.").optional().or(z.literal('')),
});

type CourseEditFormValues = z.infer<typeof courseEditSchema>;

export default function EditCoursePage() {
  const { courseId } = useParams();
  const { toast } = useToast();
  const db = getFirestore();
  const storage = getStorage();
  const { t } = useTranslation();
  const { currentUser, isUserLoading } = useRole();

  const [isSaving, setIsSaving] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [croppedImageFile, setCroppedImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);


  const courseRef = useMemoFirebase(
    () => (courseId ? doc(db, 'courses', courseId as string) : null),
    [db, courseId]
  );
  const { data: course, isLoading: isCourseLoading } = useDoc<Course>(courseRef);

  const form = useForm<CourseEditFormValues>({
    resolver: zodResolver(courseEditSchema),
    defaultValues: {
      title: '',
      description: '',
      category: '',
      imageUrl: '',
      learningObjectives: [],
      prerequisites: [],
      targetAudience: '',
      contentType: 'video',
      ebookUrl: '',
    },
  });
  
  const { fields: objectivesFields, append: appendObjective, remove: removeObjective } = useFieldArray({
    control: form.control,
    name: "learningObjectives",
  });
  
  const { fields: prereqFields, append: appendPrereq, remove: removePrereq } = useFieldArray({
    control: form.control,
    name: "prerequisites",
  });

  const contentType = form.watch('contentType');

  useEffect(() => {
    if (course) {
      form.reset({
        title: course.title,
        description: course.description,
        category: course.category,
        imageUrl: course.imageUrl,
        learningObjectives: course.learningObjectives?.map((obj: string) => ({ value: obj })) || [],
        prerequisites: course.prerequisites?.map((pre: string) => ({ value: pre })) || [],
        targetAudience: course.targetAudience,
        contentType: course.contentType || 'video',
        ebookUrl: course.ebookUrl || '',
      });
      if(course.imageUrl) {
          setImagePreview(course.imageUrl);
      }
    }
  }, [course, form]);
  
  const handleImageFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
            setImageToCrop(reader.result as string);
        };
        reader.readAsDataURL(file);
    }
  }

  const handleCropComplete = (croppedFile: File) => {
    setCroppedImageFile(croppedFile);
    setImagePreview(URL.createObjectURL(croppedFile));
    setImageToCrop(null); // Close the cropper modal
  };

  const handleAiAssist = async () => {
    const title = form.getValues('title');
    if (!title) {
      toast({
        variant: 'destructive',
        title: 'Titre manquant',
        description: "Veuillez d'abord saisir un titre pour le cours.",
      });
      return;
    }
    setIsAiLoading(true);
    try {
      const result: AssistCourseCreationOutput = await assistCourseCreation({ courseTitle: title });
      form.setValue('description', result.description, { shouldValidate: true });
      form.setValue('category', result.category, { shouldValidate: true });
      toast({
        title: 'Contenu généré !',
        description: 'La description et la catégorie ont été remplies par l\'IA.',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erreur IA',
        description: 'La génération de contenu a échoué.',
      });
    } finally {
      setIsAiLoading(false);
    }
  };

  const onSubmit = async (data: CourseEditFormValues) => {
    if (!courseId) return;
    setIsSaving(true);
    let finalImageUrl = course?.imageUrl || '';

    try {
      if (croppedImageFile) {
        const filePath = `course_covers/${courseId}/${Date.now()}.webp`;
        const storageRef = ref(storage, filePath);
        const uploadResult = await uploadBytes(storageRef, croppedImageFile);
        finalImageUrl = await getDownloadURL(uploadResult.ref);
      }
      
      const courseDocRef = doc(db, 'courses', courseId as string);
      const updatePayload = {
        ...data,
        imageUrl: finalImageUrl,
        learningObjectives: data.learningObjectives?.map(obj => obj.value),
        prerequisites: data.prerequisites?.map(pre => pre.value),
      };

      await updateDoc(courseDocRef, updatePayload);
      toast({
        title: t('m_update_success'),
        description: t('course_update_success_desc'),
      });

    } catch (error) {
      console.error('Error updating course:', error);
      toast({
        variant: 'destructive',
        title: 'Erreur de sauvegarde',
        description: 'Impossible d\'enregistrer les modifications.',
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  const isLoading = isCourseLoading || isUserLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card className="bg-white dark:bg-[#1e293b] dark:border-slate-700 rounded-2xl shadow-sm">
          <CardHeader>
            <Skeleton className="h-8 w-1/2" />
          </CardHeader>
          <CardContent className="space-y-4 p-6">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!course) {
    return <div className="text-center p-12 text-foreground dark:text-white">Cours non trouvé.</div>;
  }
  
  const canEdit = currentUser && (course.instructorId === currentUser.uid || currentUser.role === 'admin');

  if (!canEdit) {
    return <div className="text-center p-12 text-destructive">Accès non autorisé.</div>
  }

  return (
    <>
      <ImageCropper
        image={imageToCrop}
        onCropComplete={handleCropComplete}
        onClose={() => setImageToCrop(null)}
      />
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            
            <Card className="bg-white/50 dark:bg-slate-800/30 backdrop-blur-sm dark:border-slate-700">
              <CardHeader>
                  <FormLabel className="text-base text-gray-700 dark:text-slate-300 font-medium">Image de couverture</FormLabel>
              </CardHeader>
              <CardContent>
                  <label htmlFor="cover-image-upload" className="cursor-pointer group">
                      <div className="w-full aspect-video rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center text-slate-500 dark:text-slate-400 group-hover:border-primary group-hover:text-primary dark:group-hover:text-primary transition-all relative overflow-hidden">
                          {imagePreview ? (
                              <Image src={imagePreview} alt="Aperçu de la couverture" fill className="object-cover" />
                          ) : (
                              <div className="text-center">
                                  <ImageIcon className="mx-auto h-12 w-12"/>
                                  <p className="mt-2 text-sm font-semibold">Cliquer pour importer</p>
                                  <p className="text-xs">JPG, PNG, WEBP</p>
                              </div>
                          )}
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                              <p className="text-white font-bold">Changer l'image</p>
                          </div>
                      </div>
                  </label>
                  <Input id="cover-image-upload" type="file" className="hidden" accept="image/png, image/jpeg, image/webp" onChange={handleImageFileSelect} />
              </CardContent>
            </Card>
            
            <Card className="bg-white dark:bg-[#1e293b] rounded-2xl shadow-sm border-gray-200/80 dark:border-slate-700 transition-shadow hover:shadow-md">
            <CardHeader>
                <CardTitle className="text-xl dark:text-white">Informations Générales</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 p-6">
                <FormField
                  control={form.control}
                  name="contentType"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>Type de contenu</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex flex-col sm:flex-row gap-4"
                        >
                          <FormItem className="flex-1">
                            <FormControl>
                              <RadioGroupItem value="video" id="video" className="sr-only" />
                            </FormControl>
                            <FormLabel htmlFor="video" className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer">
                              <Video className="mb-3 h-6 w-6" />
                              Cours Vidéo
                            </FormLabel>
                          </FormItem>
                          <FormItem className="flex-1">
                            <FormControl>
                              <RadioGroupItem value="ebook" id="ebook" className="sr-only" />
                            </FormControl>
                             <FormLabel htmlFor="ebook" className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer">
                              <Book className="mb-3 h-6 w-6" />
                              E-book (PDF)
                            </FormLabel>
                          </FormItem>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {contentType === 'ebook' && (
                  <FormField
                    control={form.control}
                    name="ebookUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-700 dark:text-slate-300 font-medium">URL du PDF de l'E-book</FormLabel>
                        <FormControl>
                          <Input placeholder="https://example.com/mon-ebook.pdf" {...field} className="dark:bg-slate-700 dark:border-slate-600" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel className="text-gray-700 dark:text-slate-300 font-medium">Titre du cours</FormLabel>
                    <FormControl>
                        <Input placeholder="Ex: Introduction à Next.js 14" {...field} className="dark:bg-slate-700 dark:border-slate-600" />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel className="flex justify-between items-center text-gray-700 dark:text-slate-300 font-medium">
                        <span>Description</span>
                        <Button type="button" variant="outline" size="sm" onClick={handleAiAssist} disabled={isAiLoading} className="dark:bg-slate-800 dark:border-slate-600 dark:hover:bg-slate-700">
                        {isAiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2 text-yellow-500" />}
                        Assistance IA
                        </Button>
                    </FormLabel>
                    <FormControl>
                        <Textarea placeholder="Décrivez votre cours en détail..." {...field} rows={6} className="dark:bg-slate-700 dark:border-slate-600"/>
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel className="text-gray-700 dark:text-slate-300 font-medium">Catégorie</FormLabel>
                    <FormControl>
                        <Input placeholder="Développement Web" {...field} className="dark:bg-slate-700 dark:border-slate-600"/>
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
            </CardContent>
            </Card>
            
            <Card className="bg-white dark:bg-[#1e293b] rounded-2xl shadow-sm border-gray-200/80 dark:border-slate-700 transition-shadow hover:shadow-md">
            <CardHeader>
                <CardTitle className="text-xl dark:text-white">Objectifs Pédagogiques</CardTitle>
                <CardDescription className="dark:text-slate-400">Que vont apprendre les étudiants dans ce cours ? (Ce que vous apprendrez)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 p-6">
                {objectivesFields.map((field, index) => (
                    <FormField
                    key={field.id}
                    control={form.control}
                    name={`learningObjectives.${index}.value`}
                    render={({ field }) => (
                        <FormItem>
                        <div className="flex items-center gap-2">
                            <FormControl>
                            <Input {...field} placeholder={`Objectif #${index + 1}`} className="dark:bg-slate-700 dark:border-slate-600"/>
                            </FormControl>
                            <Button type="button" variant="ghost" size="icon" onClick={() => removeObjective(index)} className="text-muted-foreground dark:text-slate-400 hover:text-destructive dark:hover:text-red-400 hover:bg-destructive/10">
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Supprimer l'objectif</span>
                            </Button>
                        </div>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                ))}
                <Button
                    type="button"
                    variant="outline"
                    className="w-full border-dashed border-2 hover:bg-accent dark:hover:bg-slate-800 dark:border-slate-600 dark:text-slate-300 hover:border-solid"
                    size="sm"
                    onClick={() => appendObjective({ value: "" })}
                >
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Ajouter un objectif
                </Button>
            </CardContent>
            </Card>
            
            <Card className="bg-white dark:bg-[#1e293b] rounded-2xl shadow-sm border-gray-200/80 dark:border-slate-700 transition-shadow hover:shadow-md">
            <CardHeader>
                <CardTitle className="text-xl dark:text-white">Prérequis</CardTitle>
                <CardDescription className="dark:text-slate-400">Quelles sont les connaissances nécessaires pour suivre ce cours ?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 p-6">
                {prereqFields.map((field, index) => (
                    <FormField
                    key={field.id}
                    control={form.control}
                    name={`prerequisites.${index}.value`}
                    render={({ field }) => (
                        <FormItem>
                        <div className="flex items-center gap-2">
                            <FormControl>
                            <Input {...field} placeholder={`Prérequis #${index + 1}`} className="dark:bg-slate-700 dark:border-slate-600"/>
                            </FormControl>
                            <Button type="button" variant="ghost" size="icon" onClick={() => removePrereq(index)} className="text-muted-foreground dark:text-slate-400 hover:text-destructive dark:hover:text-red-400 hover:bg-destructive/10">
                            <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                ))}
                <Button type="button" variant="outline" className="w-full border-dashed border-2 hover:bg-accent dark:hover:bg-slate-800 dark:border-slate-600 dark:text-slate-300 hover:border-solid" size="sm" onClick={() => appendPrereq({ value: "" })}>
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Ajouter un prérequis
                </Button>
            </CardContent>
            </Card>
            
            <Card className="bg-white dark:bg-[#1e293b] rounded-2xl shadow-sm border-gray-200/80 dark:border-slate-700 transition-shadow hover:shadow-md">
            <CardHeader>
                <CardTitle className="text-xl dark:text-white">Public Cible</CardTitle>
                <CardDescription className="dark:text-slate-400">À qui s'adresse ce cours ?</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
                <FormField
                control={form.control}
                name="targetAudience"
                render={({ field }) => (
                    <FormItem>
                    <FormControl>
                        <Textarea placeholder="Ex: Développeurs débutants, chefs de projet, étudiants en marketing..." {...field} rows={4} className="dark:bg-slate-700 dark:border-slate-600"/>
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
            </CardContent>
            </Card>

            <div className="flex justify-end pt-4">
            <Button type="submit" disabled={isSaving}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Enregistrer les informations
            </Button>
            </div>
        </form>
      </Form>
    </>
  );
}
