
'use client';

import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, Share2, Trophy } from 'lucide-react';
import confetti from 'canvas-confetti';

interface CourseCompletionModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseName: string;
  studentName: string;
  onDownload: () => void;
  onShare: () => void;
}

export function CourseCompletionModal({
  isOpen,
  onClose,
  courseName,
  studentName,
  onDownload,
  onShare,
}: CourseCompletionModalProps) {
  const { t } = useTranslation();

  useEffect(() => {
    if (isOpen) {
      // Trigger confetti when the modal opens
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        zIndex: 10000,
      });
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md text-center p-8 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
        <DialogHeader className="items-center">
          <div className="relative mb-4">
            <Trophy className="h-20 w-20 text-amber-400" />
            <div className="absolute inset-0 bg-amber-400/20 rounded-full blur-xl -z-10 animate-pulse"></div>
          </div>
          <DialogTitle className="text-2xl font-bold text-slate-900 dark:text-white">
            {t('course_complete_title', { studentName })}
          </DialogTitle>
          <DialogDescription className="text-slate-500 dark:text-slate-400">
            {t('course_complete_desc')}
             <span className="font-semibold text-slate-600 dark:text-slate-300 block mt-1">"{courseName}"</span>
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 pt-4">
            <Button size="lg" className="h-12 text-base font-bold" onClick={onDownload}>
                <Download className="mr-2 h-5 w-5"/>
                {t('download_certificate')}
            </Button>
            <Button variant="link" onClick={onShare} className="text-primary dark:text-blue-400">
                <Share2 className="mr-2 h-4 w-4"/>
                {t('share_success')}
            </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
