'use client';

/**
 * @fileOverview Espace de Communication - Annonces Instructeur.
 * Permet de diffuser des messages à toute une promotion.
 */

import { AnnouncementsClient } from '@/components/instructor/announcements/AnnouncementsClient';
import { Megaphone } from 'lucide-react';

export default function AnnouncementsPage() {
  return (
    <div className="flex flex-col gap-8 pb-24 bg-slate-950 min-h-screen bg-grainy animate-in fade-in duration-700">
      <header className="px-4 pt-8">
        <div className="flex items-center gap-2 text-primary mb-2">
            <Megaphone className="h-5 w-5" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em]">Communication de masse</span>
        </div>
        <h1 className="text-3xl font-black text-white uppercase tracking-tight">Annonces</h1>
        <p className="text-slate-500 text-sm mt-2 font-medium">Diffusez vos messages importants à tous vos apprenants.</p>
      </header>

      <div className="px-4">
        <AnnouncementsClient />
      </div>
    </div>
  );
}
