'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Facebook, Linkedin, Twitter, Instagram } from 'lucide-react';
import { WhatsAppIcon } from '../icons/WhatsAppIcon';
import { useDoc } from '@/firebase';
import { doc, getFirestore } from 'firebase/firestore';
import { useMemo } from 'react';
import type { Settings } from '@/lib/types';

export function Footer() {
  const db = getFirestore();
  const settingsRef = useMemo(() => doc(db, 'settings', 'global'), [db]);
  const { data: settings } = useDoc<Settings>(settingsRef);

  const siteName = settings?.general?.siteName || "Ndara Afrique";
  const logoUrl = settings?.general?.logoUrl || '/logo.png';
  const whatsapp = settings?.general?.supportPhone;

  return (
    <footer className="mt-20 border-t border-white/5 bg-slate-950 pt-20 pb-12">
      <div className="container mx-auto px-8">
        <div className="grid grid-cols-1 gap-16 md:grid-cols-4">
          {/* Brand */}
          <div className="md:col-span-2 space-y-6">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="relative w-9 h-9">
                <Image 
                    src={logoUrl} 
                    alt={`${siteName} Logo`} 
                    width={36} 
                    height={36} 
                    className="object-contain"
                />
              </div>
              <span className="text-2xl font-bold tracking-tighter text-white">
                {siteName}
              </span>
            </Link>
            <p className="text-slate-500 max-w-sm leading-relaxed text-sm italic">
              "Le savoir est une richesse qui s'accroît quand on la partage. Construisons ensemble l'excellence panafricaine."
            </p>
          </div>

          {/* Links */}
          <div className="space-y-6">
            <h4 className="font-black text-[10px] text-primary uppercase tracking-[0.3em]">Navigation</h4>
            <ul className="space-y-4 text-sm font-bold uppercase tracking-tight">
              <li><Link href="/search" className="text-slate-400 hover:text-white transition-colors">Explorer les cours</Link></li>
              <li><Link href="/abonnements" className="text-slate-400 hover:text-white transition-colors">Nos Tarifs</Link></li>
              <li><Link href="/investir" className="text-slate-400 hover:text-white transition-colors">Investir sur Ndara</Link></li>
              <li><Link href="/about" className="text-slate-400 hover:text-white transition-colors">À propos</Link></li>
            </ul>
          </div>

          {/* Legal */}
          <div className="space-y-6">
            <h4 className="font-black text-[10px] text-primary uppercase tracking-[0.3em]">Légal</h4>
            <ul className="space-y-4 text-sm font-bold uppercase tracking-tight">
              <li><Link href="/cgu" className="text-slate-400 hover:text-white transition-colors">Conditions d'Utilisation</Link></li>
              <li><Link href="/mentions-legales" className="text-slate-400 hover:text-white transition-colors">Confidentialité</Link></li>
              <li><a href={`mailto:${settings?.general?.contactEmail || 'contact@ndara-afrique.com'}`} className="text-slate-400 hover:text-white transition-colors">Contact</a></li>
            </ul>
          </div>
        </div>

        <div className="mt-20 pt-8 border-t border-white/5 flex flex-col-reverse items-center justify-between gap-8 sm:flex-row">
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-700 text-center">
            © {new Date().getFullYear()} {siteName}. Fait avec passion pour le continent.
          </p>
          <div className="flex gap-8">
            {settings?.general?.facebookUrl && (
              <a href={settings.general.facebookUrl} target="_blank" rel="noopener noreferrer" className="text-slate-600 hover:text-primary transition-all hover:scale-110"><Facebook className="h-5 w-5"/></a>
            )}
            {settings?.general?.linkedinUrl && (
              <a href={settings.general.linkedinUrl} target="_blank" rel="noopener noreferrer" className="text-slate-600 hover:text-primary transition-all hover:scale-110"><Linkedin className="h-5 w-5"/></a>
            )}
            {settings?.general?.twitterUrl && (
              <a href={settings.general.twitterUrl} target="_blank" rel="noopener noreferrer" className="text-slate-600 hover:text-primary transition-all hover:scale-110"><Twitter className="h-5 w-5"/></a>
            )}
            {settings?.general?.instagramUrl && (
              <a href={settings.general.instagramUrl} target="_blank" rel="noopener noreferrer" className="text-slate-600 hover:text-primary transition-all hover:scale-110"><Instagram className="h-5 w-5"/></a>
            )}
            {whatsapp && (
              <a href={`https://wa.me/${whatsapp.replace(/\+/g, '')}`} target="_blank" rel="noopener noreferrer" className="text-slate-600 hover:text-primary transition-all hover:scale-110"><WhatsAppIcon className="h-5 w-5"/></a>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
}
