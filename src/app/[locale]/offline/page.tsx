
'use client';

import { Button } from '@/components/ui/button';
import { Radio, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function OfflinePage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
      {/* Icône Vintage : Vieille Radio */}
      <div className="relative mb-8">
        <div className="p-8 bg-slate-900 rounded-3xl border-4 border-slate-800 shadow-2xl">
          <svg 
            viewBox="0 0 24 24" 
            className="h-24 w-24 text-primary opacity-80" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="1.5" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          >
            <rect x="2" y="8" width="20" height="14" rx="2" />
            <path d="M5 20h14" />
            <path d="M14 12h4" />
            <path d="M14 16h4" />
            <circle cx="7" cy="14" r="2" />
            <path d="M7 8v-3a2 2 0 0 1 2-2h0" />
            <line x1="12" y1="12" x2="12" y2="18" />
          </svg>
        </div>
        <div className="absolute -bottom-2 -right-2 bg-amber-500 rounded-full p-2 border-4 border-slate-950">
          <Radio className="h-5 w-5 text-slate-950" />
        </div>
      </div>

      <h1 className="text-3xl font-black text-white leading-tight mb-4">
        Oups, le signal est coupé !
      </h1>
      
      <p className="text-slate-400 text-lg max-w-xs mx-auto mb-8 leading-relaxed">
        Pas de panique ! Vous pouvez toujours consulter vos leçons <span className="text-white font-bold">déjà chargées</span> dans votre navigateur.
      </p>

      <div className="w-full max-w-xs space-y-4">
        <Button 
          onClick={() => window.location.reload()} 
          className="w-full h-14 rounded-2xl text-base font-bold bg-primary shadow-lg shadow-primary/20"
        >
          <RefreshCw className="mr-2 h-5 w-5" />
          Réessayer la connexion
        </Button>
        
        <Button 
          variant="ghost" 
          onClick={() => router.push('/student/dashboard')}
          className="w-full h-12 text-slate-500 hover:text-white"
        >
          Retourner au tableau de bord
        </Button>
      </div>

      <div className="mt-12 pt-8 border-t border-slate-900 w-full max-w-xs">
        <p className="text-[10px] uppercase font-black text-slate-600 tracking-[0.2em]">
          Ndara Afrique — Mode Résilient
        </p>
      </div>
    </div>
  );
}
