'use client';

/**
 * @fileOverview Footer Ndara Afrique V3 - Design épuré et sécurisant.
 */

import Link from 'next/link';
import { Facebook, Twitter, Linkedin, Instagram, Smartphone, CreditCard, Heart } from 'lucide-react';
import { useLocale } from 'next-intl';

export function Footer() {
  const locale = useLocale();

  return (
    <footer className="bg-slate-950 pt-20 pb-12 px-6 border-t border-white/5 relative overflow-hidden">
        <div className="max-w-4xl mx-auto space-y-12">
            
            <div className="flex flex-col items-center text-center space-y-8">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-teal-600 flex items-center justify-center text-slate-950 font-black text-xl">N</div>
                    <span className="font-black text-2xl text-white uppercase tracking-tighter">Ndara</span>
                </div>
                
                <div className="flex justify-center gap-6">
                    <SocialIcon icon={Facebook} href="#" />
                    <SocialIcon icon={Twitter} href="#" />
                    <SocialIcon icon={Linkedin} href="#" />
                    <SocialIcon icon={Instagram} href="#" />
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-10 pt-12 border-t border-white/5">
                <FooterGroup title="Plateforme" links={[
                    { label: "Formations", href: `/${locale}/search` },
                    { label: "À propos", href: `/${locale}/about` },
                    { label: "Abonnements", href: `/${locale}/abonnements` }
                ]} />
                <FooterGroup title="Communauté" links={[
                    { label: "Devenir Formateur", href: `/${locale}/devenir-instructeur` },
                    { label: "Ambassadeurs", href: `/${locale}/student/ambassadeur` },
                    { label: "Support", href: `/${locale}/student/support` }
                ]} />
                <FooterGroup title="Légal" links={[
                    { label: "Conditions", href: `/${locale}/cgu` },
                    { label: "Confidentialité", href: `/${locale}/mentions-legales` }
                ]} />
            </div>

            <div className="pt-12 border-t border-white/5 flex flex-col items-center gap-8">
                <div className="flex justify-center gap-8 opacity-20 grayscale">
                    <CreditCard size={32} />
                    <Smartphone size={32} />
                </div>

                <div className="text-center space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-600">
                        &copy; 2024 NDARA AFRIQUE. TOUS DROITS RÉSERVÉS.
                    </p>
                    <p className="text-[9px] font-bold text-slate-700 uppercase tracking-widest flex items-center justify-center gap-1.5">
                        Fait avec <Heart size={10} className="text-ndara-ochre fill-current" /> pour l'Afrique.
                    </p>
                </div>
            </div>
        </div>
    </footer>
  );
}

function FooterGroup({ title, links }: { title: string, links: any[] }) {
    return (
        <div className="space-y-4">
            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">{title}</h4>
            <ul className="space-y-2.5">
                {links.map((link: any, i: number) => (
                    <li key={i}>
                        <Link href={link.href} className="text-[11px] font-bold text-slate-400 hover:text-primary transition-colors uppercase tracking-widest">
                            {link.label}
                        </Link>
                    </li>
                ))}
            </ul>
        </div>
    )
}

function SocialIcon({ icon: Icon, href }: { icon: any, href: string }) {
    return (
        <Link href={href} className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-primary hover:border-primary/30 transition-all active:scale-90 shadow-xl">
            <Icon size={20} />
        </Link>
    );
}
