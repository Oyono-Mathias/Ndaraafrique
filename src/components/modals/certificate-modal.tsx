
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
  studentName: string;
  completionDate: Date;
}

export function CertificateModal({ isOpen, onClose, courseName, studentName, completionDate }: CertificateModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl p-0 border-0">
        <DialogHeader>
            <DialogTitle className="sr-only">Certificat de Réussite</DialogTitle>
            <DialogDescription className="sr-only">
            Certificat de réussite pour le cours {courseName}, décerné à {studentName} le {completionDate ? format(completionDate, 'dd MMMM yyyy', { locale: fr }) : ''}.
            </DialogDescription>
        </DialogHeader>
        
        <div className="relative aspect-[1.414] w-full bg-slate-50 text-slate-800 p-8 flex flex-col items-center justify-center overflow-hidden">
          {/* Decorative elements */}
          <div className="absolute top-0 left-0 w-32 h-32 border-t-8 border-l-8 border-amber-400"></div>
          <div className="absolute top-0 right-0 w-32 h-32 border-t-8 border-r-8 border-amber-400"></div>
          <div className="absolute bottom-0 left-0 w-32 h-32 border-b-8 border-l-8 border-amber-400"></div>
          <div className="absolute bottom-0 right-0 w-32 h-32 border-b-8 border-r-8 border-amber-400"></div>

          <div className="text-center z-10">
            <div className="flex justify-center mb-4">
              <Award className="h-20 w-20 text-amber-500" />
            </div>

            <h1 className="text-sm uppercase tracking-widest text-slate-500 mb-2">Certificat de Réussite</h1>
            <p className="text-base text-slate-600 mb-4">Ce certificat est fièrement présenté à</p>
            
            <h2 className="text-5xl font-bold text-blue-800 mb-4" style={{ fontFamily: 'serif' }}>{studentName}</h2>
            
            <p className="text-base text-slate-600 mb-4">pour avoir complété avec succès la formation</p>
            <h3 className="text-3xl font-semibold text-slate-700 mb-8">{courseName}</h3>
            
            <div className="w-2/3 mx-auto border-t border-slate-300 my-6"></div>

            <div className="flex justify-between items-center text-sm">
                <div>
                    <p className="font-semibold">Date d'achèvement</p>
                    <p>{completionDate ? format(completionDate, 'dd MMMM yyyy', { locale: fr }) : 'Date inconnue'}</p>
                </div>
                <div className="flex items-center gap-2">
                    <Image src="/icon.svg" alt="Ndara Afrique Logo" width={40} height={40} />
                    <p className="font-bold text-lg">Ndara Afrique</p>
                </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
