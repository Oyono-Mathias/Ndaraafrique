'use client';

/**
 * @fileOverview Section Catégories - Chips de Navigation Tactiles.
 * ✅ INTERFACE : Scroll horizontal fluide optimisé pour le pouce (Android).
 */

import { Leaf, ChartLine, Coins, Cpu, LayoutGrid } from 'lucide-react';
import { cn } from "@/lib/utils";
import { useState } from 'react';

const CATEGORIES = [
    { id: 'all', name: "Tous", icon: LayoutGrid },
    { id: 'agritech', name: "AgriTech", icon: Leaf },
    { id: 'fintech', name: "FinTech", icon: ChartLine },
    { id: 'trading', name: "Trading", icon: Coins },
    { id: 'mecatech', name: "MécaTech", icon: Cpu },
];

export function Categories() {
  const [active, setActive] = useState('all');

  return (
    <section className="mb-16 overflow-hidden">
        <div className="flex overflow-x-auto hide-scrollbar gap-3 px-6 pb-4">
            {CATEGORIES.map((cat) => (
                <button 
                    key={cat.id}
                    onClick={() => setActive(cat.id)}
                    className={cn(
                        "flex-shrink-0 px-6 py-3.5 rounded-full text-[11px] font-black uppercase tracking-widest flex items-center gap-2.5 transition-all duration-300 active:scale-95 shadow-xl",
                        active === cat.id 
                            ? "bg-primary text-slate-950 shadow-primary/20 border-primary" 
                            : "bg-white/5 border border-white/5 text-slate-500 hover:text-white hover:border-white/10"
                    )}
                >
                    <cat.icon className="h-4 w-4" />
                    {cat.name}
                </button>
            ))}
        </div>
    </section>
  );
}
