'use client';

import { useState, useMemo, useEffect } from 'react';
import { useCollection } from '@/firebase';
import { getFirestore, collection, query, where, getDocs, documentId } from 'firebase/firestore';
import { useRole } from '@/context/RoleContext';
import { useToast } from '@/hooks/use-toast';
import { startChat } from '@/lib/chat';
import { useRouter } from 'next/navigation';
import type { Enrollment, NdaraUser, Course } from '@/lib/types';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, MessageSquare, Loader2, BookOpen, Clock, Users, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EnrichedEnrollment extends Enrollment {
  student?: Partial<NdaraUser>;
  course?: Partial<Course>;
}

export function StudentsClient() {
  const db = getFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const { currentUser, isUserLoading } = useRole();
  
  const [courseFilter, setCourseFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isContacting, setIsContacting] = useState<string | null>(null);

  const coursesQuery = useMemo(
    () => currentUser ? query(collection(db, 'courses'), where('instructorId', '==', currentUser.uid)) : null,
    [db, currentUser]
  );
  const { data: courses, isLoading: coursesLoading } = useCollection<Course>(coursesQuery);

  const enrollmentsQuery = useMemo(
    () => currentUser ? query(collection(db, 'enrollments'), where('instructorId', '==', currentUser.uid)) : null,
    [db, currentUser]
  );
  const { data: rawEnrollments, isLoading: enrollmentsLoading } = useCollection<Enrollment>(enrollmentsQuery);

  const [enrichedEnrollments, setEnrichedEnrollments] = useState<EnrichedEnrollment[]>([]);
  const [relatedDataLoading, setRelatedDataLoading] = useState(true);

  useEffect(() => {
    if (!rawEnrollments || rawEnrollments.length === 0) {
        setEnrichedEnrollments([]);
        setRelatedDataLoading(false);
        return;
    };

    const enrichData = async () => {
        setRelatedDataLoading(true);
        const studentIds = [...new Set(rawEnrollments.map(e => e.studentId))];
        const courseIds = [...new Set(rawEnrollments.map(e => e.courseId))];

        const studentsMap = new Map<string, Partial<NdaraUser>>();
        const coursesMap = new Map<string, Partial<Course>>();

        if (studentIds.length > 0) {
            for (let i = 0; i < studentIds.length; i += 30) {
                const chunk = studentIds.slice(i, i + 30);
                const studentsSnap = await getDocs(query(collection(db, 'users'), where('uid', 'in', chunk)));
                studentsSnap.forEach(doc => studentsMap.set(doc.id, doc.data() as NdaraUser));
            }
        }
        
        if (courseIds.length > 0) {
            for (let i = 0; i < courseIds.length; i += 30) {
                const chunk = courseIds.slice(i, i + 30);
                const coursesSnap = await getDocs(query(collection(db, 'courses'), where(documentId(), 'in', chunk)));
                coursesSnap.forEach(doc => coursesMap.set(doc.id, { id: doc.id, ...doc.data() } as Course));
            }
        }
        
        const newEnrichedData = rawEnrollments.map(e => ({
            ...e,
            student: studentsMap.get(e.studentId),
            course: coursesMap.get(e.courseId)
        })).sort((a, b) => {
            const dateA = (a.enrollmentDate as any)?.toDate?.() || new Date(0);
            const dateB = (b.enrollmentDate as any)?.toDate?.() || new Date(0);
            return dateB.getTime() - dateA.getTime();
        });
        
        setEnrichedEnrollments(newEnrichedData);
        setRelatedDataLoading(false);
    };

    enrichData();
  }, [rawEnrollments, db]);

  const filteredData = useMemo(() => {
    return enrichedEnrollments.filter(item => {
        const courseMatch = courseFilter === 'all' || item.courseId === courseFilter;
        const searchMatch = !searchTerm || item.student?.fullName?.toLowerCase().includes(searchTerm.toLowerCase());
        return courseMatch && searchMatch;
    });
  }, [enrichedEnrollments, courseFilter, searchTerm]);

  const handleContact = async (studentId: string) => {
    if (!currentUser) return;
    setIsContacting(studentId);
    try {
        const chatId = await startChat(currentUser.uid, studentId);
        router.push(`/student/messages?chatId=${chatId}`);
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Erreur', description: "Impossible de démarrer la discussion." });
    } finally {
        setIsContacting(null);
    }
  };

  const isLoading = isUserLoading || coursesLoading || enrollmentsLoading || relatedDataLoading;

  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-700">
        <header className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="font-black text-2xl text-white uppercase tracking-tight">Mes Étudiants</h1>
                    <p className="text-primary text-[10px] font-black uppercase tracking-widest mt-1">Communauté Active ({filteredData.length})</p>
                </div>
                <Button variant="ghost" size="icon" className="w-10 h-10 rounded-full bg-slate-900 border border-white/5 text-slate-500">
                    <Filter size={18} />
                </Button>
            </div>

            <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center">
                    <Search className="h-3.5 w-3.5 text-slate-500 group-focus-within:text-primary transition-colors" />
                </div>
                <Input 
                    placeholder="Chercher un apprenant..." 
                    className="h-14 pl-14 bg-slate-900 border-none rounded-[2rem] text-white placeholder:text-slate-600 focus-visible:ring-primary/20 shadow-inner"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="overflow-x-auto hide-scrollbar">
                <div className="flex gap-2">
                    <button 
                        onClick={() => setCourseFilter('all')}
                        className={cn(
                            "flex-shrink-0 px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all",
                            courseFilter === 'all' ? "bg-primary text-slate-950 shadow-lg" : "bg-slate-900 border border-white/5 text-slate-500"
                        )}
                    >
                        Tout le monde
                    </button>
                    {courses?.map(c => (
                        <button 
                            key={c.id}
                            onClick={() => setCourseFilter(c.id)}
                            className={cn(
                                "flex-shrink-0 px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all",
                                courseFilter === c.id ? "bg-primary text-slate-950 shadow-lg" : "bg-slate-900 border border-white/5 text-slate-500"
                            )}
                        >
                            {c.title}
                        </button>
                    ))}
                </div>
            </div>
        </header>

        <main className="space-y-4">
            {isLoading ? (
                <div className="space-y-4">
                    {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-[2rem] bg-slate-900" />)}
                </div>
            ) : filteredData.length > 0 ? (
                <div className="grid gap-4">
                    {filteredData.map(item => (
                        <div key={item.id} className="bg-slate-900 border border-white/5 rounded-[2rem] p-4 flex items-center gap-4 shadow-xl active:scale-[0.98] transition-all group">
                            <div className="relative">
                                <Avatar className="h-14 w-14 border-2 border-primary/20 shadow-2xl">
                                    <AvatarImage src={item.student?.profilePictureURL} />
                                    <AvatarFallback className="bg-slate-800 text-slate-500 font-black uppercase">
                                        {item.student?.fullName?.charAt(0)}
                                    </AvatarFallback>
                                </Avatar>
                                {item.student?.isOnline && (
                                    <div className="absolute bottom-0 right-0 w-4 h-4 bg-primary rounded-full border-2 border-slate-950 shadow-lg animate-pulse" />
                                )}
                            </div>
                            
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-1">
                                    <h3 className="font-black text-white text-[15px] truncate uppercase tracking-tight">{item.student?.fullName}</h3>
                                    <span className="text-primary text-[10px] font-black">{item.progress}%</span>
                                </div>
                                <div className="w-full h-1 bg-slate-950 rounded-full overflow-hidden mb-2">
                                    <div className="h-full bg-primary transition-all duration-1000" style={{ width: `${item.progress}%` }} />
                                </div>
                                <p className="text-slate-500 text-[9px] font-bold uppercase tracking-widest truncate">
                                    Formation : {item.course?.title}
                                </p>
                            </div>

                            <Button 
                                size="icon" 
                                onClick={() => handleContact(item.studentId)}
                                disabled={isContacting === item.studentId}
                                className="h-12 w-12 rounded-2xl bg-primary/10 hover:bg-primary text-primary hover:text-slate-950 border border-primary/20 shrink-0"
                            >
                                {isContacting === item.studentId ? <Loader2 className="h-5 w-5 animate-spin" /> : <MessageSquare size={20} />}
                            </Button>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="py-24 text-center bg-slate-900/20 border-2 border-dashed border-slate-800 rounded-[3rem] opacity-20">
                    <Users className="h-16 w-16 mx-auto mb-4 text-slate-700" />
                    <p className="font-black uppercase tracking-widest text-xs">Aucun apprenant trouvé</p>
                </div>
            )}
        </main>
    </div>
  );
}
