
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
            <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
            
            <div className="space-y-4 md:col-span-2">
                <Link href="/" className="flex items-center gap-3 mb-4 group">
                    <Image src="/icon.svg" alt="Ndara Afrique Logo" width={48} height={48} className="h-14 w-auto" />
                    <h3 className="text-2xl font-bold text-white group-hover:text-primary transition-colors">Ndara Afrique</h3>
                </Link>
                <p className="text-gray-400 text-sm leading-relaxed max-w-xs">
                L'excellence par le savoir. La plateforme panafricaine pour les leaders de demain.
                </p>
            </div>

            <div>
                <h4 className="font-bold text-white mb-6 text-xs uppercase tracking-widest">Navigation</h4>
                <ul className="space-y-3 text-gray-400 text-sm">
                <li><Link href="/" className="hover:text-blue-500 cursor-pointer transition">Accueil</Link></li>
                <li><Link href="/search" className="hover:text-blue-500 cursor-pointer transition">Cours</Link></li>
                <li><Link href="/about" className="hover:text-blue-500 cursor-pointer transition">À propos</Link></li>
                </ul>
            </div>

            <div>
                <h4 className="font-bold text-white mb-6 text-xs uppercase tracking-widest">Légal</h4>
                <ul className="space-y-3 text-gray-400 text-sm">
                    <li><Link href="/cgu" className="hover:text-blue-500 cursor-pointer transition">Conditions d'Utilisation</Link></li>
                    <li><Link href="/mentions-legales" className="hover:text-blue-500 cursor-pointer transition">Politique de Confidentialité</Link></li>
                    <li><a href="mailto:support@ndara-afrique.com" className="hover:text-blue-500 cursor-pointer transition">Nous Contacter</a></li>
                </ul>
            </div>
            </div>

            <div className="pt-8 border-t border-white/5 flex flex-col sm:flex-row justify-between items-center gap-6">
                 <div className="flex gap-6">
                    <a href="#" aria-label="Facebook" className="text-gray-400 hover:text-white cursor-pointer transition"><Facebook className="h-5 w-5"/></a>
                    <a href="#" aria-label="LinkedIn" className="text-gray-400 hover:text-white cursor-pointer transition"><Linkedin className="h-5 w-5"/></a>
                    <a href="#" aria-label="WhatsApp" className="text-gray-400 hover:text-white cursor-pointer transition"><WhatsAppIcon className="h-5 w-5"/></a>
                </div>
                <p className="text-gray-500 text-xs text-center sm:text-right">© {new Date().getFullYear()} Ndara Afrique. Tous droits réservés.</p>
            </div>
        </div>
    </footer>
  );
}
