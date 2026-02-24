'use client';

/**
 * @fileOverview Modal de présentation du Certificat Ndara Afrique.
 * Design Premium Excellence correspondant exactement à la maquette.
 */

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Award, Share2, Smartphone, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseName: string;
  studentName?: string;
  instructorName: string;
  completionDate: Date;
  certificateId: string;
}

export function CertificateModal({ 
    isOpen, 
    onClose, 
    courseName, 
    studentName = "Cher Ndara", 
    instructorName, 
    completionDate, 
    certificateId 
}: CertificateModalProps) {
  
  const verificationUrl = typeof window !== 'undefined' ? `${window.location.origin}/verify/${certificateId}` : '';
  const formattedDate = format(completionDate, 'dd MMMM yyyy', { locale: fr });

  const handleWhatsAppShare = () => {
    const text = `🎉 Je suis fier de partager mon certificat "${courseName}" obtenu sur Ndara Afrique ! 🚀\n\nVérifiez mon diplôme ici : ${verificationUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl p-0 border-0 bg-transparent shadow-none overflow-hidden overflow-y-auto max-h-[95vh] selection:bg-orange-100">
        <DialogHeader className="sr-only">
            <DialogTitle>Certificat d'Accomplissement</DialogTitle>
            <DialogDescription>
            Certificat pour {courseName} décerné à {studentName}.
            </DialogDescription>
        </DialogHeader>
        
        {/* --- LE CERTIFICAT PREMIUM EXCELLENCE --- */}
        <div className="relative w-full aspect-[1.414/1] bg-[#fdfcf7] shadow-[0_20px_50px_rgba(0,0,0,0.3)] overflow-hidden text-gray-900 font-sans mx-auto border-[12px] border-double border-[#e5c185] ring-1 ring-gray-200">
          
          {/* --- Arrière-plan décoratif (Guillochis) --- */}
          <div className="absolute inset-0 opacity-[0.04] pointer-events-none">
            <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
              <pattern id="pattern-cert" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
                <path d="M30 0c15 15 45 15 60 0v60c-15-15-45-15-60 0V0z" fill="none" stroke="#b8860b" strokeWidth="0.5"/>
              </pattern>
              <rect x="0" y="0" width="100%" height="100%" fill="url(#pattern-cert)"/>
            </svg>
          </div>

          {/* --- Bordure Ornementale Intérieure --- */}
          <div className="absolute inset-4 border-[2px] border-[#e5c185] opacity-40 pointer-events-none"></div>
          <div className="absolute inset-6 border-[1px] border-gray-300 pointer-events-none"></div>

          {/* --- Contenu Principal --- */}
          <div className="relative h-full flex flex-col items-center justify-between p-12 md:p-16 text-center z-10">
            
            {/* Header */}
            <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-1000">
              <h1 className="text-3xl md:text-5xl font-serif font-bold tracking-[0.1em] text-gray-800 uppercase">
                Certificat d'Accomplissement
              </h1>
              <p className="text-[10px] md:text-xs uppercase tracking-[0.4em] text-gray-500 font-black">
                Ndara Afrique • Plateforme d'Excellence
              </p>
            </div>

            {/* Student Name */}
            <div className="w-full flex flex-col items-center space-y-6">
              <p className="text-base md:text-lg text-gray-600 italic font-serif">
                Ce document atteste officiellement que
              </p>
              <div className="relative inline-block px-12 py-2 border-b-2 border-[#e5c185] animate-in zoom-in duration-1000 delay-300">
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

            {/* Footer Details */}
            <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-8 items-end mt-8">
              
              {/* Left: Metadata */}
              <div className="text-left space-y-1 order-2 md:order-1">
                <div className="space-y-0.5">
                    <p className="text-[9px] text-gray-400 uppercase font-black tracking-widest">Délivré le</p>
                    <p className="font-bold text-gray-800 text-sm">{formattedDate}</p>
                </div>
                <div className="pt-4">
                    <p className="text-[9px] text-gray-400 uppercase font-black tracking-widest">ID Unique</p>
                    <p className="font-mono text-[10px] text-[#b8860b] font-bold">{certificateId.toUpperCase()}</p>
                </div>
              </div>

              {/* Center: Official Seal */}
              <div className="flex justify-center order-1 md:order-2">
                 <div className="relative group">
                    <div className="absolute -inset-2 bg-[#e5c185] rounded-full blur opacity-20 group-hover:opacity-40 transition-opacity"></div>
                    <div className="w-28 h-28 border-[6px] border-double border-[#e5c185] rounded-full flex items-center justify-center p-1 bg-white/80 shadow-xl relative animate-in zoom-in duration-1000 delay-700">
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
              
              {/* Right: Signatures */}
              <div className="flex justify-between md:justify-end gap-12 order-3">
                <div className="text-center space-y-2">
                   <div className="h-12 w-32 border-b border-gray-300 flex items-end justify-center italic font-serif text-2xl text-gray-600 pb-1 px-2 select-none">
                      Saleh
                   </div>
                   <div className="space-y-0.5">
                      <p className="text-[9px] font-black uppercase text-gray-800 tracking-tighter">Le Fondateur, CEO</p>
                      <p className="text-[8px] text-gray-500 font-bold uppercase tracking-tighter leading-none">Ndara Afrique</p>
                   </div>
                </div>
                <div className="text-center space-y-2">
                   <div className="h-12 w-32 border-b border-gray-300 flex items-end justify-center italic font-serif text-2xl text-gray-600 pb-1 px-2 select-none">
                      Directeur P.
                   </div>
                   <div className="space-y-0.5">
                      <p className="text-[9px] font-black uppercase text-gray-800 tracking-tighter">Le Directeur</p>
                      <p className="text-[8px] text-gray-500 font-bold uppercase tracking-tighter leading-none">Pédagogique</p>
                   </div>
                </div>
              </div>

            </div>
          </div>

          {/* Secure verification line */}
          <div className="absolute bottom-0 w-full bg-white/60 border-t border-gray-100 py-2 text-center text-[8px] font-bold text-gray-400 uppercase tracking-[0.3em] backdrop-blur-sm">
            Authenticité vérifiable numériquement sur : {verificationUrl}
          </div>
        </div>

        {/* --- MOBILE ACTIONS --- */}
        <div className="flex flex-col gap-3 px-4 pb-10 mt-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <Button 
                onClick={handleWhatsAppShare}
                className="h-14 rounded-2xl bg-[#25D366] hover:bg-[#25D366]/90 text-white font-black uppercase text-xs tracking-widest shadow-2xl shadow-green-500/20 active:scale-95 transition-all"
            >
                <Share2 className="mr-3 h-5 w-5" />
                Partager sur WhatsApp
            </Button>
            <div className="bg-white/10 backdrop-blur-md border border-white/10 p-4 rounded-2xl flex items-center gap-4">
                <div className="p-2 bg-primary/20 rounded-lg">
                    <ShieldCheck className="h-5 w-5 text-primary" />
                </div>
                <p className="text-[10px] text-slate-400 font-medium leading-relaxed uppercase tracking-tight">
                    Ce certificat est un titre officiel. Vous pouvez le télécharger, l'imprimer ou l'ajouter à votre CV.
                </p>
            </div>
            <Button variant="ghost" onClick={onClose} className="text-slate-500 hover:text-white font-bold uppercase text-[10px] tracking-[0.3em] h-10 mt-2">
                Fermer l'aperçu
            </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
