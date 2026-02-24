'use client';

/**
 * @fileOverview Modal de présentation du Certificat Ndara Afrique.
 * Design Premium Vintage avec Sceau Ndara et signatures.
 */

import React from 'react';
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
    studentName = "Cher Ndara", 
    instructorName, 
    completionDate, 
    certificateId 
}: CertificateModalProps) {
  
  const verificationUrl = typeof window !== 'undefined' ? `${window.location.origin}/verify/${certificateId}` : '';
  const formattedDate = format(completionDate, 'dd MMMM yyyy', { locale: fr });

  const handleWhatsAppShare = () => {
    const text = `🎉 Je viens d'obtenir mon certificat "${courseName}" sur Ndara Afrique ! 🚀\n\nVérifiez mon diplôme ici : ${verificationUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl p-0 border-0 bg-transparent shadow-none overflow-hidden overflow-y-auto max-h-[95vh]">
        <DialogHeader className="sr-only">
            <DialogTitle>Certificat de Réussite</DialogTitle>
            <DialogDescription>
            Certificat pour {courseName} décerné à {studentName}.
            </DialogDescription>
        </DialogHeader>
        
        {/* --- LE CERTIFICAT PREMIUM VINTAGE --- */}
        <div className="relative w-full aspect-[1.414/1] bg-white shadow-2xl overflow-hidden text-gray-800 font-sans mx-auto border-[12px] border-double border-orange-100 ring-1 ring-gray-200">
          
          {/* --- Arrière-plan décoratif (Motif Guillochis subtil) --- */}
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none">
            <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
              <pattern id="pattern" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M0 0c10 10 30 10 40 0v40c-10-10-30-10-40 0V0z" fill="none" stroke="#000" strokeWidth="0.5"/>
              </pattern>
              <rect x="0" y="0" width="100%" height="100%" fill="url(#pattern)"/>
            </svg>
          </div>

          {/* --- Bordure Ornementale --- */}
          <div className="absolute inset-4 border-[4px] border-double border-orange-200 pointer-events-none"></div>
          <div className="absolute inset-8 border border-gray-200 pointer-events-none"></div>

          {/* --- Contenu Principal Centré --- */}
          <div className="relative h-full flex flex-col items-center justify-center p-12 text-center z-10">
            
            {/* Logo et En-tête */}
            <div className="mb-6 flex flex-col items-center animate-in fade-in slide-in-from-top-4 duration-700">
              <Award size={56} className="text-orange-500 mb-2 drop-shadow-sm" /> 
              <h1 className="text-[10px] uppercase tracking-[0.4em] text-gray-400 font-black">Ndara Afrique • Excellence Panafricaine</h1>
            </div>
            
            {/* Titre Principal */}
            <h2 className="text-3xl md:text-5xl font-serif font-bold text-gray-900 mb-4 uppercase tracking-widest px-4">
              Certificat de Réussite
            </h2>
            
            <p className="text-sm md:text-base text-gray-500 italic mb-8 font-serif">
              Ce document officiel atteste solennellement que
            </p>

            {/* Nom de l'étudiant */}
            <div className="mb-8 border-b-2 border-orange-400 pb-2 px-12 animate-in zoom-in duration-1000">
              <h3 className="text-4xl md:text-6xl font-serif font-black text-orange-600 capitalize tracking-tighter">
                {studentName}
              </h3>
            </div>

            <p className="text-sm md:text-base text-gray-600 mb-4 max-w-xl">
              a validé avec succès et excellence l'ensemble des modules de la formation de haut niveau :
            </p>

            {/* Nom du Cours */}
            <h4 className="text-xl md:text-3xl font-black text-gray-900 mb-12 uppercase tracking-tight leading-tight px-6">
              "{courseName}"
            </h4>

            {/* --- Pied de page --- */}
            <div className="w-full flex flex-col md:flex-row justify-between items-end mt-auto pt-8 px-8">
              
              {/* Date et ID */}
              <div className="text-left mb-8 md:mb-0 space-y-1">
                <p className="text-[9px] text-gray-400 uppercase tracking-widest font-bold">Délivré le</p>
                <p className="font-bold text-gray-800 text-sm">{formattedDate}</p>
                <p className="text-[9px] text-gray-400 mt-4 font-bold">ID UNIQUE: <span className="font-mono text-orange-600">{certificateId.substring(0, 16).toUpperCase()}</span></p>
              </div>

              {/* Sceau Ndara */}
              <div className="hidden md:block mx-auto opacity-90 animate-in zoom-in-50 duration-1000 delay-500">
                 <div className="w-24 h-24 border-4 border-orange-200 rounded-full flex items-center justify-center p-1.5 shadow-xl bg-white/50">
                     <div className="w-full h-full border-2 border-dashed border-orange-400 rounded-full flex items-center justify-center text-center">
                         <span className="text-[8px] font-black text-orange-800 leading-[1.1] uppercase tracking-tighter">
                             SCEAU OFFICIEL<br/>NDARA
                         </span>
                     </div>
                 </div>
              </div>
              
              {/* Signatures */}
              <div className="flex gap-12 text-center items-end">
                <div className="space-y-1">
                   <div className="h-10 w-32 border-b border-gray-300 flex items-end justify-center italic font-serif text-lg text-gray-600 pb-1">
                      {instructorName?.split(' ')[0] || 'Prof.'}
                   </div>
                  <p className="text-[10px] font-black uppercase text-gray-800">L'Instructeur</p>
                </div>
                <div className="space-y-1">
                   <div className="h-10 w-32 border-b border-gray-300 flex items-end justify-center italic font-serif text-lg text-gray-600 pb-1">
                      Mathias O.
                   </div>
                  <p className="text-[10px] font-black uppercase text-gray-800">Le Fondateur</p>
                </div>
              </div>

            </div>
          </div>

          {/* Barre de vérification */}
          <div className="absolute bottom-0 w-full bg-gray-50/80 border-t border-gray-100 py-2.5 text-center text-[8px] font-bold text-gray-400 uppercase tracking-[0.2em] backdrop-blur-sm">
            Vérifiable numériquement sur : {verificationUrl}
          </div>
        </div>

        {/* --- ACTIONS MOBILE --- */}
        <div className="flex flex-col gap-3 px-4 pb-8 mt-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <Button 
                onClick={handleWhatsAppShare}
                className="h-14 rounded-2xl bg-[#25D366] hover:bg-[#25D366]/90 text-white font-black uppercase text-xs tracking-widest shadow-2xl shadow-green-500/20 active:scale-95 transition-all"
            >
                <Share2 className="mr-3 h-5 w-5" />
                Partager sur WhatsApp
            </Button>
            <p className="text-center text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                <Smartphone className="inline h-3 w-3 mr-1 mb-0.5" />
                Faites une capture d'écran pour enregistrer votre succès
            </p>
            <Button variant="ghost" onClick={onClose} className="text-gray-400 hover:text-gray-600 font-bold uppercase text-[10px] tracking-widest h-10">
                Fermer
            </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
