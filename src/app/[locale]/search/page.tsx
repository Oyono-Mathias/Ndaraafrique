'use client';

import { Input } from '@/components/ui/input';
import { Search as SearchIcon } from 'lucide-react';

export default function SearchPage() {
  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold text-white">Rechercher une formation</h1>
        <p className="text-muted-foreground">
          Trouvez le cours parfait pour développer vos compétences.
        </p>
      </header>
      <div className="relative">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          placeholder="Que voulez-vous apprendre aujourd'hui ?"
          className="h-12 pl-12 text-base dark:bg-slate-800"
        />
      </div>
      <div className="text-center py-20 border-2 border-dashed border-slate-700 rounded-xl mt-8">
        <h3 className="text-lg font-semibold text-slate-300">
          Les résultats de votre recherche apparaîtront ici.
        </h3>
      </div>
    </div>
  );
}
