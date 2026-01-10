'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Twitter, Youtube, Linkedin } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { LanguageSelector } from './language-selector';


export function Footer() {
  return (
    <footer className="bg-slate-100 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-300">
      <div className="container mx-auto px-4 py-12">
        <div className="mb-8 md:hidden">
            <Link href="/" className="flex items-center gap-2 mb-4">
                <Image src="/icon.svg" alt="FormaAfrique Logo" width={28} height={28} />
                <span className="font-bold text-lg text-primary">FormaAfrique</span>
            </Link>
        </div>
        
        <div className="md:hidden">
            <Accordion type="multiple" className="w-full">
                <AccordionItem value="navigation">
                    <AccordionTrigger className="font-semibold text-slate-800 dark:text-slate-200">Navigation</AccordionTrigger>
                    <AccordionContent>
                        <ul className="space-y-3 pl-2">
                           <li><Link href="/search" className="text-slate-600 dark:text-slate-400 hover:text-primary">Tous les cours</Link></li>
                            <li><Link href="/devenir-instructeur" className="text-slate-600 dark:text-slate-400 hover:text-primary">Devenir Formateur</Link></li>
                            <li><Link href="/tutor" className="text-slate-600 dark:text-slate-400 hover:text-primary">Tuteur IA</Link></li>
                        </ul>
                    </AccordionContent>
                </AccordionItem>
                <AccordionItem value="legal">
                    <AccordionTrigger className="font-semibold text-slate-800 dark:text-slate-200">Légal</AccordionTrigger>
                    <AccordionContent>
                         <ul className="space-y-3 pl-2">
                           <li><Link href="/mentions-legales" className="text-slate-600 dark:text-slate-400 hover:text-primary">Mentions Légales</Link></li>
                           <li><Link href="/cgu" className="text-slate-600 dark:text-slate-400 hover:text-primary">Conditions d'Utilisation</Link></li>
                        </ul>
                    </AccordionContent>
                </AccordionItem>
                 <AccordionItem value="ressources">
                    <AccordionTrigger className="font-semibold text-slate-800 dark:text-slate-200">Ressources</AccordionTrigger>
                    <AccordionContent>
                         <ul className="space-y-3 pl-2">
                           <li><a href="#" className="text-slate-600 dark:text-slate-400 hover:text-primary">Blog</a></li>
                           <li><a href="#" className="text-slate-600 dark:text-slate-400 hover:text-primary">Support</a></li>
                        </ul>
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
        </div>

        <div className="hidden md:grid md:grid-cols-12 gap-8">
          <div className="md:col-span-12 lg:col-span-5">
             <Link href="/" className="flex items-center gap-2 mb-4">
                <Image src="/icon.svg" alt="FormaAfrique Logo" width={28} height={28} />
                <span className="font-bold text-lg text-primary">FormaAfrique</span>
            </Link>
            <p className="text-sm max-w-md text-slate-600 dark:text-slate-400">
                La plateforme n°1 pour apprendre un métier. Accédez à nos formations gratuites et premium, conçues par des experts locaux pour le marché africain.
            </p>
          </div>
          <div className="md:col-span-6 lg:col-span-4 grid grid-cols-2 gap-8">
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-slate-200 mb-4">Navigation</h3>
              <ul className="space-y-2 text-sm">
                <li><Link href="/search" className="text-slate-600 dark:text-slate-400 hover:text-primary">Tous les cours</Link></li>
                <li><Link href="/devenir-instructeur" className="text-slate-600 dark:text-slate-400 hover:text-primary">Devenir Formateur</Link></li>
                <li><Link href="/tutor" className="text-slate-600 dark:text-slate-400 hover:text-primary">Tuteur IA</Link></li>
              </ul>
            </div>
             <div>
              <h3 className="font-semibold text-slate-900 dark:text-slate-200 mb-4">Ressources</h3>
              <ul className="space-y-2 text-sm">
                  <li><a href="#" className="text-slate-600 dark:text-slate-400 hover:text-primary">Blog</a></li>
                  <li><a href="#" className="text-slate-600 dark:text-slate-400 hover:text-primary">Support</a></li>
                   <li><Link href="/mentions-legales" className="text-slate-600 dark:text-slate-400 hover:text-primary">Légal</Link></li>
                  <li><Link href="/cgu" className="text-slate-600 dark:text-slate-400 hover:text-primary">Conditions</Link></li>
              </ul>
            </div>
          </div>
           <div className="md:col-span-6 lg:col-span-3">
              <h3 className="font-semibold text-slate-900 dark:text-slate-200 mb-4">Langue</h3>
              <LanguageSelector />
          </div>
        </div>
        <div className="mt-12 pt-8 border-t border-slate-200 dark:border-slate-800 flex flex-col md:flex-row justify-between items-center gap-6">
             <div className="flex items-center gap-4">
                  <a href="#" className="text-slate-500 hover:text-slate-900 dark:hover:text-white"><Twitter className="h-5 w-5" /></a>
                  <a href="#" className="text-slate-500 hover:text-slate-900 dark:hover:text-white"><Youtube className="h-5 w-5" /></a>
                  <a href="#" className="text-slate-500 hover:text-slate-900 dark:hover:text-white"><Linkedin className="h-5 w-5" /></a>
              </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">&copy; {new Date().getFullYear()} FormaAfrique. Tous droits réservés.</p>
        </div>
      </div>
    </footer>
  );
}
