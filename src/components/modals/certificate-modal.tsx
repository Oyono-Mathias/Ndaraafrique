'use client';

/**
 * @fileOverview Modal de présentation du Certificat Ndara Afrique avec export PDF.
 * Design Premium Excellence fidèle à la maquette Ndara.
 */

import React, { useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Award, Share2, ShieldCheck, Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

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
        scale: 2, // Augmente la qualité du PDF
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
        
        {/* --- LE CERTIFICAT PREMIUM EXCELLENCE (Capture Ref) --- */}
        <div 
          ref={certificateRef}
          className="relative w-full aspect-[1.414/1] bg-[#fdfcf7] shadow-[0_20px_50px_rgba(0,0,0,0.3)] overflow-hidden text-gray-900 font-sans mx-auto border-[12px] border-double border-[#e5c185] ring-1 ring-gray-200"
        >
          {/* Motif Guillochis */}
          <div className="absolute inset-0 opacity-[0.04] pointer-events-none">
            <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
              <pattern id="pattern-cert" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
                <path d="M30 0c15 15 45 15 60 0v60c-15-15-45-15-60 0V0z" fill="none" stroke="#b8860b" strokeWidth="0.5"/>
              </pattern>
              <rect x="0" y="0" width="100%" height="100%" fill="url(#pattern-cert)"/>
            </svg>
          </div>

          <div className="absolute inset-4 border-[2px] border-[#e5c185] opacity-40 pointer-events-none"></div>
          <div className="absolute inset-6 border-[1px] border-gray-300 pointer-events-none"></div>

          <div className="relative h-full flex flex-col items-center justify-between p-12 md:p-16 text-center z-10">
            <div className="space-y-4">
              <h1 className="text-3xl md:text-5xl font-serif font-bold tracking-[0.1em] text-gray-800 uppercase">
                Certificat d'Accomplissement
              </h1>
              <p className="text-[10px] md:text-xs uppercase tracking-[0.4em] text-gray-500 font-black">
                Ndara Afrique • Plateforme d'Excellence
              </p>
            </div>

            <div className="w-full flex flex-col items-center space-y-6">
              <p className="text-base md:text-lg text-gray-600 italic font-serif">
                Ce document atteste officiellement que
              </p>
              <div className="relative inline-block px-12 py-2 border-b-2 border-[#e5c185]">
                <h2 className="text-4xl md:text-6xl font-serif font-black text-gray-900 capitalize tracking-tight">
                  {studentName}
                </h2>
              </div>
              <p className="text-sm md:text-base text-gray-600 max-w-2xl leading-relaxed">
                a validé avec succès l'ensemble des modules de la formation de haut niveau :
              </p>
              <h3 className="text-xl md:text-3xl font-bold text-gray-900 uppercase tracking-wide px-8">
                "{courseName}"
              </h3>
            </div>

            <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-8 items-end mt-8">
              <div className="text-left space-y-1">
                <div>
                    <p className="text-[9px] text-gray-400 uppercase font-black tracking-widest">Délivré le</p>
                    <p className="font-bold text-gray-800 text-sm">{formattedDate}</p>
                </div>
                <div className="pt-4">
                    <p className="text-[9px] text-gray-400 uppercase font-black tracking-widest">ID Unique</p>
                    <p className="font-mono text-[10px] text-[#b8860b] font-bold">{certificateId.toUpperCase()}</p>
                </div>
              </div>

              <div className="flex justify-center">
                 <div className="relative">
                    <div className="w-28 h-28 border-[6px] border-double border-[#e5c185] rounded-full flex items-center justify-center p-1 bg-white/80 shadow-xl">
                        <div className="w-full h-full border-2 border-dashed border-[#e5c185] rounded-full flex flex-col items-center justify-center text-center">
                            <span className="text-[7px] font-black text-[#8b6b3a] leading-tight uppercase tracking-tighter">
                                SCEAU OFFICIEL<br/>
                                <span className="text-[14px]">NDARA</span><br/>
                                AFRIQUE
                            </span>
                        </div>
                    </div>
                 </div>
              </div>
              
              <div className="flex justify-between md:justify-end gap-12">
                <div className="text-center space-y-2">
                   <div className="h-12 w-32 border-b border-gray-300 flex items-end justify-center italic font-serif text-2xl text-gray-600 pb-1">
                      Saleh
                   </div>
                   <p className="text-[9px] font-black uppercase text-gray-800 tracking-tighter leading-none">CEO, Fondateur</p>
                </div>
                <div className="text-center space-y-2">
                   <div className="h-12 w-32 border-b border-gray-300 flex items-end justify-center italic font-serif text-2xl text-gray-600 pb-1">
                      Directeur P.
                   </div>
                   <p className="text-[9px] font-black uppercase text-gray-800 tracking-tighter leading-none">Directeur Pédago</p>
                </div>
              </div>
            </div>
          </div>

          <div className="absolute bottom-0 w-full bg-white/60 border-t border-gray-100 py-2 text-center text-[8px] font-bold text-gray-400 uppercase tracking-[0.3em]">
            Authenticité vérifiable numériquement sur : {verificationUrl}
          </div>
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