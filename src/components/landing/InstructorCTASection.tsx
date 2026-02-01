
'use client';

import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

export function InstructorCTASection({ onTrackClick }: { onTrackClick: () => void }) {
  return (
    <section className="py-16 sm:py-24 bg-slate-900 rounded-2xl border border-slate-800">
      <div className="container mx-auto px-4 text-center">
        <h2 className="text-3xl md:text-4xl font-extrabold text-white">
          Partagez votre savoir. Devenez formateur.
        </h2>
        <p className="mt-4 text-base md:text-lg text-slate-400 max-w-2xl mx-auto">
          Rejoignez notre communauté d'experts et monétisez vos compétences en touchant des milliers d'apprenants à travers l'Afrique.
        </p>
        <div className="mt-8">
          <Button
            size="lg"
            variant="outline"
            asChild
            className="h-14 text-base md:text-lg border-slate-700 hover:bg-slate-800 hover:text-white"
            onClick={onTrackClick}
          >
            <Link href="/devenir-instructeur">
              Devenir Formateur
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
