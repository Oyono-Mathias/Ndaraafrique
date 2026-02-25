'use client';

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

/**
 * @fileOverview Modal de visualisation et d'export du certificat.
 * Utilise un rendu masqué à l'échelle 1:1 pour garantir un PDF A4 parfait.
 */
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

  useEffect(() => {
    const handleResize = () => {
      if (typeof window === 'undefined') return;
      const width = window.innerWidth;
      // Dimensions du certificat A4 Landscape : 1123px de large
      if (width < 640) {
        setScale((width - 48) / 1123); 
      } else {
        setScale(Math.min(1, (window.innerWidth - 100) / 1123));
      }
    };

    if (isOpen) {
      handleResize();
      window.addEventListener('resize', handleResize);
    }
    return () => window.removeEventListener('resize', handleResize);
  }, [isOpen]);

  const handleWhatsAppShare = () => {
    const text = `🎉 Très fier de mon certificat "${courseName}" obtenu sur Ndara Afrique ! 🚀\n\nVérifiez mon diplôme ici : ${verificationUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleDownloadPDF = async () => {
    if (!certificateRef.current) return;
    setIsDownloading(true);

    try {
      // Pour un export parfait, on s'assure de capturer à l'échelle réelle (sans le transform scale du CSS)
      const element = certificateRef.current;
      
      const canvas = await html2canvas(element, {
        scale: 2, // Haute résolution 300DPI
        useCORS: true,
        logging: false,
        backgroundColor: '#fdfcf7',
        width: 1123,
        height: 794,
      });

      const imgData = canvas.toDataURL('image/png', 1.0);
      
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      // A4 Landscape : 297mm x 210mm
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
      <DialogContent className="max-w-screen-2xl p-0 border-0 bg-slate-950/90 shadow-none overflow-y-auto max-h-[98vh] flex flex-col items-center">
        <DialogHeader className="sr-only">
            <DialogTitle>Certificat Ndara Afrique</DialogTitle>
            <DialogDescription>Diplôme officiel de {studentName}</DialogDescription>
        </DialogHeader>
        
        {/* Zone d'aperçu centrée */}
        <div className="w-full flex-1 flex items-center justify-center p-4 md:p-8 overflow-hidden min-h-[600px]">
            <div 
                style={{ 
                    transform: `scale(${scale})`, 
                    transformOrigin: 'center center',
                    width: '1123px',
                    height: '794px',
                }}
                className="shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex-shrink-0"
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

        {/* Pied de page fixe */}
        <div className="w-full p-6 bg-slate-900/95 backdrop-blur-xl border-t border-white/10 sticky bottom-0 z-50">
            <div className="max-w-3xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Button 
                    onClick={handleDownloadPDF}
                    disabled={isDownloading}
                    className="h-14 rounded-2xl bg-white text-slate-900 hover:bg-slate-100 font-black uppercase text-xs tracking-widest shadow-xl active:scale-95 transition-all"
                >
                    {isDownloading ? <Loader2 className="mr-3 h-5 w-5 animate-spin" /> : <Download className="mr-3 h-5 w-5" />}
                    TÉLÉCHARGER (PDF)
                </Button>
                <Button 
                    onClick={handleWhatsAppShare}
                    className="h-14 rounded-2xl bg-[#25D366] hover:bg-[#25D366]/90 text-white font-black uppercase text-xs tracking-widest shadow-xl active:scale-95 transition-all"
                >
                    <Share2 className="mr-3 h-5 w-5" />
                    PARTAGER WHATSAPP
                </Button>
            </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
