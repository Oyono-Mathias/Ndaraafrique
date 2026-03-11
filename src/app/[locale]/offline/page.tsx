'use client';

/**
 * @fileOverview Page de secours hors-ligne (Offline) vintage.
 * S'affiche automatiquement via next-pwa quand le réseau est coupé.
 */

import { Button } from '@/components/ui/button';
import { WifiOff, RefreshCw, ArrowLeft, Radio } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import Link from 'next/link';

export default function OfflinePage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-center">
      <div className="mb-8 p-6 bg-slate-800 rounded-full border-4 border-slate-700 shadow-2xl animate-pulse">
        <Radio className="h-16 w-16 text-primary" />
      </div>
      
      <h1 className="text-4xl font-bold text-white mb-4">Signal perdu...</h1>
      <p className="text-slate-400 text-lg max-w-md mb-8">
        On dirait que la connexion a été coupée. Mais ne vous inquiétez pas, le savoir est toujours là !
      </p>

      <div className="flex flex-col sm:flex-row gap-4 w-full max-w-sm">
        <Button 
          onClick={() => window.location.reload()} 
          className="flex-1 h-12 text-lg font-semibold"
        >
          <RefreshCw className="mr-2 h-5 w-5" />
          Réessayer
        </Button>
        <Button 
          variant="outline" 
          asChild
          className="flex-1 h-12 text-lg"
        >
          <Link href="/student/dashboard">
            <ArrowLeft className="mr-2 h-5 w-5" />
            Espace Local
          </Link>
        </Button>
      </div>

      <div className="mt-12 text-slate-500 text-sm italic">
        "Bara ala, Tonga na ndara"
      </div>
    </div>
  );
}
