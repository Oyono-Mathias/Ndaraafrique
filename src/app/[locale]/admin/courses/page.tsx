'use client';

/**
 * @fileOverview Page principale de gestion des cours pour les administrateurs.
 */

import { CoursesTable } from '@/components/admin/courses/courses-table';
import { Button } from '@/components/ui/button';
import { PlusCircle, BookOpen } from 'lucide-react';
import Link from 'next/link';

export default function AdminCoursesPage() {
  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <div className="flex items-center gap-2 text-primary mb-1">
            <BookOpen className="h-4 w-4" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em]">Gestion Pédagogique</span>
          </div>
          <h1 className="text-3xl font-black text-white uppercase tracking-tight">Catalogue de Formations</h1>
          <p className="text-slate-400 text-sm font-medium mt-1">Supervisez, modérez et organisez l'offre de savoir Ndara Afrique.</p>
        </div>
        <Button asChild className="h-12 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-black uppercase text-[10px] tracking-widest shadow-xl shadow-primary/20 transition-all active:scale-95">
          <Link href="/instructor/courses/create">
            <PlusCircle className="mr-2 h-4 w-4" /> Nouvelle Formation
          </Link>
        </Button>
      </header>

      <CoursesTable />
    </div>
  );
}
