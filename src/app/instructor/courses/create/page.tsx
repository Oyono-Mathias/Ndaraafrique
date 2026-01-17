

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { getFirestore, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { useRole } from '@/context/RoleContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { useTranslations } from 'next-intl';

const courseCreateSchema = (t: (key: string) => string) => z.object({
  title: z.string().min(5, t('course_title_min_char')),
});

type CourseCreateFormValues = z.infer<ReturnType<typeof courseCreateSchema>>;

export default function CreateCoursePage() {
  const router = useRouter();
  const { toast } = useToast();
  const t = useTranslations();
  const { currentUser, isUserLoading } = useRole();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<CourseCreateFormValues>({
    resolver: zodResolver(courseCreateSchema(t as any)),
    defaultValues: {
      title: '',
    },
  });

  const onSubmit = async (data: CourseCreateFormValues) => {
    if (!currentUser || !currentUser.isInstructorApproved) {
      toast({
        variant: 'destructive',
        title: t('access_denied_title'),
        description: t('instructor_approval_required'),
      });
      return;
    }

    setIsSubmitting(true);
    const db = getFirestore();
    const coursesCollection = collection(db, 'courses');

    const newCoursePayload = {
      title: data.title,
      description: '',
      price: 0,
      category: '',
      status: 'Draft',
      instructorId: currentUser.uid,
      createdAt: serverTimestamp(),
      publishedAt: null,
      imageUrl: `https://picsum.photos/seed/${new Date().getTime()}/600/400`,
      learningObjectives: [],
      prerequisites: [],
      targetAudience: '',
      contentType: 'video',
      isPopular: false,
      ebookUrl: '',
      participants: [],
      isPublished: false
    };

    try {
      const docRef = await addDoc(coursesCollection, newCoursePayload);
      
      toast({
        title: t('course_create_success_title'),
        description: t('course_create_success_desc'),
      });

      router.push(`/instructor/courses/edit/${docRef.id}`);

    } catch (error) {
       console.error('Error creating course:', error);
       errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: coursesCollection.path,
            operation: 'create',
            requestResourceData: newCoursePayload
        }));
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-4xl mx-auto">
      <header>
        <h1 className="text-3xl font-bold dark:text-white">{t('create_new_course')}</h1>
        <p className="text-slate-500 mt-1">{t('create_course_start_with_title')}</p>
      </header>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Card className="bg-white dark:bg-card">
            <CardHeader>
              <CardTitle className="dark:text-white">{t('course_title')}</CardTitle>
              <CardDescription>
                {t('create_course_title_desc')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="sr-only">{t('course_title')}</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder={t('course_title_placeholder')}
                        {...field} 
                        className="text-lg py-6"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter className="flex justify-end gap-4">
                <Button type="button" variant="ghost" onClick={() => router.back()}>
                  {t('cancelButton')}
                </Button>
                <Button type="submit" disabled={isSubmitting || isUserLoading} className="bg-blue-600 hover:bg-blue-700">
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {t('continue')}
                </Button>
            </CardFooter>
          </Card>
        </form>
      </Form>
    </div>
  );
}
