
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Facebook, Linkedin } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const WhatsAppIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M12.04 2.01C6.58 2.01 2.13 6.46 2.13 12.02c0 1.76.46 3.45 1.32 4.94L2.05 22l5.3-1.4c1.42.82 3.02 1.28 4.69 1.28h.01c5.46 0 9.91-4.45 9.91-9.91s-4.45-9.9-9.91-9.9zM12.04 20.2c-1.45 0-2.84-.38-4.06-1.08l-.3-.18-3.03.8.82-2.96-.2-.32a8.03 8.03 0 01-1.23-4.45c0-4.43 3.6-8.03 8.03-8.03s8.03 3.6 8.03 8.03-3.6 8.02-8.03 8.02zm4.45-6.21c-.24-.12-1.42-.7-1.64-.78-.22-.08-.38-.12-.54.12-.16.24-.62.78-.76.94-.14.16-.28.18-.52.06-.24-.12-1.02-.38-1.94-1.2-1.25-.87-1.57-1.6-1.61-1.72-.04-.12 0-.18.11-.3.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.3-.74-1.78-.2-.48-.4-.42-.54-.42h-.47c-.16 0-.42.06-.64.3.22.24-.88.85-.88,2.07s.9,2.4,1.02,2.56c.12.16,1.78,2.73,4.31,3.8.59.25,1.05.4,1.41.52.6.2,1.14.16,1.56.1.48-.07,1.42-.58,1.62-1.14.2-.56.2-1.04.14-1.14-.06-.1-.22-.16-.46-.28z"></path>
    </svg>
);

export function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="mt-20 border-t border-white/10 bg-black/40 backdrop-blur-md pt-16 pb-8">
      <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-12 mb-16">
        
        {/* Colonne Logo & Slogan */}
        <div className="flex flex-col gap-4">
          <h3 className="text-2xl font-bold text-white">Ndara Afrique</h3>
          <p className="text-gray-400 text-sm leading-relaxed max-w-xs">
            L'excellence par le savoir. La plateforme panafricaine pour les leaders de demain.
          </p>
        </div>

        {/* Colonne Navigation */}
        <div>
          <h4 className="font-bold text-white mb-6 uppercase tracking-widest text-xs">Navigation</h4>
          <ul className="space-y-4 text-gray-400 text-sm">
            <li><Link href="/" className="hover:text-blue-400 cursor-pointer transition">Accueil</Link></li>
            <li><Link href="/search" className="hover:text-blue-400 cursor-pointer transition">Cours</Link></li>
            <li><Link href="/about" className="hover:text-blue-400 cursor-pointer transition">À propos</Link></li>
          </ul>
        </div>

        {/* Colonne Contact & Social */}
        <div>
          <h4 className="font-bold text-white mb-6 uppercase tracking-widest text-xs">Contact & Suivez-nous</h4>
          <p className="text-gray-400 text-sm mb-6 hover:text-blue-400 transition"><a href="mailto:support@ndara-afrique.com">support@ndara-afrique.com</a></p>
          <div className="flex gap-6">
            <a href="#" aria-label="Facebook" className="text-gray-400 hover:text-white cursor-pointer transition"><Facebook className="h-6 w-6"/></a>
            <a href="#" aria-label="LinkedIn" className="text-gray-400 hover:text-white cursor-pointer transition"><Linkedin className="h-6 w-6"/></a>
            <a href="#" aria-label="WhatsApp" className="text-gray-400 hover:text-white cursor-pointer transition"><WhatsAppIcon className="h-6 w-6"/></a>
          </div>
        </div>

      </div>

      {/* Ligne Copyright */}
      <div className="text-center pt-8 border-t border-white/5">
        <p className="text-gray-500 text-xs">© {new Date().getFullYear()} Ndara Afrique. Tous droits réservés.</p>
      </div>
    </footer>
  );
}
