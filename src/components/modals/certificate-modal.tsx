'use client';

/**
 * @fileOverview Modal de présentation du Certificat Ndara Afrique.
 * Gère la mise à l'échelle responsive pour mobile et l'export PDF haute qualité.
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

  // ✅ Logique de mise à l'échelle pour mobile
  useEffect(() => {
    const handleResize = () => {
      if (typeof window === 'undefined') return;
      const width = window.innerWidth;
      if (width < 640) {
        // Le certificat A4 fait 1123px de large en base. 
        // On calcule le ratio pour qu'il tienne dans l'écran moins les paddings.
        const newScale = (width - 48) / 1123; 
        setScale(newScale);
      } else {
        setScale(1);
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
      
      // On force le rendu temporairement à l'échelle 1 pour la capture
      const canvas = await html2canvas(element, {
        scale: 2, // Haute définition
        useCORS: true,
        logging: false,
        backgroundColor: '#fdfcf7',
        width: 1123, // Largeur A4 paysage standard en pixels 96dpi
        height: 794,
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
      <DialogContent className="max-w-6xl p-0 border-0 bg-slate-950/95 shadow-none overflow-hidden overflow-y-auto max-h-[98vh] custom-scrollbar">
        <DialogHeader className="sr-only">
            <DialogTitle>Certificat d'Accomplissement</DialogTitle>
            <DialogDescription>
            Certificat pour {courseName} décerné à {studentName}.
            </DialogDescription>
        </DialogHeader>
        
        {/* --- CONTENEUR DE PRÉVISUALISATION --- */}
        <div className="flex justify-center items-center py-8 px-4 overflow-hidden">
            <div 
                style={{ 
                    transform: `scale(${scale})`, 
                    transformOrigin: 'top center',
                    width: '1123px', // Largeur fixe pour le composant interne
                    height: `${794 * scale}px`, // Hauteur ajustée pour le flux flex
                    transition: 'transform 0.3s ease-out'
                }}
                className="flex-shrink-0"
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

        {/* --- ACTIONS --- */}
        <div className="flex flex-col gap-4 px-6 pb-12 mt-4 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-2xl mx-auto">
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
            
            <Button variant="ghost" onClick={onClose} className="text-slate-500 hover:text-white font-bold uppercase text-[10px] tracking-[0.3em] h-10">
                Fermer l'aperçu
            </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}