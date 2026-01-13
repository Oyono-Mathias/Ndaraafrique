'use client';

import React, { useState } from 'react';

const LandingPage = () => {
  // État pour l'interactivité des étapes
  const [activeStep, setActiveStep] = useState(1);

  const steps = [
    { id: 1, title: "Étape 1", desc: "Créez votre compte en quelques secondes." },
    { id: 2, title: "Étape 2", desc: "Choisissez votre parcours de formation." },
    { id: 3, title: "Étape 3", desc: "Commencez à apprendre et obtenez votre certificat." }
  ];

  return (
    <div className="bg-[#020617] text-white min-h-screen font-sans">
      {/* HEADER */}
      <nav className="flex justify-between items-center p-6 backdrop-blur-md border-b border-white/10 sticky top-0 z-50">
        <div className="text-2xl font-bold">Ndara Afrique</div>
        <button className="px-5 py-2 text-sm border border-white/20 rounded-lg hover:bg-white/10 transition">
          Se connecter
        </button>
      </nav>

      {/* HERO SECTION */}
      <header className="text-center pt-20 pb-10 px-6">
        <h1 className="text-5xl font-extrabold mb-4">L'excellence numérique</h1>
        <p className="text-gray-400 mb-8">La plateforme panafricaine pour les métiers de demain.</p>
        <button className="px-8 py-4 bg-blue-600 rounded-full font-bold hover:scale-105 transition-transform">
          S'inscrire maintenant
        </button>
      </header>

      {/* --- SECTION INTERACTIVE (TES ÉTAPES) --- */}
      <section className="py-16 px-6 max-w-4xl mx-auto">
        <div className="flex justify-center gap-4 mb-8">
          {steps.map((step) => (
            <button
              key={step.id}
              onClick={() => setActiveStep(step.id)}
              className={`px-6 py-3 rounded-xl border-2 transition-all duration-300 ${
                activeStep === step.id 
                ? "border-blue-500 bg-blue-500/20 shadow-[0_0_20px_rgba(59,130,246,0.5)]" 
                : "border-white/10 bg-white/5 hover:border-white/30"
              }`}
            >
              Setup {step.id}
            </button>
          ))}
        </div>

        {/* AFFICHAGE DU CONTENU SELON L'ÉTAPE */}
        <div className="bg-white/5 border border-white/10 p-8 rounded-3xl backdrop-blur-xl text-center animate-fadeIn">
          <h3 className="text-2xl font-bold text-blue-400 mb-4">{steps[activeStep - 1].title}</h3>
          <p className="text-gray-300 text-lg">{steps[activeStep - 1].desc}</p>
        </div>
      </section>

      {/* COURS PUBLICS */}
      <section className="py-10 px-6 max-w-6xl mx-auto">
        <h2 className="text-2xl font-bold mb-8">Nos Cours Publics</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 bg-white/5 border border-white/10 rounded-2xl">
             <div className="h-32 bg-blue-900/20 rounded-lg mb-4"></div>
             <h4 className="font-bold">Développement Web</h4>
             <p className="text-sm text-gray-400">Apprenez HTML, CSS et JS.</p>
          </div>
          {/* Ajoute d'autres cartes ici */}
        </div>
      </section>
    </div>
  );
};

export default LandingPage;
