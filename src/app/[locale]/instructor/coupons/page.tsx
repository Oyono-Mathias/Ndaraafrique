'use client';

import { useState, useMemo } from 'react';
import { useRole } from '@/context/RoleContext';
import { useCollection } from '@/firebase';
import { getFirestore, collection, query, where, orderBy } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, Ticket, Loader2 } from 'lucide-react';
import { CouponFormModal } from '@/components/instructor/coupons/CouponFormModal';
import { CouponsList } from '@/components/instructor/coupons/CouponsList';
import { Skeleton } from '@/components/ui/skeleton';
import type { Course, Coupon } from '@/lib/types';

export default function InstructorCouponsPage() {
  const { currentUser } = useRole();
  const db = getFirestore();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const coursesQuery = useMemo(
    () => currentUser ? query(collection(db, 'courses'), where('instructorId', '==', currentUser.uid)) : null,
    [db, currentUser]
  );
  const { data: courses, isLoading: coursesLoading } = useCollection<Course>(coursesQuery);

  const couponsQuery = useMemo(
    () => currentUser ? query(collection(db, 'course_coupons'), where('instructorId', '==', currentUser.uid), orderBy('createdAt', 'desc')) : null,
    [db, currentUser]
  );
  const { data: coupons, isLoading: couponsLoading } = useCollection<Coupon>(couponsQuery);

  const filteredCoupons = useMemo(() => {
    return coupons?.filter(c => c.code.toLowerCase().includes(searchTerm.toLowerCase())) || [];
  }, [coupons, searchTerm]);

  return (
    <div className="space-y-8 pb-24 animate-in fade-in duration-700">
      <CouponFormModal 
        isOpen={isModalOpen} 
        onOpenChange={setIsModalOpen} 
        courses={courses || []} 
      />

      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <div className="flex items-center gap-2 text-primary mb-1">
            <Ticket className="h-4 w-4" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Marketing & Ventes</span>
          </div>
          <h1 className="text-3xl font-black text-white uppercase tracking-tight">Codes Promos</h1>
          <p className="text-slate-400 text-sm font-medium mt-1">Créez des réductions pour booster vos ventes.</p>
        </div>
        <Button 
            onClick={() => setIsModalOpen(true)} 
            className="h-12 rounded-xl bg-primary hover:bg-primary/90 font-black uppercase text-[10px] tracking-widest shadow-xl shadow-primary/20"
        >
          <Plus className="mr-2 h-4 w-4" /> Créer un coupon
        </Button>
      </header>

      <div className="relative max-w-sm">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
        <Input 
          placeholder="Chercher un code..." 
          className="h-12 pl-12 bg-slate-900 border-slate-800 rounded-xl text-white"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {couponsLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-2xl bg-slate-900" />)}
        </div>
      ) : (
        <CouponsList coupons={filteredCoupons} />
      )}
    </div>
  );
}
