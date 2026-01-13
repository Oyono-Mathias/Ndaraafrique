
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Facebook, Linkedin } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { WhatsAppIcon } from '../icons/WhatsAppIcon';

export function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="mt-32 border-t border-white/10 bg-[#020617] pt-16 pb-8">
        <div className="max-w-6xl mx-auto px-6">
            {/* Grille principale */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-16">
            
            {/* 1. Branding */}
            <div className="space-y-4">
                <h3 className="text-2xl font-bold text-white">Ndara Afrique</h3>
                <p className="text-gray-400 text-sm leading-relaxed max-w-xs">
                L'excellence par le savoir. La plateforme panafricaine pour les leaders de demain.
                </p>
            </div>

            {/* 2. Navigation */}
            <div>
                <h4 className="font-bold text-white mb-6 text-xs uppercase tracking-widest">Navigation</h4>
                <ul className="space-y-3 text-gray-400 text-sm">
                <li><Link href="/" className="hover:text-blue-500 cursor-pointer transition">Accueil</Link></li>
                <li><Link href="/search" className="hover:text-blue-500 cursor-pointer transition">Cours</Link></li>
                <li><Link href="/about" className="hover:text-blue-500 cursor-pointer transition">À propos</Link></li>
                </ul>
            </div>

            {/* 3. Contact & Réseaux */}
            <div>
                <h4 className="font-bold text-white mb-6 text-xs uppercase tracking-widest">Contact & Suivez-nous</h4>
                <p className="text-gray-400 text-sm mb-6 hover:text-blue-400 transition"><a href="mailto:support@ndara-afrique.com">support@ndara-afrique.com</a></p>
                <div className="flex gap-6">
                    <a href="#" aria-label="Facebook" className="text-gray-400 hover:text-white cursor-pointer transition"><Facebook className="h-6 w-6"/></a>
                    <a href="#" aria-label="LinkedIn" className="text-gray-400 hover:text-white cursor-pointer transition"><Linkedin className="h-6 w-6"/></a>
                    <a href="#" aria-label="WhatsApp" className="text-gray-400 hover:text-white cursor-pointer transition"><WhatsAppIcon className="h-6 w-6"/></a>
                </div>
            </div>
            </div>

            {/* Ligne de copyright - Tout en bas */}
            <div className="pt-8 border-t border-white/5 text-center">
            <p className="text-gray-500 text-xs">© {new Date().getFullYear()} Ndara Afrique. Tous droits réservés.</p>
            </div>
        </div>
    </footer>
  );
}
