'use client';

/**
 * @fileOverview Le Mur de la Sagesse - Témoignages Ndara Afrique.
 * ✅ DESIGN : Cartes glassmorphism, badges 'Vérifié'.
 */

import { Star, Quote, ShieldCheck } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

const TESTIMONIALS = [
    {
        name: "Jean Dupont",
        avatar: "https://i.pravatar.cc/100?img=32",
        text: "Ndara a changé ma vie. J'ai pu me former au trading sans quitter mon village. Les paiements Mobile Money sont un game changer.",
        verified: true
    },
    {
        name: "Fatou Diop",
        avatar: "https://i.pravatar.cc/100?img=45",
        text: "La qualité des cours en Agritech est incroyable. Des experts qui connaissent vraiment nos réalités locales.",
        verified: true
    }
];

export function TestimonialsSection() {
  return (
    <section className="px-6 mb-20 max-w-4xl mx-auto space-y-10">
        <h2 className="font-black text-2xl text-white uppercase tracking-tight text-center">Le Mur de la Sagesse</h2>
        
        <div className="space-y-6">
            {TESTIMONIALS.map((t, i) => (
                <div key={i} className="bg-white/5 backdrop-blur-xl p-6 rounded-[2.5rem] border border-white/5 relative active:scale-[0.98] transition-all shadow-2xl group overflow-hidden">
                    <Quote className="h-20 w-20 text-white/5 absolute top-2 left-2 rotate-12" />
                    
                    <div className="flex items-center gap-4 mb-5 relative z-10">
                        <div className="p-0.5 rounded-full bg-gradient-to-tr from-primary to-teal-400">
                            <Avatar className="h-12 w-12 border-2 border-slate-900">
                                <AvatarImage src={t.avatar} className="object-cover" />
                                <AvatarFallback className="bg-slate-800 text-slate-500 font-bold">{t.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                        </div>
                        <div className="flex-1">
                            <h4 className="font-black text-white text-sm uppercase tracking-tight">{t.name}</h4>
                            <div className="flex text-yellow-500 mt-0.5">
                                {[...Array(5)].map((_, i) => <Star key={i} size={10} className="fill-current" />)}
                            </div>
                        </div>
                        {t.verified && (
                            <div className="bg-primary/10 text-primary border border-primary/20 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest shadow-lg">
                                VÉRIFIÉ
                            </div>
                        )}
                    </div>
                    <p className="text-slate-300 text-sm italic leading-relaxed relative z-10 font-medium border-l-2 border-primary/20 pl-4 py-1">
                        "{t.text}"
                    </p>
                </div>
            ))}
        </div>
    </section>
  );
}
