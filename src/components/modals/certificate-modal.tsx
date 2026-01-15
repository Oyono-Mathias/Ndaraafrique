
'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Award } from 'lucide-react';
import Image from 'next/image';

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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl p-0 border-0">
        <DialogHeader>
            <DialogTitle className="sr-only">Certificat de Réussite</DialogTitle>
            <DialogDescription className="sr-only">
            Certificat de réussite pour le cours {courseName}, décerné à {studentName} le {completionDate ? format(completionDate, 'dd MMMM yyyy', { locale: fr }) : ''}.
            </DialogDescription>
        </DialogHeader>
        
        <div className="relative aspect-[1.414] w-full bg-slate-50 text-slate-800 p-8 md:p-12 flex flex-col justify-between overflow-hidden">
          {/* Decorative elements */}
          <div className="absolute top-0 left-0 w-24 h-24 border-t-8 border-l-8 border-amber-400/80"></div>
          <div className="absolute top-0 right-0 w-24 h-24 border-t-8 border-r-8 border-amber-400/80"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 border-b-8 border-l-8 border-amber-400/80"></div>
          <div className="absolute bottom-0 right-0 w-24 h-24 border-b-8 border-r-8 border-amber-400/80"></div>

          <div className="flex items-center justify-between z-10">
              <div className="flex items-center gap-3">
                  <Image src="/icon.svg" alt="Ndara Afrique Logo" width={40} height={40} />
                  <p className="font-bold text-lg text-blue-900">Ndara Afrique</p>
              </div>
              <p className="text-xs text-slate-400">ID: {certificateId}</p>
          </div>

          <div className="text-center z-10 my-8">
            <h1 className="text-sm uppercase tracking-[0.2em] text-slate-500 mb-2 font-sans">Certificat de Réussite</h1>
            <p className="text-base text-slate-600 mb-4 font-sans">Ce certificat atteste que</p>
            
            <h2 className="text-4xl md:text-5xl font-bold text-blue-800 mb-4" style={{ fontFamily: "'Times New Roman', Times, serif" }}>{studentName}</h2>
            
            <p className="text-base text-slate-600 mb-4 font-sans">a complété avec succès la formation</p>
            <h3 className="text-2xl md:text-3xl font-semibold text-slate-700">{courseName}</h3>
          </div>
          
          <div className="flex justify-between items-end text-sm z-10">
              <div className="text-center">
                  <p className="font-semibold text-lg" style={{ fontFamily: "'Times New Roman', Times, serif" }}>{instructorName}</p>
                  <div className="w-40 h-px bg-slate-400 my-1"></div>
                  <p className="text-xs text-slate-500">Formateur</p>
              </div>
              <div className="text-center">
                  <p className="text-xs text-slate-500 mb-1">Délivré le</p>
                  <p className="font-semibold">{completionDate ? format(completionDate, 'dd MMMM yyyy', { locale: fr }) : 'Date inconnue'}</p>
              </div>
              <div className="text-center">
                   <p className="font-semibold text-lg" style={{ fontFamily: "'Times New Roman', Times, serif" }}>Mathias Oyono</p>
                   <div className="w-40 h-px bg-slate-400 my-1"></div>
                   <p className="text-xs text-slate-500">CEO, Ndara Afrique</p>
              </div>
          </div>
           <p className="text-center text-xs text-slate-400 mt-4 z-10">Vérifier sur : {verificationUrl}</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
