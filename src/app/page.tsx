import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import { Footer } from '@/components/layout/footer';
import { DynamicCarousel } from '@/components/ui/DynamicCarousel';

const LandingPage = () => {
  return (
    <div className="bg-[#020617] text-white min-h-screen font-sans">
      {/* HEADER - Nettoyé */}
      <nav className="flex justify-between items-center p-6 backdrop-blur-md border-b border-white/10 sticky top-0 z-50">
        <div className="text-2xl font-bold tracking-tighter">
            <Link href="/" className="flex items-center gap-2">
                <Image src="/icon.svg" alt="Ndara Afrique Logo" width={32} height={32} />
                <span>Ndara Afrique</span>
            </Link>
        </div>
        
        <div className="flex items-center gap-6">
          {/* Sélecteur de langue discret */}
          <select className="bg-transparent border-none text-sm cursor-pointer focus:outline-none">
            <option value="fr">Français</option>
            <option value="sg">Sango</option>
          </select>

          {/* Bouton SE CONNECTER (Unique en haut) */}
           <Link href="/login">
            <Button variant="outline" size="sm">
              Se connecter
            </Button>
          </Link>
        </div>
      </nav>

      {/* SECTION HERO - Texte en Français */}
      <main className="max-w-6xl mx-auto px-6 pt-20 pb-10 text-center">
        <h1 className="text-5xl md:text-7xl font-extrabold mb-6 leading-tight hero-text">
            Tonga na ndara
        </h1>
        
        <p className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto mb-10 hero-text" style={{animationDelay: '0.2s'}}>
          La première plateforme d'apprentissage panafricaine pour les métiers de demain.
        </p>

        {/* Bouton INSCRIPTION (Unique au centre) */}
        <Link href="/register">
            <Button size="lg" className="px-8 py-4 h-auto bg-blue-600 hover:bg-blue-700 text-white rounded-full font-bold shadow-lg shadow-blue-500/20 transition-all transform hover:scale-105 hero-text" style={{ animationDelay: '0.4s' }}>
                S'inscrire
            </Button>
        </Link>
      </main>

       {/* SECTION CAROUSEL */}
       <section className="max-w-6xl mx-auto px-6 py-12">
            <DynamicCarousel />
       </section>

      {/* SECTION : COURS PUBLICS DYNAMIQUES */}
      <section className="py-20 max-w-6xl mx-auto px-6">
        <div className="flex justify-between items-end mb-10">
          <div>
            <h2 className="text-3xl font-bold mb-2">Cours Publics</h2>
            <p className="text-gray-400">Découvrez nos formations accessibles à tous sans attendre.</p>
          </div>
          <Link href="/search" className="text-blue-400 hover:text-blue-300 font-medium transition whitespace-nowrap">
            Voir tout →
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[1, 2, 3].map((item) => (
            <div key={item} className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:border-blue-500/50 transition-all group">
              <div className="h-48 bg-gradient-to-br from-blue-900/40 to-black flex items-center justify-center">
                <span className="text-4xl">📚</span>
              </div>
              <div className="p-6">
                <span className="bg-blue-600/20 text-blue-400 text-xs font-bold px-3 py-1 rounded-full uppercase">Gratuit</span>
                <h3 className="text-xl font-semibold mt-3 mb-2 group-hover:text-blue-400 transition">Introduction à l'IA</h3>
                <p className="text-gray-400 text-sm mb-4">Apprenez les bases de l'intelligence artificielle pour l'Afrique.</p>
                <button className="w-full py-3 bg-white/10 hover:bg-blue-600 rounded-xl font-medium transition-colors">
                  Consulter le cours
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default LandingPage;
