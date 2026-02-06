
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Facebook, Linkedin } from 'lucide-react';
import { WhatsAppIcon } from '../icons/WhatsAppIcon';
import { useDoc } from '@/firebase';
import { doc, getFirestore } from 'firebase/firestore';
import { useMemo } from 'react';
import type { Settings } from '@/lib/types';

export function Footer() {
  const db = getFirestore();
  const settingsRef = useMemo(() => doc(db, 'settings', 'global'), [db]);
  const { data: settings } = useDoc<Settings>(settingsRef);

  // ✅ Correction Branding Forcée
  const fetchedName = settings?.general?.siteName || '';
  const siteName = (fetchedName.includes('Forma') || !fetchedName) ? 'Ndara Afrique' : fetchedName;
  const logoUrl = settings?.general?.logoUrl || '/logo.png';

  return (
    <footer className="mt-32 border-t border-border/40 bg-muted/20 pt-20 pb-12">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 gap-16 md:grid-cols-4">
          {/* Brand */}
          <div className="md:col-span-2">
            <Link href="/" className="flex items-center gap-3 group mb-6">
              <div className="relative w-10 h-10 overflow-hidden rounded-xl shadow-lg bg-primary/20 flex items-center justify-center border border-white/10">
                <Image 
                    src={logoUrl} 
                    alt={`${siteName} Logo`} 
                    width={40} 
                    height={40} 
                    className="object-contain"
                />
              </div>
              <span className="text-2xl font-bold tracking-tighter text-white">
                {siteName}
              </span>
            </Link>
            <p className="text-muted-foreground max-w-sm leading-relaxed text-lg italic">
              "Le savoir est une richesse qui s'accroît quand on la partage."
            </p>
          </div>

          {/* Links */}
          <div className="space-y-6">
            <h4 className="font-serif text-xl text-foreground">Navigation</h4>
            <ul className="space-y-4 text-sm font-medium">
              <li><Link href="/search" className="text-muted-foreground hover:text-primary transition-colors">Explorer les cours</Link></li>
              <li><Link href="/abonnements" className="text-muted-foreground hover:text-primary transition-colors">Nos Tarifs</Link></li>
              <li><Link href="/investir" className="text-primary font-bold hover:underline transition-colors">Investir sur Ndara</Link></li>
              <li><Link href="/about" className="text-muted-foreground hover:text-primary transition-colors">À propos</Link></li>
            </ul>
          </div>

          {/* Legal */}
          <div className="space-y-6">
            <h4 className="font-serif text-xl text-foreground">Légal</h4>
            <ul className="space-y-4 text-sm font-medium">
              <li><Link href="/cgu" className="text-muted-foreground hover:text-primary transition-colors">Conditions d'Utilisation</Link></li>
              <li><Link href="/mentions-legales" className="text-muted-foreground hover:text-primary transition-colors">Confidentialité</Link></li>
              <li><a href={`mailto:${settings?.general?.contactEmail || 'contact@ndara-afrique.com'}`} className="text-muted-foreground hover:text-primary transition-colors">Contact</a></li>
            </ul>
          </div>
        </div>

        <div className="mt-20 pt-8 border-t border-border/40 flex flex-col-reverse items-center justify-between gap-8 sm:flex-row">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60">
            © {new Date().getFullYear()} {siteName}. Fait avec passion pour le continent.
          </p>
          <div className="flex gap-6">
            <a href="#" className="text-muted-foreground hover:text-primary transition-all hover:scale-110"><Facebook className="h-5 w-5"/></a>
            <a href="#" className="text-muted-foreground hover:text-primary transition-all hover:scale-110"><Linkedin className="h-5 w-5"/></a>
            <a href="#" className="text-muted-foreground hover:text-primary transition-all hover:scale-110"><WhatsAppIcon className="h-5 w-5"/></a>
          </div>
        </div>
      </div>
    </footer>
  );
}
