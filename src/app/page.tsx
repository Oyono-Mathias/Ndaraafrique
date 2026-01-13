'use client';

import React, { useState, useEffect } from 'react';
import { getFirestore, collection, query, limit, onSnapshot } from 'firebase/firestore';
import Link from 'next/link';

export default function LandingPage() {
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const db = getFirestore();

  useEffect(() => {
    const q = query(collection(db, "courses"), limit(4));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCourses(docs);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching courses: ", error);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [db]);

  return (
    <div className="bg-white text-slate-900 min-h-screen font-sans">
      
      {/* 1. NAVBAR FIXE */}
      <nav className="fixed top-0 w-full bg-white border-b border-slate-100 z-50 h-16 flex items-center px-4 md:px-8 justify-between">
        <div className="text-xl font-bold text-blue-600">Ndara Afrique</div>
        <div className="hidden md:flex gap-6 text-sm font-medium">
          <Link href="/search" className="hover:text-blue-600">Formations</Link>
          <Link href="/about" className="hover:text-blue-600">À propos</Link>
        </div>
        <div className="flex gap-3">
          <Link href="/login" className="px-4 py-2 text-sm font-semibold border rounded-md hover:bg-slate-50">Se connecter</Link>
          <Link href="/register" className="px-4 py-2 text-sm font-semibold bg-slate-900 text-white rounded-md hover:bg-slate-800">S'inscrire</Link>
        </div>
      </nav>

      {/* 2. HERO SECTION */}
      <section className="pt-32 pb-16 px-4 md:px-8 bg-slate-50">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h1 className="text-4xl md:text-6xl font-bold leading-tight mb-6">
              Propulsez votre carrière avec <span className="text-blue-600">Ndara Afrique</span>
            </h1>
            <p className="text-lg text-slate-600 mb-8">
              Apprenez des meilleurs experts africains et obtenez des certifications reconnues dans tout le continent.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/search" className="px-8 py-3 bg-blue-600 text-white text-center font-bold rounded-md hover:bg-blue-700 transition">
                Voir les formations
              </Link>
              <Link href="/devenir-instructeur" className="px-8 py-3 bg-white border border-slate-300 text-slate-900 text-center font-bold rounded-md hover:bg-slate-50 transition">
                Enseigner sur la plateforme
              </Link>
            </div>
          </div>
          <div className="hidden md:block">
            <div className="w-full h-[400px] bg-blue-100 rounded-2xl flex items-center justify-center">
              <span className="text-8xl">🎓</span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. SECTION FORMATIONS (GRID) */}
      <section className="py-20 px-4 md:px-8 max-w-7xl mx-auto">
        <h2 className="text-2xl font-bold mb-8">Les formations les plus populaires</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {loading ? (
             <div className="col-span-full text-center py-10">Chargement des pépites...</div>
          ) : courses.map((course) => (
            <div key={course.id} className="group cursor-pointer border border-transparent hover:border-slate-200 p-2 rounded-lg transition">
              <div className="relative h-40 bg-slate-200 rounded-md mb-3 overflow-hidden">
                {course.imageUrl ? <img src={course.imageUrl} alt={course.title} className="object-cover w-full h-full" /> : <div className="flex items-center justify-center h-full text-4xl">💻</div>}
                {course.isPopular && <span className="absolute top-2 left-2 bg-yellow-400 text-[10px] font-bold px-2 py-1 uppercase italic">Bestseller</span>}
              </div>
              <h3 className="font-bold text-sm leading-snug mb-1 group-hover:text-blue-600 line-clamp-2">{course.title}</h3>
              <p className="text-xs text-slate-500 mb-1">{course.instructorName || 'Expert Ndara'}</p>
              <div className="flex items-center gap-1 mb-1">
                <span className="text-sm font-bold text-orange-700">4.8</span>
                <span className="text-orange-400 text-xs">★★★★★</span>
                <span className="text-[10px] text-slate-400">(1,250)</span>
              </div>
              <div className="font-bold text-lg">{course.price ? `${course.price} FCFA` : 'Gratuit'}</div>
            </div>
          ))}
        </div>
      </section>

      {/* 4. RECRUTEMENT INSTRUCTEURS */}
      <section className="my-20 mx-4 md:mx-8">
        <div className="max-w-5xl mx-auto bg-slate-900 rounded-3xl p-8 md:p-16 text-white flex flex-col md:flex-row items-center gap-10">
          <div className="text-6xl md:text-8xl">🎥</div>
          <div className="flex-1">
            <h2 className="text-3xl font-bold mb-4">Devenez Instructeur et partagez votre savoir</h2>
            <p className="text-slate-400 mb-6 text-lg">
              Vous avez une expertise reconnue ? Rejoignez l'élite des formateurs africains.
            </p>
            <Link href="/devenir-instructeur" className="inline-block px-8 py-3 bg-white text-slate-900 font-bold rounded-md hover:bg-blue-50 transition">
              Postuler maintenant
            </Link>
          </div>
        </div>
      </section>

      {/* 5. FOOTER PROFESSIONNEL */}
      <footer className="bg-slate-900 text-white pt-16 pb-8 px-4 md:px-8 border-t border-slate-800">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-12 mb-16">
          <div>
            <h4 className="font-bold mb-4">Catégories</h4>
            <ul className="text-sm text-slate-400 space-y-2">
              <li>Développement Web</li>
              <li>E-commerce & Business</li>
              <li>Design Graphique</li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-4">Ndara Afrique</h4>
            <ul className="text-sm text-slate-400 space-y-2">
              <li>À propos</li>
              <li>Contact</li>
              <li>Recrutement</li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-4">Réseaux Sociaux</h4>
            <ul className="text-sm text-slate-400 space-y-2">
              <li>YouTube</li>
              <li>LinkedIn</li>
              <li>Facebook</li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-4 text-sm">Paiements acceptés</h4>
            <div className="flex flex-wrap gap-3 grayscale opacity-70">
              <span className="bg-white/10 px-2 py-1 rounded text-[10px]">Orange Money</span>
              <span className="bg-white/10 px-2 py-1 rounded text-[10px]">MTN Mobile</span>
              <span className="bg-white/10 px-2 py-1 rounded text-[10px]">Moov Money</span>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto pt-8 border-t border-slate-800 flex justify-between items-center text-xs text-slate-500">
          <div className="text-xl font-bold text-white mb-2 md:mb-0">Ndara Afrique</div>
          <p>© 2024 Ndara Afrique - Bangui, RCA</p>
        </div>
      </footer>
    </div>
  );
}