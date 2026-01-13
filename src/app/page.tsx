
'use client';

import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, limit, getFirestore } from 'firebase/firestore';
import Link from 'next/link';

export default function LandingPage() {
  const [activeStep, setActiveStep] = useState(1);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const db = getFirestore();

  // RÉCUPÉRATION DES COURS EN TEMPS RÉEL (SANS FILTRE BLOQUANT)
  useEffect(() => {
    const q = query(collection(db, "courses"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCourses(docs);
      setLoading(false);
    }, (error) => {
      console.error("Erreur Firebase:", error);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [db]);

  const steps = [
    { id: 1, title: "Inscription", desc: "Créez votre compte Ndara en quelques secondes pour commencer." },
    { id: 2, title: "Choix du parcours", desc: "Explorez nos formations en IA, E-commerce ou Design." },
    { id: 3, title: "Certification", desc: "Apprenez à votre rythme et obtenez un diplôme reconnu." }
  ];

  return (
    <div className="bg-[#020617] text-white min-h-screen font-sans">
      {/* HEADER NETTOYÉ */}
      <nav className="flex justify-between items-center p-6 border-b border-white/10 sticky top-0 bg-[#020617]/90 backdrop-blur-md z-50">
        <div className="text-2xl font-bold tracking-tighter">Ndara Afrique</div>
        <div className="flex items-center gap-6">
          <Link href="/login">
            <button className="px-5 py-2 border border-white/20 rounded-lg hover:bg-white/10 transition font-medium">
              Se connecter
            </button>
          </Link>
        </div>
      </nav>

      {/* HERO SECTION */}
      <header className="text-center py-24 px-6">
        <h1 className="text-5xl md:text-7xl font-extrabold mb-6 tracking-tight leading-tight">
          L'excellence numérique <br/><span className="text-blue-500 font-black">pour l'Afrique</span>
        </h1>
        <p className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto mb-10 font-light">
          La première plateforme panafricaine dédiée aux métiers de demain. 
          Apprenez, pratiquez et certifiez vos compétences.
        </p>
        <Link href="/register">
          <button className="px-10 py-4 bg-blue-600 rounded-full font-bold shadow-lg shadow-blue-500/20 hover:scale-105 transition-all">
            Commencer l'inscription
          </button>
        </Link>
      </header>

      {/* SETUP 1, 2, 3 INTERACTIF */}
      <section className="py-16 max-w-4xl mx-auto px-6">
        <div className="flex justify-center gap-4 mb-10">
          {steps.map((s) => (
            <button 
              key={s.id}
              onClick={() => setActiveStep(s.id)}
              className={`px-8 py-3 rounded-xl border-2 transition-all duration-300 font-bold ${
                activeStep === s.id 
                ? "border-blue-500 bg-blue-500/10 shadow-[0_0_20px_rgba(59,130,246,0.3)] text-white" 
                : "border-white/5 bg-white/5 hover:border-white/20 text-gray-500"
              }`}
            >
              Setup {s.id}
            </button>
          ))}
        </div>
        <div className="bg-white/5 p-10 rounded-3xl border border-white/10 text-center backdrop-blur-sm animate-in fade-in duration-700">
          <h3 className="text-3xl font-bold mb-4 text-blue-400">{steps[activeStep-1].title}</h3>
          <p className="text-gray-300 text-lg leading-relaxed">{steps[activeStep-1].desc}</p>
        </div>
      </section>

      {/* SECTION COURS PUBLICS EN TEMPS RÉEL */}
      <section className="py-20 max-w-6xl mx-auto px-6">
        <h2 className="text-3xl font-bold mb-12 text-center text-white">Explorez nos cours publics</h2>
        {loading ? (
          <div className="text-center py-10 text-blue-400 animate-pulse">Connexion à Ndara Cloud...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {courses.length > 0 ? courses.map(course => (
              <div key={course.id} className="group bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:border-blue-500/50 transition-all flex flex-col">
                <div className="h-44 bg-gradient-to-br from-blue-900/40 to-black p-6 relative">
                   <span className="absolute top-4 left-4 bg-blue-600/30 text-blue-400 text-xs font-bold px-3 py-1 rounded-full backdrop-blur-md">
                     {course.category || 'Formation'}
                   </span>
                </div>
                <div className="p-6 flex-grow">
                  <h4 className="font-bold text-xl mb-3 group-hover:text-blue-400 transition">{course.title || "Formation Ndara"}</h4>
                  <p className="text-gray-400 text-sm line-clamp-2 mb-6">{course.description}</p>
                  <button className="w-full py-3 bg-white/5 border border-white/10 rounded-xl font-bold hover:bg-blue-600 hover:border-blue-600 transition-all">
                    Consulter le cours
                  </button>
                </div>
              </div>
            )) : (
              <div className="col-span-3 text-center text-gray-500 py-10">Nos formations arrivent bientôt.</div>
            )}
          </div>
        )}
      </section>

      {/* FOOTER UNIQUE ET PROFESSIONNEL */}
      <footer className="mt-20 border-t border-white/10 bg-black/40 pt-20 pb-10">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-16">
          <div className="space-y-4">
            <h3 className="text-2xl font-bold">Ndara Afrique</h3>
            <p className="text-gray-400 text-sm leading-relaxed">
              L'excellence par le savoir. La première plateforme d'apprentissage panafricaine pour les métiers de demain.
            </p>
          </div>
          <div>
            <h4 className="font-bold mb-6 text-sm uppercase tracking-widest text-blue-400">Navigation</h4>
            <ul className="space-y-3 text-gray-400 text-sm">
              <li className="hover:text-white cursor-pointer transition">Accueil</li>
              <li className="hover:text-white cursor-pointer transition">Tous les cours</li>
              <li className="hover:text-white cursor-pointer transition">À propos</li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-6 text-sm uppercase tracking-widest text-blue-400">Contact</h4>
            <p className="text-gray-400 text-sm mb-4 font-mono">support@ndara-afrique.com</p>
            <div className="flex gap-6 mt-4">
               <span className="text-xs text-gray-500 hover:text-white cursor-pointer">FACEBOOK</span>
               <span className="text-xs text-gray-500 hover:text-white cursor-pointer">LINKEDIN</span>
            </div>
          </div>
        </div>
        <div className="text-center mt-20 pt-8 border-t border-white/5 text-[10px] text-gray-600 uppercase tracking-[0.2em]">
          © 2026 Ndara Afrique — Tous droits réservés
        </div>
      </footer>
    </div>
  );
};

    