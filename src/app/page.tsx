
import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import { Footer } from '@/components/layout/footer';

const CourseCard = ({ title, imageUrl }: { title: string, imageUrl: string }) => (
  <div className="benefit-card text-left">
    <Image src={imageUrl} width={400} height={225} alt={title} className="rounded-lg mb-4 w-full aspect-video object-cover" />
    <Badge variant="secondary" className="mb-2">Gratuit</Badge>
    <h3 className="font-bold text-xl mb-4 text-white">{title}</h3>
    <Button variant="outline" className="w-full bg-white/10 border-white/20 text-white hover:bg-white/20">Consulter</Button>
  </div>
);

const LandingPage = () => {
  return (
    <div className="bg-[#020617] text-white min-h-screen font-sans">
      {/* HEADER */}
      <nav className="flex justify-between items-center p-6 backdrop-blur-md border-b border-white/10 sticky top-0 z-50">
        <div className="text-2xl font-bold tracking-tighter">
          <Link href="/">Ndara Afrique</Link>
        </div>
        <div className="flex items-center gap-6">
          <select className="bg-transparent border-none text-sm cursor-pointer focus:outline-none">
            <option value="fr">Français</option>
            <option value="sg">Sango</option>
          </select>
          <Link href="/login">
            <Button variant="outline" size="sm">
              Se connecter
            </Button>
          </Link>
        </div>
      </nav>

      {/* HERO SECTION */}
      <main className="max-w-6xl mx-auto px-6 pt-20 pb-10 text-center">
        <h1 className="text-5xl md:text-7xl font-extrabold mb-6 leading-tight hero-text" style={{ animationDelay: '0s' }}>
          L'excellence numérique <br /> 
          <span className="text-blue-500">pour l'Afrique</span>
        </h1>
        <p className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto mb-10 hero-text" style={{ animationDelay: '0.2s' }}>
          Rejoignez la première plateforme panafricaine dédiée aux métiers de demain. 
          Apprenez, pratiquez et certifiez vos compétences.
        </p>
        <Link href="/register">
          <Button size="lg" className="px-8 py-4 h-auto bg-blue-600 hover:bg-blue-700 text-white rounded-full font-bold shadow-lg shadow-blue-500/20 transition-all transform hover:scale-105 hero-text" style={{ animationDelay: '0.4s' }}>
            Commencer l'inscription
          </Button>
        </Link>
      </main>

      {/* EXPLORE COURSES SECTION */}
      <section className="py-20 px-6">
        <h2 className="text-4xl font-bold text-center mb-12 text-white">Explorez nos cours gratuits</h2>
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          <CourseCard title="Introduction au Développement Web" imageUrl="https://picsum.photos/seed/devweb/400/225" />
          <CourseCard title="Les Fondamentaux du Marketing Digital" imageUrl="https://picsum.photos/seed/marketing/400/225" />
          <CourseCard title="Initiation à la Data Science avec Python" imageUrl="https://picsum.photos/seed/datascience/400/225" />
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default LandingPage;
