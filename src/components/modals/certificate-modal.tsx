'use client';

/**
 * @fileOverview Modal de présentation du Certificat Ndara Afrique utilisant le composant Premium.
 */

import React, { useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Award, Share2, ShieldCheck, Download, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { CertificatePremium } from '../CertificatePremium';

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
  
  const certificateRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const verificationUrl = typeof window !== 'undefined' ? `${window.location.origin}/verify/${certificateId}` : '';
  const formattedDate = format(completionDate, 'dd MMMM yyyy', { locale: fr });

  const handleWhatsAppShare = () => {
    const text = `🎉 Je suis fier de partager mon certificat "${courseName}" obtenu sur Ndara Afrique ! 🚀\n\nVérifiez mon diplôme ici : ${verificationUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleDownloadPDF = async () => {
    if (!certificateRef.current) return;
    setIsDownloading(true);

    try {
      const element = certificateRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#fdfcf7'
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'px',
        format: [canvas.width, canvas.height]
      });

      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      pdf.save(`Certificat_Ndara_${studentName.replace(/\s/g, '_')}.pdf`);
    } catch (error) {
      console.error("PDF Export Error:", error);
    } finally {
      setIsDownloading(false);
    }
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
        
        <div className="p-4 sm:p-0">
            <CertificatePremium 
                ref={certificateRef}
                studentName={studentName}
                courseName={courseName}
                completionDate={formattedDate}
                certificateId={certificateId}
                instructorName={instructorName}
            />
        </div>

        {/* --- ACTIONS --- */}
        <div className="flex flex-col gap-3 px-4 pb-10 mt-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Button 
                    onClick={handleDownloadPDF}
                    disabled={isDownloading}
                    className="h-14 rounded-2xl bg-white text-slate-900 hover:bg-slate-100 font-black uppercase text-xs tracking-widest shadow-xl active:scale-95 transition-all"
                >
                    {isDownloading ? <Loader2 className="mr-3 h-5 w-5 animate-spin" /> : <Download className="mr-3 h-5 w-5" />}
                    Télécharger (PDF)
                </Button>
                <Button 
                    onClick={handleWhatsAppShare}
                    className="h-14 rounded-2xl bg-[#25D366] hover:bg-[#25D366]/90 text-white font-black uppercase text-xs tracking-widest shadow-xl active:scale-95 transition-all"
                >
                    <Share2 className="mr-3 h-5 w-5" />
                    Partager WhatsApp
                </Button>
            </div>
            
            <div className="bg-white/10 backdrop-blur-md border border-white/10 p-4 rounded-2xl flex items-center gap-4">
                <div className="p-2 bg-primary/20 rounded-lg">
                    <ShieldCheck className="h-5 w-5 text-primary" />
                </div>
                <p className="text-[10px] text-slate-400 font-medium leading-relaxed uppercase tracking-tight">
                    Ce certificat est un titre officiel Ndara Afrique. Vous pouvez l'ajouter à votre CV LinkedIn pour valoriser vos compétences.
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
