'use client';

import React, { useRef, useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Share2, Download, Loader2, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { CertificatePremium } from '../CertificatePremium';
import { ReviewForm } from '../reviews/review-form';

interface CertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseName: string;
  studentName?: string;
  instructorName: string;
  completionDate: Date;
  certificateId: string;
  courseId: string;
  userId: string;
}

export function CertificateModal({ 
    isOpen, 
    onClose, 
    courseName, 
    studentName = "Cher Ndara", 
    instructorName, 
    completionDate, 
    certificateId,
    courseId,
    userId
}: CertificateModalProps) {
  
  const certificateRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [scale, setScale] = useState(1);
  const verificationUrl = typeof window !== 'undefined' ? `${window.location.origin}/verify/${certificateId}` : '';
  const formattedDate = format(completionDate, 'dd MMMM yyyy', { locale: fr });

  useEffect(() => {
    const handleResize = () => {
      if (typeof window === 'undefined') return;
      const width = window.innerWidth;
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
      const originalElement = certificateRef.current;
      const clone = originalElement.cloneNode(true) as HTMLDivElement;
      
      clone.style.position = 'fixed';
      clone.style.left = '-9999px';
      clone.style.top = '0';
      clone.style.transform = 'none';
      clone.style.width = '1123px';
      clone.style.height = '794px';
      clone.style.visibility = 'visible';
      clone.style.zIndex = '-1';
      
      document.body.appendChild(clone);

      const canvas = await html2canvas(clone, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#fdfcf7',
        width: 1123,
        height: 794,
        windowWidth: 1123,
        windowHeight: 794
      });

      document.body.removeChild(clone);

      const imgData = canvas.toDataURL('image/png', 1.0);
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

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
      <DialogContent className="max-w-screen-2xl p-0 border-0 bg-slate-950/95 shadow-none overflow-y-auto max-h-[98vh] flex flex-col items-center">
        <DialogHeader className="sr-only">
            <DialogTitle>Certificat Ndara Afrique</DialogTitle>
            <DialogDescription>Diplôme officiel de {studentName}</DialogDescription>
        </DialogHeader>
        
        <div className="w-full flex-1 flex flex-col items-center p-4 md:p-8 overflow-hidden min-h-[600px]">
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

            {/* Section Avis - Apparition douce après l'affichage du certificat */}
            <div className="mt-12 w-full max-w-xl animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-500">
                {!showReview ? (
                    <div className="bg-slate-900 border border-slate-800 p-8 rounded-[2.5rem] text-center space-y-4 shadow-2xl">
                        <div className="p-3 bg-primary/10 rounded-full inline-block">
                            <Star className="h-8 w-8 text-primary fill-primary" />
                        </div>
                        <h3 className="text-xl font-bold text-white uppercase tracking-tight">Votre avis compte !</h3>
                        <p className="text-slate-400 text-sm">Félicitations Ndara ! Aidez d'autres étudiants en partageant votre expérience sur ce cours.</p>
                        <Button onClick={() => setShowReview(true)} className="rounded-xl h-12 px-8 font-black uppercase text-[10px] tracking-widest bg-slate-800 hover:bg-slate-700">
                            Laisser un avis étoilé
                        </Button>
                    </div>
                ) : (
                    <div className="bg-slate-900 border border-slate-800 p-8 rounded-[2.5rem] shadow-2xl">
                        <ReviewForm courseId={courseId} userId={userId} onReviewSubmit={() => setShowReview(false)} />
                    </div>
                )}
            </div>
        </div>

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
