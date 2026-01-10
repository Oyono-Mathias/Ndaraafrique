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
    <footer className="bg-background-alt border-t text-foreground">
      <div className="container mx-auto px-4 py-12">
        <div className="mb-8">
            <Link href="/" className="flex items-center gap-2 mb-4">
                <Image src="/icon.svg" alt="FormaAfrique Logo" width={28} height={28} />
                <span className="font-bold text-lg text-foreground">FormaAfrique</span>
            </Link>
        </div>
        
        <div className="md:hidden">
            <Accordion type="multiple" className="w-full">
                <AccordionItem value="navigation">
                    <AccordionTrigger className="font-semibold">Navigation</AccordionTrigger>
                    <AccordionContent>
                        <ul className="space-y-3 pl-2">
                           <li><Link href="/search" className="text-muted-foreground hover:text-primary">Tous les cours</Link></li>
                            <li><Link href="/devenir-instructeur" className="text-muted-foreground hover:text-primary">Devenir Formateur</Link></li>
                            <li><Link href="/tutor" className="text-muted-foreground hover:text-primary">Tuteur IA</Link></li>
                        </ul>
                    </AccordionContent>
                </AccordionItem>
                <AccordionItem value="legal">
                    <AccordionTrigger className="font-semibold">Légal</AccordionTrigger>
                    <AccordionContent>
                         <ul className="space-y-3 pl-2">
                           <li><Link href="/mentions-legales" className="text-muted-foreground hover:text-primary">Mentions Légales</Link></li>
                           <li><Link href="/cgu" className="text-muted-foreground hover:text-primary">Conditions d'Utilisation</Link></li>
                        </ul>
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
            <div className="mt-6">
                <h3 className="font-semibold text-foreground mb-2">Langue</h3>
                <LanguageSelector />
            </div>
        </div>

        <div className="hidden md:grid md:grid-cols-12 gap-8">
          <div className="md:col-span-12 lg:col-span-5">
            <p className="text-sm max-w-md text-muted-foreground">
                La plateforme n°1 pour apprendre un métier. Accédez à nos formations gratuites et premium, conçues par des experts locaux pour le marché africain.
            </p>
          </div>
          <div className="md:col-span-6 lg:col-span-4 grid grid-cols-2 gap-8">
            <div>
              <h3 className="font-semibold text-foreground mb-4">Navigation</h3>
              <ul className="space-y-2 text-sm">
                <li><Link href="/search" className="text-muted-foreground hover:text-primary">Tous les cours</Link></li>
                <li><Link href="/devenir-instructeur" className="text-muted-foreground hover:text-primary">Devenir Formateur</Link></li>
                <li><Link href="/tutor" className="text-muted-foreground hover:text-primary">Tuteur IA</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-4">Légal</h3>
              <ul className="space-y-2 text-sm">
                  <li><Link href="/mentions-legales" className="text-muted-foreground hover:text-primary">Mentions Légales</Link></li>
                  <li><Link href="/cgu" className="text-muted-foreground hover:text-primary">Conditions d'Utilisation</Link></li>
              </ul>
            </div>
          </div>
           <div className="md:col-span-6 lg:col-span-3">
              <h3 className="font-semibold text-foreground mb-4">Langue</h3>
              <LanguageSelector />
          </div>
        </div>
        <div className="mt-12 pt-8 border-t flex flex-col md:flex-row justify-between items-center gap-6">
             <div className="flex items-center gap-4">
                  <a href="#" className="text-muted-foreground hover:text-foreground"><Twitter className="h-5 w-5" /></a>
                  <a href="#" className="text-muted-foreground hover:text-foreground"><Youtube className="h-5 w-5" /></a>
                  <a href="#" className="text-muted-foreground hover:text-foreground"><Linkedin className="h-5 w-5" /></a>
              </div>
            <p className="text-sm text-muted-foreground">&copy; {new Date().getFullYear()} FormaAfrique. Tous droits réservés.</p>
        </div>
      </div>
    </footer>
  );
}
