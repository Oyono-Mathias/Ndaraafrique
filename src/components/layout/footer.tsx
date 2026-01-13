
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Facebook, Linkedin } from 'lucide-react';
import { LanguageSelector } from './language-selector';
import { useTranslation } from 'react-i18next';

const WhatsAppIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M12.04 2.01C6.58 2.01 2.13 6.46 2.13 12.02c0 1.76.46 3.45 1.32 4.94L2.05 22l5.3-1.4c1.42.82 3.02 1.28 4.69 1.28h.01c5.46 0 9.91-4.45 9.91-9.91s-4.45-9.9-9.91-9.9zM12.04 20.2c-1.45 0-2.84-.38-4.06-1.08l-.3-.18-3.03.8.82-2.96-.2-.32a8.03 8.03 0 01-1.23-4.45c0-4.43 3.6-8.03 8.03-8.03s8.03 3.6 8.03 8.03-3.6 8.02-8.03 8.02zm4.45-6.21c-.24-.12-1.42-.7-1.64-.78-.22-.08-.38-.12-.54.12-.16.24-.62.78-.76.94-.14.16-.28.18-.52.06-.24-.12-1.02-.38-1.94-1.2-1.25-.87-1.57-1.6-1.61-1.72-.04-.12 0-.18.11-.3.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.3-.74-1.78-.2-.48-.4-.42-.54-.42h-.47c-.16 0-.42.06-.64.3.22.24-.88.85-.88,2.07s.9,2.4,1.02,2.56c.12.16,1.78,2.73,4.31,3.8.59.25,1.05.4,1.41.52.6.2,1.14.16,1.56.1.48-.07,1.42-.58,1.62-1.14.2-.56.2-1.04.14-1.14-.06-.1-.22-.16-.46-.28z"></path>
    </svg>
);


export function Footer({ onBecomeInstructorClick }: { onBecomeInstructorClick?: (e: React.MouseEvent) => void }) {
  const { t } = useTranslation();

  return (
    <footer className="footer-container">
      <div className="container mx-auto px-4">
        
        <div className="grid md:grid-cols-12 gap-8">
          <div className="md:col-span-12 lg:col-span-5">
             <Link href="/" className="footer-brand flex items-center gap-2">
                <Image src="/icon.svg" alt="Ndara Afrique Logo" width={32} height={32} />
                <span>Ndara Afrique</span>
            </Link>
            <p className="text-sm max-w-md">
                {t('footer_subtitle')}
            </p>
          </div>
          <div className="md:col-span-7 lg:col-span-7 grid grid-cols-2 md:grid-cols-3 gap-8">
            <div>
              <h3 className="font-semibold text-slate-200 mb-4">{t('footer_links')}</h3>
              <ul className="space-y-2 text-sm">
                <li><Link href="/" className="footer-link">{t('footer_home')}</Link></li>
                <li><Link href="/search" className="footer-link">{t('footer_catalog')}</Link></li>
                <li><Link href="/devenir-instructeur" onClick={onBecomeInstructorClick} className="footer-link">{t('footer_instructors')}</Link></li>
              </ul>
            </div>
             <div>
              <h3 className="font-semibold text-slate-200 mb-4">{t('footer_help')}</h3>
              <ul className="space-y-2 text-sm">
                  <li><Link href="/admin/faq" className="footer-link">{t('footer_faq')}</Link></li>
                  <li><Link href="/questions-reponses" className="footer-link">{t('footer_contact')}</Link></li>
                  <li><Link href="/questions-reponses" className="footer-link">{t('footer_support')}</Link></li>
              </ul>
            </div>
             <div>
              <h3 className="font-semibold text-slate-200 mb-4">{t('footer_legal')}</h3>
              <ul className="space-y-2 text-sm">
                  <li><Link href="/mentions-legales" className="footer-link">{t('footer_legal_notice')}</Link></li>
                  <li><Link href="/cgu" className="footer-link">{t('footer_terms')}</Link></li>
              </ul>
            </div>
          </div>
        </div>
        <div className="copyright">
             <div className="flex items-center justify-center gap-6 mb-6">
                  <a href="#" className="text-slate-400 hover:text-primary"><Facebook className="h-6 w-6" /></a>
                  <a href="#" className="text-slate-400 hover:text-primary"><WhatsAppIcon className="h-6 w-6" /></a>
                  <a href="#" className="text-slate-400 hover:text-primary"><Linkedin className="h-6 w-6" /></a>
              </div>
            <p>{t('footer_copyright')}</p>
        </div>
      </div>
    </footer>
  );
}
