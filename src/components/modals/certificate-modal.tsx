'use client';

/**
 * @fileOverview Modal de présentation du Certificat Ndara Afrique.
 * Gère la mise à l'échelle responsive pour mobile et l'export PDF haute qualité au format A4.
 */

import React, { useRef, useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Share2, Download, Loader2 } from 'lucide-react';
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
  const [scale, setScale] = useState(1);
  const verificationUrl = typeof window !== 'undefined' ? `${window.location.origin}/verify/${certificateId}` : '';
  const formattedDate = format(completionDate, 'dd MMMM yyyy', { locale: fr });

  // Mise à l'échelle pour l'aperçu mobile sans affecter les dimensions réelles du certificat
  useEffect(() => {
    const handleResize = () => {
      if (typeof window === 'undefined') return;
      const width = window.innerWidth;
      if (width < 640) {
        const newScale = (width - 48) / 1123; 
        setScale(newScale);
      } else {
        const newScale = Math.min(1, (window.innerWidth - 100) / 1123);
        setScale(newScale);
      }
    };

    if (isOpen) {
      handleResize();
      window.addEventListener('resize', handleResize);
    }
    return () => window.removeEventListener('resize', handleResize);
  }, [isOpen]);

  const handleWhatsAppShare = () => {
    const text = `🎉 Je suis fier de partager mon certificat "${courseName}" obtenu sur Ndara Afrique ! 🚀\n\nVérifiez mon diplôme ici : ${verificationUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleDownloadPDF = async () => {
    if (!certificateRef.current) return;
    setIsDownloading(true);

    try {
      const element = certificateRef.current;
      
      // Capturer le certificat avec une haute densité de pixels
      const canvas = await html2canvas(element, {
        scale: 2, // Haute résolution
        useCORS: true,
        logging: false,
        backgroundColor: '#fdfcf7',
        width: 1123,
        height: 794,
        windowWidth: 1123,
        windowHeight: 794,
      });

      const imgData = canvas.toDataURL('image/png', 1.0);
      
      // Créer le PDF au format A4 Paysage exact (297mm x 210mm)
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      // L'image doit remplir exactement la page A4 (297x210)
      pdf.addImage(imgData, 'PNG', 0, 0, 297, 210);
      pdf.save(`Certificat_Ndara_${studentName.replace(/\s/g, '_')}.pdf`);
      
    } catch (error) {
      console.error("PDF Export Error:", error);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-screen-2xl p-0 border-0 bg-slate-950/95 shadow-none overflow-hidden overflow-y-auto max-h-[98vh] custom-scrollbar">
        <DialogHeader className="sr-only">
            <DialogTitle>Certificat d'Accomplissement</DialogTitle>
            <DialogDescription>
            Certificat pour {courseName} décerné à {studentName}.
            </DialogDescription>
        </DialogHeader>
        
        {/* --- CONTENEUR D'APERÇU --- */}
        <div className="flex flex-col items-center justify-start py-12 px-4 min-h-[85vh]">
            <div 
                style={{ 
                    transform: `scale(${scale})`, 
                    transformOrigin: 'top center',
                    width: '1123px',
                    height: '794px',
                    transition: 'transform 0.3s ease-out'
                }}
                className="shadow-2xl shadow-black/50"
            >
                <CertificatePremium 
                    ref={certificateRef}
                    studentName={studentName}
                    courseName={courseName}
                    completionDate={formattedDate}
                    certificateId={certificateId}
                    instructorName={instructorName}
                />
            </div>
        </div>

        {/* --- BARRE D'ACTIONS FIXE --- */}
        <div className="fixed bottom-0 left-0 right-0 p-6 bg-slate-900/80 backdrop-blur-xl border-t border-white/10 z-50">
            <div className="max-w-2xl mx-auto flex flex-col sm:flex-row gap-4">
                <Button 
                    onClick={handleDownloadPDF}
                    disabled={isDownloading}
                    className="flex-1 h-14 rounded-2xl bg-white text-slate-900 hover:bg-slate-100 font-black uppercase text-xs tracking-widest shadow-xl active:scale-95 transition-all"
                >
                    {isDownloading ? <Loader2 className="mr-3 h-5 w-5 animate-spin" /> : <Download className="mr-3 h-5 w-5" />}
                    TÉLÉCHARGER (PDF)
                </Button>
                <Button 
                    onClick={handleWhatsAppShare}
                    className="flex-1 h-14 rounded-2xl bg-[#25D366] hover:bg-[#25D366]/90 text-white font-black uppercase text-xs tracking-widest shadow-xl active:scale-95 transition-all"
                >
                    <Share2 className="mr-3 h-5 w-5" />
                    PARTAGER WHATSAPP
                </Button>
                <Button variant="ghost" onClick={onClose} className="sm:hidden text-slate-500 font-bold uppercase text-[10px]">
                    Fermer
                </Button>
            </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}