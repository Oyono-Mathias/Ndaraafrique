
import React from 'react';
import Link from 'next/link';

const LandingPage = () => {
  return (
    <div className="bg-[#020617] text-white min-h-screen font-sans">
      {/* HEADER - Nettoyé */}
      <nav className="flex justify-between items-center p-6 backdrop-blur-md border-b border-white/10 sticky top-0 z-50">
        <div className="text-2xl font-bold tracking-tighter">Ndara Afrique</div>
        
        <div className="flex items-center gap-6">
          {/* Sélecteur de langue discret */}
          <select className="bg-transparent border-none text-sm cursor-pointer focus:outline-none">
            <option value="fr">Français</option>
            <option value="sg">Sango</option>
          </select>

          {/* Bouton SE CONNECTER (Unique en haut) */}
          <Link href="/login">
            <button className="px-4 py-2 text-sm font-medium border border-white/20 rounded-lg hover:bg-white/10 transition">
              Se connecter
            </button>
          </Link>
        </div>
      </nav>

      {/* SECTION HERO - Texte en Français */}
      <main className="max-w-6xl mx-auto px-6 pt-20 pb-10 text-center">
        <h1 className="text-5xl md:text-7xl font-extrabold mb-6 leading-tight hero-text">
          L'excellence numérique <br /> 
          <span className="text-blue-500">pour l'Afrique</span>
        </h1>
        
        <p className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto mb-10 hero-text" style={{ animationDelay: '0.2s' }}>
          Rejoignez la première plateforme panafricaine dédiée aux métiers de demain. 
          Apprenez, pratiquez et certifiez vos compétences.
        </p>

        {/* Bouton INSCRIPTION (Unique au centre) */}
        <Link href="/register">
            <button className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-bold shadow-lg shadow-blue-500/20 transition-all transform hover:scale-105 hero-text" style={{ animationDelay: '0.4s' }}>
            Commencer l'inscription
            </button>
        </Link>
      </main>

      {/* SECTION STEPS (Tes interactions préservées) */}
      <section className="py-20">
        {/* Ici ton code existant pour Setup 1, 2, 3 que nous ne touchons pas */}
        <div className="flex justify-center gap-4">
           {/* Ton CSS magique reste ici */}
        </div>
      </section>
    </div>
  );
};

export default LandingPage;
