'use client';

import React, { useRef, useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Share2, Download, Loader2, Star, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { CertificatePremium } from '../CertificatePremium';
import { ReviewForm } from '../reviews/review-form';
import confetti from 'canvas-confetti';

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

/**
 * @fileOverview Modal de célébration et de délivrance du certificat.
 * Inclut l'export PDF HD et le partage social.
 */
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
    if (isOpen) {
        confetti({
            particleCount: 150,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#10b981', '#fbbf24', '#ffffff']
        });
    }
  }, [isOpen]);

  useEffect(() => {
    const handleResize = () => {
      if (typeof window === 'undefined') return;
      const width = window.innerWidth;
      // On ajuste l'échelle pour que le certificat A4 (1123px) rentre dans l'écran
      if (width < 1200) {
        setScale((width - 64) / 1123); 
      } else {
        setScale(0.8);
      }
    };

    if (isOpen) {
      handleResize();
      window.addEventListener('resize', handleResize);
    }
    return () => window.removeEventListener('resize', handleResize);
  }, [isOpen]);

  const handleWhatsAppShare = () => {
    const text = `🎉 Très fier(e) de mon nouveau certificat "${courseName}" obtenu sur Ndara Afrique ! 🚀\n\nVérifiez mon diplôme ici : ${verificationUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleDownloadPDF = async () => {
    if (!certificateRef.current) return;
    setIsDownloading(true);

    try {
      const element = certificateRef.current;
      
      // On utilise un clone caché pour garantir le rendu HD sans scrollbars
      const canvas = await html2canvas(element, {
        scale: 2, // Haute définition
        useCORS: true,
        logging: false,
        backgroundColor: '#fdfcf7',
        width: 1123,
        height: 794
      });

      const imgData = canvas.toDataURL('image/png', 1.0);
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'px',
        format: [1123, 794]
      });

      pdf.addImage(imgData, 'PNG', 0, 0, 1123, 794);
      pdf.save(`Certificat_Ndara_${studentName.replace(/\s/g, '_')}.pdf`);
      
    } catch (error) {
      console.error("PDF Export Error:", error);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-screen-2xl p-0 border-0 bg-slate-950/98 shadow-none overflow-y-auto max-h-[98vh] flex flex-col items-center no-scrollbar">
        <DialogHeader className="sr-only">
            <DialogTitle>Certificat Ndara Afrique</DialogTitle>
            <DialogDescription>Diplôme officiel de {studentName}</DialogDescription>
        </DialogHeader>
        
        <div className="w-full flex-1 flex flex-col items-center p-4 md:p-12 overflow-hidden min-h-screen">
            
            <div className="text-center mb-12 space-y-2 animate-in fade-in zoom-in duration-700">
                <div className="inline-block p-3 bg-primary/10 rounded-2xl mb-4">
                    <CheckCircle2 className="h-10 w-10 text-primary" />
                </div>
                <h2 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tight">Félicitations Ndara !</h2>
                <p className="text-slate-400 font-medium text-lg italic">"Le savoir est la clé de l'émergence."</p>
            </div>

            <div 
                style={{ 
                    transform: `scale(${scale})`, 
                    transformOrigin: 'top center',
                    width: '1123px',
                    height: '794px',
                }}
                className="shadow-[0_30px_100px_rgba(0,0,0,0.8)] flex-shrink-0 transition-transform duration-500"
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

            {/* Actions & Feedback */}
            <div className="mt-24 w-full max-w-2xl space-y-12 pb-32">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Button 
                        onClick={handleDownloadPDF}
                        disabled={isDownloading}
                        className="h-16 rounded-2xl bg-white text-slate-900 hover:bg-slate-100 font-black uppercase text-xs tracking-widest shadow-xl active:scale-95 transition-all"
                    >
                        {isDownloading ? <Loader2 className="mr-3 h-5 w-5 animate-spin" /> : <Download className="mr-3 h-5 w-5" />}
                        TÉLÉCHARGER LE PDF
                    </Button>
                    <Button 
                        onClick={handleWhatsAppShare}
                        className="h-16 rounded-2xl bg-[#25D366] hover:bg-[#25D366]/90 text-white font-black uppercase text-xs tracking-widest shadow-xl active:scale-95 transition-all"
                    >
                        <Share2 className="mr-3 h-5 w-5" />
                        PARTAGER SUR WHATSAPP
                    </Button>
                </div>

                {!showReview ? (
                    <div className="bg-slate-900 border border-slate-800 p-8 rounded-[2.5rem] text-center space-y-6 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-1000">
                        <div className="p-4 bg-amber-500/10 rounded-full inline-block">
                            <Star className="h-8 w-8 text-amber-500 fill-amber-500" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-xl font-bold text-white uppercase tracking-tight">Partagez votre réussite</h3>
                            <p className="text-slate-400 text-sm max-w-sm mx-auto leading-relaxed">
                                Qu'avez-vous pensé de cette formation ? Votre avis aide les autres Ndara à faire le bon choix.
                            </p>
                        </div>
                        <Button onClick={() => setShowReview(true)} variant="outline" className="rounded-xl h-12 px-8 font-black uppercase text-[10px] tracking-widest border-slate-800 hover:bg-slate-800">
                            Laisser un avis étoilé
                        </Button>
                    </div>
                ) : (
                    <div className="bg-slate-900 border border-slate-800 p-10 rounded-[3rem] shadow-2xl animate-in zoom-in duration-500">
                        <ReviewForm courseId={courseId} userId={userId} onReviewSubmit={() => setShowReview(false)} />
                    </div>
                )}
            </div>
        </div>

        <div className="fixed bottom-0 left-0 right-0 p-4 bg-slate-950/90 backdrop-blur-md border-t border-white/5 z-[100] text-center">
            <Button variant="ghost" onClick={onClose} className="font-bold text-slate-500 uppercase text-[10px] tracking-widest">
                Fermer l'aperçu
            </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
