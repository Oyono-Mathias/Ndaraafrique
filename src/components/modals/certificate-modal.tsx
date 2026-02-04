'use client';

/**
 * @fileOverview Modal de présentation du Certificat Ndara Afrique.
 * Style Vintage, Papier grainé, Sceau doré et signatures.
 */

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Award, Share2, Smartphone } from 'lucide-react';
import Image from 'next/image';
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
    studentName, 
    instructorName, 
    completionDate, 
    certificateId 
}: CertificateModalProps) {
  
  const verificationUrl = typeof window !== 'undefined' ? `${window.location.origin}/verify/${certificateId}` : '';

  const handleWhatsAppShare = () => {
    const text = `🎉 Je viens d'obtenir mon certificat "${courseName}" sur Ndara Afrique ! 🚀\n\nVérifiez mon diplôme ici : ${verificationUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl p-0 border-0 bg-transparent shadow-none overflow-hidden">
        <DialogHeader className="sr-only">
            <DialogTitle>Certificat de Réussite</DialogTitle>
            <DialogDescription>
            Certificat pour {courseName} décerné à {studentName}.
            </DialogDescription>
        </DialogHeader>
        
        {/* --- LE CERTIFICAT VINTAGE --- */}
        <div className="relative aspect-[1.414/1] w-full bg-[#FDF6E3] text-slate-900 p-8 md:p-16 flex flex-col justify-between overflow-hidden shadow-2xl border-[16px] border-double border-[#CC7722]/30 m-auto select-none">
          
          {/* Grain de papier vintage */}
          <div className="absolute inset-0 opacity-[0.07] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/notebook.png')]" />
          
          {/* Coins décoratifs */}
          <div className="absolute top-4 left-4 w-12 h-12 border-t-4 border-l-4 border-[#CC7722]/40" />
          <div className="absolute top-4 right-4 w-12 h-12 border-t-4 border-r-4 border-[#CC7722]/40" />
          <div className="absolute bottom-4 left-4 w-12 h-12 border-b-4 border-l-4 border-[#CC7722]/40" />
          <div className="absolute bottom-4 right-4 w-12 h-12 border-b-4 border-r-4 border-[#CC7722]/40" />

          {/* Header Certificat */}
          <div className="flex justify-between items-start z-10">
              <div className="flex items-center gap-3">
                  <Image src="/logo.png" alt="Ndara Logo" width={48} height={48} className="grayscale brightness-50 opacity-40" />
                  <div>
                    <p className="font-black text-xs uppercase tracking-[0.3em] text-slate-400">Ndara Afrique</p>
                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">L'excellence par le savoir</p>
                  </div>
              </div>
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest border border-slate-300 px-2 py-1">Certificat No. {certificateId.substring(0, 12).toUpperCase()}</p>
          </div>

          {/* Corps du Certificat */}
          <div className="text-center z-10 flex-1 flex flex-col justify-center py-8">
            <h1 className="text-xs md:text-sm uppercase tracking-[0.5em] text-[#CC7722] font-black mb-6">Certificat de Réussite</h1>
            <p className="text-sm italic font-serif text-slate-500 mb-6">Ce document officiel atteste que</p>
            
            <h2 className="text-4xl md:text-6xl font-black text-slate-900 mb-6 tracking-tighter" style={{ fontFamily: 'var(--font-serif)' }}>
                {studentName}
            </h2>
            
            <p className="text-sm font-serif text-slate-500 mb-6">a complété avec succès et excellence la formation professionnelle</p>
            
            <h3 className="text-2xl md:text-3xl font-black text-slate-800 uppercase tracking-tight max-w-2xl mx-auto">
                {courseName}
            </h3>
          </div>
          
          {/* Footer : Sceau & Signatures */}
          <div className="flex justify-between items-end z-10">
              <div className="text-center w-40">
                  <p className="font-serif italic text-lg mb-1 leading-none text-slate-800" style={{ fontFamily: 'cursive' }}>{instructorName}</p>
                  <div className="h-px bg-slate-300 w-full mb-2" />
                  <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Expert Formateur</p>
              </div>

              {/* SCEAU DORÉ SVG */}
              <div className="relative group">
                  <svg width="100" height="100" viewBox="0 0 100 100" className="drop-shadow-xl animate-in zoom-in-50 duration-1000">
                      <circle cx="50" cy="50" r="45" fill="#CC7722" fillOpacity="0.1" stroke="#CC7722" strokeWidth="1" strokeDasharray="2 2" />
                      <path d="M50 5 L55 35 L85 35 L60 55 L70 85 L50 65 L30 85 L40 55 L15 35 L45 35 Z" fill="#CC7722" className="opacity-80" />
                      <circle cx="50" cy="50" r="35" fill="none" stroke="#CC7722" strokeWidth="0.5" />
                      <text x="50" y="52" fontSize="6" fontWeight="900" fill="#CC7722" textAnchor="middle" className="uppercase tracking-[0.2em]">Authentique</text>
                  </svg>
              </div>

              <div className="text-center w-40">
                   <p className="font-serif italic text-lg mb-1 leading-none text-slate-800" style={{ fontFamily: 'cursive' }}>Mathias Oyono</p>
                   <div className="h-px bg-slate-300 w-full mb-2" />
                   <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Directeur Ndara Afrique</p>
              </div>
          </div>

          <div className="absolute bottom-4 left-0 right-0 text-center">
            <p className="text-[7px] font-bold text-slate-300 uppercase tracking-[0.3em]">
                Vérification numérique disponible sur {verificationUrl}
            </p>
          </div>
        </div>

        {/* --- ACTIONS MOBILE --- */}
        <div className="flex flex-col gap-3 px-4 pb-8 mt-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <Button 
                onClick={handleWhatsAppShare}
                className="h-14 rounded-2xl bg-[#25D366] hover:bg-[#25D366]/90 text-white font-black uppercase text-xs tracking-widest shadow-xl active:scale-95 transition-all"
            >
                <Share2 className="mr-3 h-5 w-5" />
                Partager sur WhatsApp
            </Button>
            <p className="text-center text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                <Smartphone className="inline h-3 w-3 mr-1 mb-0.5" />
                Faites une capture d'écran pour enregistrer
            </p>
            <Button variant="ghost" onClick={onClose} className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">
                Fermer
            </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
