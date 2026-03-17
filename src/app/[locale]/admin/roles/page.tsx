'use client';

import { RolesManager } from '@/components/admin/roles/roles-manager';
import { ShieldCheck } from 'lucide-react';

export default function AdminRolesPage() {
  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
       <header>
        <div className="flex items-center gap-2 text-primary mb-1">
            <ShieldCheck className="h-4 w-4" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em]">Coffre-fort & Accès</span>
        </div>
        <h1 className="text-3xl font-black text-white uppercase tracking-tight">Rôles & Permissions</h1>
        <p className="text-slate-400 text-sm font-medium mt-1">Configurez les privilèges et sécurisez l'infrastructure Ndara.</p>
      </header>
      
      <RolesManager />
    </div>
  );
}
