
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Twitter, Youtube, Linkedin } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-slate-900 border-t border-slate-800 text-slate-400">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          <div className="md:col-span-12 lg:col-span-5">
            <Link href="/" className="flex items-center gap-2 mb-4">
                <Image src="/icon.svg" alt="FormaAfrique Logo" width={28} height={28} />
                <span className="font-bold text-lg text-white">FormaAfrique</span>
            </Link>
            <p className="text-sm max-w-md">
                La plateforme n°1 pour apprendre un métier. Accédez à nos formations gratuites et premium, conçues par des experts locaux pour le marché africain.
            </p>
          </div>
          <div className="md:col-span-6 lg:col-span-4 grid grid-cols-2 gap-8">
            <div>
              <h3 className="font-semibold text-white mb-4">Navigation</h3>
              <ul className="space-y-2 text-sm">
                <li><Link href="/search" className="hover:text-primary">Tous les cours</Link></li>
                <li><Link href="/devenir-instructeur" className="hover:text-primary">Devenir Formateur</Link></li>
                <li><Link href="/tutor" className="hover:text-primary">Tuteur IA</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-white mb-4">Légal</h3>
              <ul className="space-y-2 text-sm">
                  <li><Link href="/mentions-legales" className="hover:text-primary">Mentions Légales</Link></li>
                  <li><Link href="/cgu" className="hover:text-primary">Conditions d'Utilisation</Link></li>
              </ul>
            </div>
          </div>
           <div className="md:col-span-6 lg:col-span-3">
              <h3 className="font-semibold text-white mb-4">Suivez-nous</h3>
              <div className="flex items-center gap-4">
                  <Link href="#" className="hover:text-white"><Twitter className="h-5 w-5" /></Link>
                  <Link href="#" className="hover:text-white"><Youtube className="h-5 w-5" /></Link>
                  <Link href="#" className="hover:text-white"><Linkedin className="h-5 w-5" /></Link>
              </div>
          </div>
        </div>
        <div className="mt-8 pt-8 border-t border-slate-800 text-center text-sm text-slate-500">
            <p>© {new Date().getFullYear()} FormaAfrique. Tous droits réservés.</p>
        </div>
      </div>
    </footer>
  );
}
