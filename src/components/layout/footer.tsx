
'use client';

import { Link } from 'next-intl/navigation';
import Image from 'next/image';
import { Facebook, Linkedin } from 'lucide-react';
import { WhatsAppIcon } from '../icons/WhatsAppIcon';

export function Footer() {
  return (
    <footer className="mt-32 border-t border-slate-800 bg-background pt-16 pb-8">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 gap-12 text-center md:grid-cols-3 md:text-left">
          {/* Col 1: Branding */}
          <div className="flex flex-col items-center md:items-start">
            <Link href="/" className="flex items-center gap-3 group mb-4">
              <Image src="/icon.svg" alt="Ndara Afrique Logo" width={32} height={32} />
              <span className="text-xl font-bold text-white transition-colors group-hover:text-primary">
                Ndara Afrique
              </span>
            </Link>
            <p className="text-sm text-slate-400 max-w-xs">
              L'excellence par le savoir, pour l'Afrique de demain.
            </p>
          </div>

          {/* Col 2: Navigation */}
          <div>
            <h4 className="font-bold text-white mb-4 text-sm tracking-wider">Navigation</h4>
            <ul className="space-y-3 text-sm">
              <li><Link href="/search" className="text-slate-400 transition-colors hover:text-primary">Explorer les cours</Link></li>
              <li><Link href="/abonnements" className="text-slate-400 transition-colors hover:text-primary">Tarifs</Link></li>
              <li><Link href="/about" className="text-slate-400 transition-colors hover:text-primary">À propos de nous</Link></li>
            </ul>
          </div>

          {/* Col 3: Légal */}
          <div>
            <h4 className="font-bold text-white mb-4 text-sm tracking-wider">Légal</h4>
            <ul className="space-y-3 text-sm">
              <li><Link href="/cgu" className="text-slate-400 transition-colors hover:text-primary">Conditions d'Utilisation</Link></li>
              <li><Link href="/mentions-legales" className="text-slate-400 transition-colors hover:text-primary">Politique de Confidentialité</Link></li>
              <li><a href="mailto:support@ndara-afrique.com" className="text-slate-400 transition-colors hover:text-primary">Nous contacter</a></li>
            </ul>
          </div>
        </div>

        <div className="mt-16 pt-8 border-t border-slate-800 flex flex-col-reverse items-center justify-between gap-6 sm:flex-row">
          <p className="text-xs text-slate-500">© {new Date().getFullYear()} Ndara Afrique. Tous droits réservés.</p>
          <div className="flex gap-4">
            <a href="#" aria-label="Facebook" className="text-slate-400 transition-colors hover:text-white"><Facebook className="h-5 w-5"/></a>
            <a href="#" aria-label="LinkedIn" className="text-slate-400 transition-colors hover:text-white"><Linkedin className="h-5 w-5"/></a>
            <a href="#" aria-label="WhatsApp" className="text-slate-400 transition-colors hover:text-white"><WhatsAppIcon className="h-5 w-5"/></a>
          </div>
        </div>
      </div>
    </footer>
  );
}

    
