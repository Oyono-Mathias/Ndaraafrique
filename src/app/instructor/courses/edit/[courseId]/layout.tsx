
'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';
import { useDoc, useMemoFirebase } from '@/firebase';
import { getFirestore, doc, updateDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ArrowLeft, BookText, Eye, Info, ListVideo, Loader2, Sparkles, Tag, CheckCircle, Send } from 'lucide-react';
import type { Course } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useRole } from '@/context/RoleContext';


const StudioSidebarLink = ({ href, icon: Icon, label, isActive }: { href: string; icon: React.ElementType; label: string; isActive: boolean; }) => (
    <Link href={href}>
        <div className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2 text-slate-700 transition-all hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800",
            isActive && "bg-slate-200 text-slate-900 font-bold dark:bg-slate-800 dark:text-white"
        )}>
            <Icon className="h-4 w-4" />
            {label}
        </div>
    </Link>
);


export default function CourseEditLayout({
  children,
}: {
  children: React.ReactNode;
}) {
    const { courseId } = useParams();
    const pathname = usePathname();
    const db = getFirestore();
    const { toast } = useToast();
    const { formaAfriqueUser } = useRole();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const courseRef = useMemoFirebase(() => doc(db, 'courses', courseId as string), [db, courseId]);
    const { data: course, isLoading: isCourseLoading } = useDoc<Course>(courseRef);

    const navItems = [
        { href: `/instructor/courses/edit/${courseId}`, icon: Info, label: "Informations" },
        { href: `/instructor/courses/edit/${courseId}/content`, icon: ListVideo, label: "Programme" },
        { href: `/instructor/courses/edit/${courseId}/resources`, icon: BookText, label: "Ressources" },
        { href: `/instructor/courses/edit/${courseId}/pricing`, icon: Tag, label: "Prix & Promo" },
    ];
    
    const getStatusBadgeVariant = (status: Course['status'] = 'Draft') => {
        switch (status) {
            case 'Published': return 'default';
            case 'Pending Review': return 'secondary';
            case 'Draft': return 'outline';
            default: return 'outline';
        }
    };
    
    const getStatusBadgeText = (status: Course['status']) => {
        switch (status) {
            case 'Published': return 'Publié';
            case 'Pending Review': return 'En révision';
            case 'Draft': return 'Brouillon';
            default: return status;
        }
    }
    
    const handleAction = async () => {
        if (!course || !formaAfriqueUser) return;
        
        setIsSubmitting(true);
        let newStatus: Course['status'];
        let successTitle = '';
        let successDescription = '';

        if (formaAfriqueUser.role === 'admin') {
            newStatus = 'Published';
            successTitle = 'Cours approuvé et publié !';
            successDescription = 'Le cours est maintenant visible par tous les étudiants.';
        } else {
            newStatus = 'Pending Review';
            successTitle = 'Soumis pour validation !';
            successDescription = 'Votre cours a été envoyé à l\'équipe de modération pour examen.';
        }
        
        const courseDocRef = doc(db, 'courses', courseId as string);

        try {
            await updateDoc(courseDocRef, { status: newStatus });
            toast({
                title: successTitle,
                description: successDescription,
            });
        } catch(error) {
            toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de changer le statut du cours.' });
            console.error("Error updating course status:", error);
        } finally {
            setIsSubmitting(false);
        }
    }
    
    const renderActionButton = () => {
        if (!course || !formaAfriqueUser) return null;

        if (formaAfriqueUser.role === 'admin') {
            if (course.status === 'Published') return null; // Admin doesn't need to re-approve
            return (
                <Button size="sm" onClick={handleAction} disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin"/> : <CheckCircle className="mr-2 h-4 w-4"/>}
                    Approuver & Publier
                </Button>
            );
        }
        
        if (formaAfriqueUser.role === 'instructor') {
             if (course.status === 'Published' || course.status === 'Pending Review') return null;
            return (
                 <Button size="sm" onClick={handleAction} disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin"/> : <Send className="mr-2 h-4 w-4"/>}
                    Soumettre pour validation
                </Button>
            );
        }

        return null;
    }


    return (
        <div className="grid min-h-screen w-full lg:grid-cols-[280px_1fr]">
            <aside className="hidden border-r bg-slate-50/40 lg:block dark:bg-[#1e293b] dark:border-slate-700">
                <div className="flex h-full max-h-screen flex-col gap-2">
                    <div className="flex h-[60px] items-center border-b px-6 dark:border-slate-700">
                        <Link href="/instructor/courses" className="flex items-center gap-2 font-semibold text-foreground dark:text-white">
                            <ArrowLeft className="h-4 w-4" />
                            <span>Retour aux cours</span>
                        </Link>
                    </div>
                    <div className="flex-1 overflow-auto py-2">
                         <nav className="grid items-start px-4 text-sm font-medium">
                            {isCourseLoading ? (
                                <div className="space-y-2">
                                    <Skeleton className="h-9 w-full dark:bg-slate-700" />
                                    <Skeleton className="h-9 w-full dark:bg-slate-700" />
                                    <Skeleton className="h-9 w-full dark:bg-slate-700" />
                                </div>
                            ) : (
                                navItems.map(item => (
                                    <StudioSidebarLink 
                                        key={item.href}
                                        href={item.href}
                                        icon={item.icon}
                                        label={item.label}
                                        isActive={pathname === item.href}
                                    />
                                ))
                            )}
                        </nav>
                    </div>
                </div>
            </aside>
            <div className="flex flex-col">
                <header className="flex h-14 lg:h-[60px] items-center gap-4 border-b bg-white px-6 sticky top-0 z-30 dark:bg-[#1e293b] dark:border-slate-700">
                    <div className="flex-1">
                        {isCourseLoading ? <Skeleton className="h-6 w-1/2 dark:bg-slate-700" /> : (
                            <h1 className="font-semibold text-lg truncate text-foreground dark:text-white">{course?.title || 'Chargement...'}</h1>
                        )}
                    </div>
                    {isCourseLoading ? <Skeleton className="h-7 w-20 rounded-md dark:bg-slate-700" /> : (
                         <Badge variant={getStatusBadgeVariant(course?.status)} className="capitalize dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600">
                            {getStatusBadgeText(course?.status)}
                        </Badge>
                    )}
                    <Button variant="outline" size="sm" asChild className="dark:bg-slate-800 dark:border-slate-600 dark:hover:bg-slate-700 dark:text-white">
                        <Link href={`/course/${courseId}`} target="_blank">
                            <Eye className="mr-2 h-4 w-4"/> Aperçu
                        </Link>
                    </Button>
                     {renderActionButton()}
                </header>
                <main className="flex flex-1 flex-col gap-4 p-4 md:p-6 lg:p-8 xl:p-10 bg-slate-50/50 dark:bg-[#0f172a]">
                    {children}
                </main>
            </div>
        </div>
    );
}
