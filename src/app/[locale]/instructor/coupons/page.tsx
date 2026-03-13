'use client';

/**
 * @fileOverview Espace Marketing - Coupons & Codes Promo (Design Qwen Vintage).
 */

import { useState, useMemo } from 'react';
import { useRole } from '@/context/RoleContext';
import { useCollection } from '@/firebase';
import { getFirestore, collection, query, where, orderBy } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, Ticket, Loader2, Sparkles, Filter } from 'lucide-react';
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
    <div className="flex flex-col gap-8 pb-40 bg-slate-950 min-h-screen relative overflow-hidden bg-grainy">
      <div className="grain-overlay opacity-[0.03]" />
      
      <CouponFormModal 
        isOpen={isModalOpen} 
        onOpenChange={setIsModalOpen} 
        courses={courses || []} 
      />

      <header className="px-6 pt-8 space-y-6">
        <div className="flex items-center justify-between">
            <div>
                <h1 className="font-black text-2xl text-white uppercase tracking-tight">Coupons Promo</h1>
                <p className="text-primary text-[10px] font-black uppercase tracking-widest mt-1">Outils Marketing 📈</p>
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
                placeholder="Chercher un code (ex: NDARA20)" 
                className="h-14 pl-14 bg-slate-900 border-none rounded-[2rem] text-white placeholder:text-slate-600 focus-visible:ring-primary/20 shadow-inner"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>
      </header>

      <main className="flex-1 px-6 space-y-6 animate-in fade-in duration-700">
        <div className="flex items-center justify-between px-1">
            <h2 className="font-black text-slate-500 text-[10px] uppercase tracking-[0.3em]">Mes Offres Actives</h2>
            <span className="text-primary text-[10px] font-black uppercase">{filteredCoupons.length} coupons</span>
        </div>

        {couponsLoading ? (
            <div className="space-y-4">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-[2rem] bg-slate-900" />)}
            </div>
        ) : (
            <CouponsList coupons={filteredCoupons} />
        )}
      </main>

      {/* --- FLOATING ACTION BUTTON --- */}
      <button 
        onClick={() => setIsModalOpen(true)}
        className="fixed bottom-24 right-6 w-16 h-16 bg-primary rounded-full flex items-center justify-center text-slate-950 shadow-2xl shadow-primary/40 z-40 transition-all active:scale-90 animate-pulse-glow"
      >
        <Ticket size={28} className="fill-current" />
      </button>
    </div>
  );
}
