'use client';

import { useState, useMemo, useEffect } from 'react';
import { useCollection, useMemoFirebase } from '@/firebase';
import { getFirestore, collection, query, where, orderBy, getDocs, doc } from 'firebase/firestore';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { Course, NdaraUser } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Eye, Frown, ShieldAlert } from 'lucide-react';
import { ModerationDetailsModal } from './ModerationDetailsModal';

export function ModerationQueue() {
  const db = getFirestore();
  const [selectedCourse, setSelectedCourse] = useState<(Course & { instructor?: Partial<NdaraUser> }) | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [instructorsMap, setInstructorsMap] = useState<Map<string, Partial<NdaraUser>>>(new Map());

  const coursesQuery = useMemoFirebase(
    () => query(collection(db, 'courses'), where('status', '==', 'Pending Review'), orderBy('createdAt', 'desc')),
    [db]
  );
  const { data: courses, isLoading: coursesLoading } = useCollection<Course>(coursesQuery);

  useEffect(() => {
    if (!courses || courses.length === 0) return;

    const fetchInstructors = async () => {
      const instructorIds = [...new Set(courses.map(c => c.instructorId).filter(Boolean))];
      const newInstructors = new Map(instructorsMap);
      const idsToFetch = instructorIds.filter(id => !newInstructors.has(id));

      if (idsToFetch.length > 0) {
        for (let i = 0; i < idsToFetch.length; i += 30) {
            const chunk = idsToFetch.slice(i, i + 30);
            if (chunk.length === 0) continue;
            const usersQuery = query(collection(db, 'users'), where('uid', 'in', chunk));
            const usersSnapshot = await getDocs(usersQuery);
            usersSnapshot.forEach(doc => {
                const data = doc.data();
                newInstructors.set(data.uid, { fullName: data.fullName, profilePictureURL: data.profilePictureURL });
            });
        }
        setInstructorsMap(newInstructors);
      }
    };
    fetchInstructors();
  }, [courses, db, instructorsMap]);

  const handleViewDetails = (course: Course) => {
    setSelectedCourse({ ...course, instructor: instructorsMap.get(course.instructorId) });
    setIsModalOpen(true);
  };
  
  const handleActionComplete = () => {
    // Real-time listener will update the list
  }

  return (
    <>
      <ModerationDetailsModal 
        isOpen={isModalOpen}
        onOpenChange={setIsModalOpen}
        course={selectedCourse}
        onActionComplete={handleActionComplete}
      />
      <div className="border rounded-lg dark:border-slate-700">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cours</TableHead>
              <TableHead>Instructeur</TableHead>
              <TableHead>Date de soumission</TableHead>
              <TableHead>Catégorie</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {coursesLoading ? (
              [...Array(3)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={5}><Skeleton className="h-10 w-full bg-slate-800"/></TableCell>
                </TableRow>
              ))
            ) : courses && courses.length > 0 ? (
              courses.map(course => (
                <TableRow key={course.id}>
                  <TableCell className="font-medium text-white">{course.title}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={instructorsMap.get(course.instructorId)?.profilePictureURL} />
                        <AvatarFallback>{instructorsMap.get(course.instructorId)?.fullName?.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="font-medium">{instructorsMap.get(course.instructorId)?.fullName || 'Chargement...'}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {course.createdAt
                      ? formatDistanceToNow(course.createdAt.toDate(), { locale: fr, addSuffix: true })
                      : 'Date inconnue'}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{course.category || 'Non classé'}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" onClick={() => handleViewDetails(course)}>
                      <Eye className="mr-2 h-4 w-4" />
                      Examiner
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <ShieldAlert className="h-8 w-8" />
                    <p>Aucun cours en attente de modération.</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
