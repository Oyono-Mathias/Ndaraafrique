'use client';

import Link from 'next/link';
import { Facebook, Twitter, Linkedin, Instagram, Smartphone, CreditCard } from 'lucide-react';
import { useLocale } from 'next-intl';

export function Footer() {
  const locale = useLocale();

  return (
    <footer className="bg-gray-900 text-gray-300 py-16 border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
                <div className="col-span-1 md:col-span-1 space-y-6">
                    <div className="flex items-center gap-2">
                        <div className="w-10 h-10 bg-ndara-orange rounded flex items-center justify-center text-white font-bold text-xl">N</div>
                        <span className="font-heading font-bold text-2xl text-white uppercase tracking-tight">Ndara</span>
                    </div>
                    <p className="text-sm text-gray-400 leading-relaxed font-medium italic">
                        La plateforme de formation en ligne dédiée à l'excellence africaine. Apprenez les compétences du futur.
                    </p>
                    <div className="flex space-x-4">
                        <SocialIcon icon={Facebook} />
                        <SocialIcon icon={Twitter} />
                        <SocialIcon icon={Linkedin} />
                        <SocialIcon icon={Instagram} />
                    </div>
                </div>
                
                <div>
                    <h4 className="text-white font-black uppercase text-[10px] tracking-[0.3em] mb-6">Ndara Afrique</h4>
                    <ul className="space-y-3 text-xs font-bold uppercase tracking-widest">
                        <li><Link href={`/${locale}/about`} className="hover:text-ndara-orange transition">À propos</Link></li>
                        <li><Link href={`/${locale}/investir`} className="hover:text-ndara-orange transition text-primary">Investir</Link></li>
                        <li><Link href="#" className="hover:text-ndara-orange transition">Carrières</Link></li>
                        <li><Link href="#" className="hover:text-ndara-orange transition">Presse</Link></li>
                    </ul>
                </div>
                
                <div>
                    <h4 className="text-white font-black uppercase text-[10px] tracking-[0.3em] mb-6">Découvrir</h4>
                    <ul className="space-y-3 text-xs font-bold uppercase tracking-widest">
                        <li><Link href={`/${locale}/devenir-instructeur`} className="hover:text-ndara-orange transition">Devenir instructeur</Link></li>
                        <li><Link href={`/${locale}/student/ambassadeur`} className="hover:text-ndara-orange transition">Affiliation</Link></li>
                        <li><Link href={`/${locale}/abonnements`} className="hover:text-ndara-orange transition">Offres Ndara</Link></li>
                        <li><Link href={`/${locale}/leaderboard`} className="hover:text-ndara-orange transition">Leaderboard</Link></li>
                    </ul>
                </div>
                
                <div>
                    <h4 className="text-white font-black uppercase text-[10px] tracking-[0.3em] mb-6">Support</h4>
                    <ul className="space-y-3 text-xs font-bold uppercase tracking-widest">
                        <li><Link href={`/${locale}/student/support`} className="hover:text-ndara-orange transition">Centre d'aide</Link></li>
                        <li><Link href={`/${locale}/cgu`} className="hover:text-ndara-orange transition">Conditions</Link></li>
                        <li><Link href={`/${locale}/mentions-legales`} className="hover:text-ndara-orange transition">Confidentialité</Link></li>
                        <li><Link href="mailto:contact@ndara-afrique.com" className="hover:text-ndara-orange transition">Contact</Link></li>
                    </ul>
                </div>
            </div>
            
            <div className="border-t border-gray-800 pt-10 flex flex-col md:flex-row justify-between items-center gap-6">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">
                    &copy; {new Date().getFullYear()} NDARA AFRIQUE. TOUS DROITS RÉSERVÉS.
                </p>
                <div className="flex items-center gap-6 text-gray-600">
                    <div className="flex items-center gap-2">
                        <CreditCard size={16} />
                        <span className="text-[10px] font-bold uppercase tracking-tighter">Paiements par carte</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Smartphone size={16} />
                        <span className="text-[10px] font-bold uppercase tracking-tighter">Mobile Money</span>
                    </div>
                </div>
            </div>
        </div>
    </footer>
  );
}

function SocialIcon({ icon: Icon }: { icon: any }) {
    return (
        <Link href="#" className="h-10 w-10 rounded-xl bg-gray-800 flex items-center justify-center text-gray-400 hover:text-white hover:bg-ndara-orange transition-all duration-300 active:scale-90">
            <Icon size={18} />
        </Link>
    );
}
