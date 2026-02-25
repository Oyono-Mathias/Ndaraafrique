'use client';

import React from 'react';
import { Award } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CertificatePremiumProps {
  studentName: string;
  courseName: string;
  completionDate: string;
  certificateId: string;
  instructorName?: string;
  className?: string;
}

/**
 * @fileOverview Certificat de réussite premium Ndara Afrique.
 * Format A4 Paysage (1123px x 794px).
 * Signataire Officiel : Oyono Mathias (CEO & Fondateur).
 */
export const CertificatePremium = React.forwardRef<HTMLDivElement, CertificatePremiumProps>(({
  studentName,
  courseName,
  completionDate,
  certificateId,
  instructorName = "Formateur Ndara",
  className
}, ref) => {
  return (
    <div 
      ref={ref}
      id="ndara-certificate-premium"
      style={{ width: '1123px', height: '794px' }}
      className={cn(
        "relative bg-[#fdfcf7] shadow-2xl overflow-hidden text-gray-900 font-sans border-[12px] border-double border-[#e5c185] ring-1 ring-gray-200 flex flex-col shrink-0",
        className
      )}
    >
      {/* Texture Guillochis Subtile */}
      <div className="absolute inset-0 opacity-[0.04] pointer-events-none">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <pattern id="pattern-cert-final" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
            <path d="M30 0c15 15 45 15 60 0v60c-15-15-45-15-60 0V0z" fill="none" stroke="#b8860b" strokeWidth="0.5"/>
          </pattern>
          <rect x="0" y="0" width="100%" height="100%" fill="url(#pattern-cert-final)"/>
        </svg>
      </div>

      {/* Bordures de sécurité */}
      <div className="absolute inset-4 border-[2px] border-[#e5c185] opacity-40 pointer-events-none"></div>
      <div className="absolute inset-6 border-[1px] border-gray-300 pointer-events-none"></div>

      <div className="relative h-full flex flex-col items-center justify-between p-16 text-center z-10">
        
        {/* En-tête */}
        <div className="space-y-4 pt-4">
          <div className="flex justify-center mb-2">
            <Award size={64} className="text-[#b8860b]" />
          </div>
          <h1 className="text-5xl font-serif font-bold tracking-[0.1em] text-gray-800 uppercase">
            Certificat d'Accomplissement
          </h1>
          <p className="text-xs uppercase tracking-[0.4em] text-gray-500 font-black">
            Ndara Afrique • Excellence Panafricaine
          </p>
        </div>

        {/* Corps du texte */}
        <div className="w-full flex flex-col items-center space-y-8">
          <p className="text-xl text-gray-600 italic font-serif">
            Ce document atteste officiellement que
          </p>
          <div className="relative inline-block px-12 py-2 border-b-2 border-[#e5c185]">
            <h2 className="text-6xl font-serif font-black text-[#CC7722] capitalize tracking-tight">
              {studentName}
            </h2>
          </div>
          <p className="text-lg text-gray-600 max-w-2xl leading-relaxed">
            a validé avec succès l'ensemble des modules de la formation de haut niveau :
          </p>
          <h3 className="text-3xl font-bold text-gray-900 uppercase tracking-wide px-8 leading-tight">
            "{courseName}"
          </h3>
        </div>

        {/* Pied de page : Signatures et Sceau */}
        <div className="w-full grid grid-cols-3 gap-8 items-end mt-12 mb-4 px-8">
          {/* Bloc Date et ID */}
          <div className="text-left space-y-4 pb-2">
            <div>
                <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest">Délivré le</p>
                <p className="font-bold text-gray-800 text-sm">{completionDate}</p>
            </div>
            <div>
                <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest">ID de vérification</p>
                <p className="font-mono text-[11px] text-[#b8860b] font-bold">{certificateId.toUpperCase()}</p>
            </div>
          </div>

          {/* Sceau Officiel */}
          <div className="flex justify-center pb-4">
             <div className="w-32 h-32 border-[6px] border-double border-[#e5c185] rounded-full flex items-center justify-center p-1 bg-white/80 shadow-xl">
                <div className="w-full h-full border-2 border-dashed border-[#e5c185] rounded-full flex flex-col items-center justify-center text-center">
                    <span className="text-[8px] font-black text-[#8b6b3a] leading-tight uppercase tracking-tighter">
                        SCEAU OFFICIEL<br/>
                        <span className="text-[16px]">NDARA</span><br/>
                        AFRIQUE
                    </span>
                </div>
             </div>
          </div>
          
          {/* Signatures */}
          <div className="flex justify-end gap-16 pb-4">
            {/* Signature CEO (Oyono Mathias) */}
            <div className="text-center space-y-2">
               <div className="h-14 w-40 border-b border-gray-300 flex items-end justify-center italic font-serif text-3xl text-gray-700 pb-1">
                  Mathias
               </div>
               <p className="text-[9px] font-black uppercase text-gray-800 tracking-tighter leading-none">Oyono Mathias</p>
               <p className="text-[8px] font-bold uppercase text-primary tracking-widest leading-none mt-1">CEO & FONDATEUR</p>
            </div>
            
            {/* Signature Formateur */}
            <div className="text-center space-y-2">
               <div className="h-14 w-40 border-b border-gray-400 flex items-end justify-center italic font-serif text-2xl text-gray-700 pb-1">
                  {instructorName.split(' ')[0]}
               </div>
               <p className="text-[9px] font-black uppercase text-gray-800 tracking-tighter leading-none">{instructorName}</p>
               <p className="text-[8px] font-bold uppercase text-slate-500 tracking-widest leading-none mt-1">Formateur Expert</p>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 w-full bg-white/60 border-t border-gray-100 py-3 text-center text-[10px] font-bold text-gray-400 uppercase tracking-[0.3em]">
        Vérification en ligne : https://ndara-afrique.app/verify/{certificateId}
      </div>
    </div>
  );
});

CertificatePremium.displayName = "CertificatePremium";