'use client';

/**
 * @fileOverview Pied de page Ndara Afrique.
 * Redessiné pour correspondre au nouveau design de Qwen.
 */

import Link from 'next/link';
import Image from 'next/image';
import { Facebook, Linkedin, Twitter, Instagram, ArrowUpRight } from 'lucide-react';
import { WhatsAppIcon } from '../icons/WhatsAppIcon';
import { useDoc } from '@/firebase';
import { doc, getFirestore } from 'firebase/firestore';
import { useMemo } from 'react';
import type { Settings } from '@/lib/types';
import { useLocale } from 'next-intl';

export function Footer() {
  const db = getFirestore();
  const locale = useLocale();
  const settingsRef = useMemo(() => doc(db, 'settings', 'global'), [db]);
  const { data: settings } = useDoc<Settings>(settingsRef);

  const siteName = settings?.general?.siteName || "Ndara Afrique";
  const logoUrl = settings?.general?.logoUrl || '/logo.png';

  const footerLinks = [
    {
        title: "Plateforme",
        links: [
            { label: "Explorer", href: "/search" },
            { label: "Tarifs", href: "/abonnements" },
            { label: "Certifications", href: "/student/mes-certificats" },
            { label: "Entreprises", href: "/about" },
        ]
    },
    {
        title: "Ressources",
        links: [
            { label: "Blog", href: "#" },
            { label: "Centre d'aide", href: "/student/support" },
            { label: "Communauté", href: "/student/annuaire" },
            { label: "Webinaires", href: "#" },
        ]
    },
    {
        title: "Légal",
        links: [
            { label: "Confidentialité", href: "/mentions-legales" },
            { label: "Conditions", href: "/cgu" },
            { label: "Cookies", href: "#" },
            { label: "Contact", href: `mailto:${settings?.general?.contactEmail || 'contact@ndara-afrique.com'}` },
        ]
    }
  ];

  return (
    <footer className="pt-24 pb-12 px-4 sm:px-6 lg:px-8 border-t border-white/5 bg-[#0a0a0a]">
        <div className="max-w-7xl mx-auto">
            <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-16 mb-20">
                {/* Brand Column */}
                <div className="lg:col-span-2 space-y-8">
                    <Link href={`/${locale}`} className="flex items-center space-x-3 group">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-lg">
                            <span className="text-white font-bold text-lg">N</span>
                        </div>
                        <span className="text-2xl font-black gradient-text tracking-tighter uppercase">{siteName}</span>
                    </Link>
                    <p className="text-gray-400 text-lg leading-relaxed font-medium italic max-w-md">
                        "L'Éveil du Savoir Africain. Nous bâtissons l'infrastructure éducative qui propulsera le continent vers l'excellence technologique."
                    </p>
                    <div className="flex gap-4">
                        <SocialButton icon={Facebook} href={settings?.general?.facebookUrl} />
                        <SocialButton icon={Twitter} href={settings?.general?.twitterUrl} />
                        <SocialButton icon={Linkedin} href={settings?.general?.linkedinUrl} />
                        <SocialButton icon={Instagram} href={settings?.general?.instagramUrl} />
                    </div>
                </div>
                
                {/* Links Columns */}
                {footerLinks.map((group) => (
                    <div key={group.title} className="space-y-8">
                        <h4 className="font-black text-[10px] text-white uppercase tracking-[0.3em]">{group.title}</h4>
                        <ul className="space-y-4">
                            {group.links.map((link) => (
                                <li key={link.label}>
                                    <Link 
                                        href={`/${locale}${link.href}`} 
                                        className="text-gray-500 hover:text-primary transition-colors font-bold uppercase text-[10px] tracking-widest flex items-center group"
                                    >
                                        {link.label}
                                        <ArrowUpRight className="h-3 w-3 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>
            
            <div className="pt-12 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-8">
                <div className="flex flex-col md:flex-row items-center gap-2 md:gap-6">
                    <p className="text-slate-600 text-[9px] font-black uppercase tracking-[0.4em]">
                        © {new Date().getFullYear()} {siteName}. TOUS DROITS RÉSERVÉS.
                    </p>
                    <div className="flex items-center gap-2 text-[9px] font-black text-primary uppercase tracking-widest bg-primary/5 px-3 py-1 rounded-full border border-primary/10">
                        <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                        Infrastructure Opérationnelle
                    </div>
                </div>
                
                <div className="flex items-center gap-8">
                    <Image src="/logo.png" alt="Trusted Badge" width={32} height={32} className="grayscale opacity-30 hover:grayscale-0 hover:opacity-100 transition-all cursor-help" />
                    <p className="text-[9px] font-black text-slate-700 uppercase tracking-[0.3em] italic">
                        "Bara ala, Tonga na ndara"
                    </p>
                </div>
            </div>
        </div>
    </footer>
  );
}

function SocialButton({ icon: Icon, href }: { icon: any, href?: string }) {
    if (!href) return null;
    return (
        <a 
            href={href} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="h-12 w-12 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center text-slate-500 hover:text-white hover:bg-primary transition-all duration-300 hover:-translate-y-1 shadow-xl"
        >
            <Icon size={20} />
        </a>
    );
}
