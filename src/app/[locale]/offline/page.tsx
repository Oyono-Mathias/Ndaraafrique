'use client';

/**
 * @fileOverview Page de secours hors-ligne (Offline) harmonisée.
 * Reprend le design de la landing page pour une transition invisible.
 */

import { Button } from '@/components/ui/button';
import { WifiOff, RefreshCw, ArrowLeft, ZapOff } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import Link from 'next/link';

export default function OfflinePage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col font-sans selection:bg-primary/30">
      
      {/* --- NAVBAR SIMULÉE --- */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-950/90 backdrop-blur-md border-b border-slate-800">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Image src="/logo.png" alt="Ndara Logo" width={32} height={32} className="rounded-lg opacity-50 grayscale" />
            <span className="text-base font-black tracking-tighter text-slate-500">Ndara Afrique</span>
          </div>
          <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
        </div>
      </nav>

      {/* --- CONTENT --- */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 text-center pt-24">
        
        <div className="relative mb-8">
          <div className="p-6 bg-slate-900 rounded-[2rem] border border-slate-800 shadow-2xl">
            <ZapOff className="h-16 w-16 text-slate-700" />
          </div>
          <div className="absolute -bottom-2 -right-2 bg-red-500 rounded-full p-2 border-4 border-slate-950">
            <WifiOff className="h-4 w-4 text-white" />
          </div>
        </div>

        <h1 className="text-3xl font-extrabold text-white leading-[1.2] tracking-tight mb-4">
          Connexion <br/>
          <span className="text-slate-500">interrompue</span>
        </h1>
        
        <p className="text-slate-400 text-base max-w-xs mx-auto mb-10 leading-relaxed">
          Le savoir ne s'arrête jamais. Vos cours déjà consultés restent accessibles dans votre <span className="text-white font-bold">Espace</span>.
        </p>

        <div className="w-full max-w-xs space-y-3">
          <Button 
            onClick={() => window.location.reload()} 
            className="w-full h-14 rounded-xl text-base font-bold bg-primary shadow-lg shadow-primary/20 transition-all active:scale-95"
          >
            <RefreshCw className="mr-2 h-5 w-5" />
            Réessayer maintenant
          </Button>
          
          <Button 
            variant="ghost" 
            asChild
            className="w-full h-12 text-slate-500 hover:text-white"
          >
            <Link href="/student/dashboard">
              Aller à mes cours (Mode local)
            </Link>
          </Button>
        </div>

        {/* --- FOOTER DISCRET --- */}
        <div className="mt-16 pt-8 border-t border-slate-900 w-full max-w-xs">
          <p className="text-[9px] font-black text-slate-700 uppercase tracking-[0.3em]">
            Mode Résilience — Ndara Afrique
          </p>
        </div>
      </main>
    </div>
  );
}
