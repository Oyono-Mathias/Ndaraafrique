'use client';

import React from 'react';
import { Award, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CertificatePremiumProps {
  studentName: string;
  courseName: string;
  completionDate: string;
  certificateId: string;
  instructorName?: string;
  className?: string;
}

export const CertificatePremium = React.forwardRef<HTMLDivElement, CertificatePremiumProps>(({
  studentName,
  courseName,
  completionDate,
  certificateId,
  instructorName = "Directeur Pédagogique",
  className
}, ref) => {
  return (
    <div 
      ref={ref}
      className={cn(
        "relative w-full aspect-[1.414/1] bg-[#fdfcf7] shadow-2xl overflow-hidden text-gray-900 font-sans border-[12px] border-double border-[#e5c185] ring-1 ring-gray-200",
        className
      )}
    >
      {/* --- Arrière-plan décoratif (Motif Guillochis) --- */}
      <div className="absolute inset-0 opacity-[0.04] pointer-events-none">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <pattern id="pattern-cert-premium" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
            <path d="M30 0c15 15 45 15 60 0v60c-15-15-45-15-60 0V0z" fill="none" stroke="#b8860b" strokeWidth="0.5"/>
          </pattern>
          <rect x="0" y="0" width="100%" height="100%" fill="url(#pattern-cert-premium)"/>
        </svg>
      </div>

      {/* --- Bordures Ornementales --- */}
      <div className="absolute inset-4 border-[2px] border-[#e5c185] opacity-40 pointer-events-none"></div>
      <div className="absolute inset-6 border-[1px] border-gray-300 pointer-events-none"></div>

      {/* --- Contenu --- */}
      <div className="relative h-full flex flex-col items-center justify-between p-12 md:p-16 text-center z-10">
        
        {/* En-tête */}
        <div className="space-y-4">
          <div className="flex justify-center mb-2">
            <Award size={56} className="text-[#b8860b]" />
          </div>
          <h1 className="text-3xl md:text-5xl font-serif font-bold tracking-[0.1em] text-gray-800 uppercase">
            Certificat d'Accomplissement
          </h1>
          <p className="text-[10px] md:text-xs uppercase tracking-[0.4em] text-gray-500 font-black">
            Ndara Afrique • Plateforme d'Excellence
          </p>
        </div>

        {/* Corps */}
        <div className="w-full flex flex-col items-center space-y-6">
          <p className="text-base md:text-lg text-gray-600 italic font-serif">
            Ce document atteste officiellement que
          </p>
          <div className="relative inline-block px-12 py-2 border-b-2 border-[#e5c185]">
            <h2 className="text-4xl md:text-6xl font-serif font-black text-gray-900 capitalize tracking-tight">
              {studentName}
            </h2>
          </div>
          <p className="text-sm md:text-base text-gray-600 max-w-2xl leading-relaxed">
            a validé avec succès l'ensemble des modules de la formation de haut niveau :
          </p>
          <h3 className="text-xl md:text-3xl font-bold text-gray-900 uppercase tracking-wide px-8">
            "{courseName}"
          </h3>
        </div>

        {/* Pied de page */}
        <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-8 items-end mt-8">
          <div className="text-left space-y-1">
            <div>
                <p className="text-[9px] text-gray-400 uppercase font-black tracking-widest">Délivré le</p>
                <p className="font-bold text-gray-800 text-sm">{completionDate}</p>
            </div>
            <div className="pt-4">
                <p className="text-[9px] text-gray-400 uppercase font-black tracking-widest">ID Unique</p>
                <p className="font-mono text-[10px] text-[#b8860b] font-bold">{certificateId.toUpperCase()}</p>
            </div>
          </div>

          <div className="flex justify-center">
             <div className="relative">
                <div className="w-28 h-28 border-[6px] border-double border-[#e5c185] rounded-full flex items-center justify-center p-1 bg-white/80 shadow-xl">
                    <div className="w-full h-full border-2 border-dashed border-[#e5c185] rounded-full flex flex-col items-center justify-center text-center">
                        <span className="text-[7px] font-black text-[#8b6b3a] leading-tight uppercase tracking-tighter">
                            SCEAU OFFICIEL<br/>
                            <span className="text-[14px]">NDARA</span><br/>
                            AFRIQUE
                        </span>
                    </div>
                </div>
             </div>
          </div>
          
          <div className="flex justify-between md:justify-end gap-12">
            <div className="text-center space-y-2">
               <div className="h-12 w-32 border-b border-gray-300 flex items-end justify-center italic font-serif text-2xl text-gray-600 pb-1">
                  Saleh
               </div>
               <p className="text-[9px] font-black uppercase text-gray-800 tracking-tighter leading-none">CEO, Fondateur</p>
            </div>
            <div className="text-center space-y-2">
               <div className="h-12 w-32 border-b border-gray-300 flex items-end justify-center italic font-serif text-2xl text-gray-600 pb-1">
                  Directeur P.
               </div>
               <p className="text-[9px] font-black uppercase text-gray-800 tracking-tighter leading-none">{instructorName}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 w-full bg-white/60 border-t border-gray-100 py-2 text-center text-[8px] font-bold text-gray-400 uppercase tracking-[0.3em]">
        Vérifiable en ligne sur : https://ndara-afrique.web.app/verify/{certificateId}
      </div>
    </div>
  );
});

CertificatePremium.displayName = "CertificatePremium";
