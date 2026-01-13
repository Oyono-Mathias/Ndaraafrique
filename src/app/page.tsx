import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Footer } from '@/components/layout/footer';
import Image from 'next/image';

const LandingPage = () => {
  const publicCourses = [
    {
      id: 1,
      title: 'Introduction au Développement Web',
      description: 'Apprenez les bases de HTML, CSS & JavaScript.',
      imageUrl: 'https://picsum.photos/seed/devweb/600/400',
      imageHint: 'code screen',
    },
    {
      id: 2,
      title: 'Les Fondamentaux du Marketing Digital',
      description: 'Découvrez les stratégies pour réussir en ligne.',
      imageUrl: 'https://picsum.photos/seed/marketing/600/400',
      imageHint: 'social media chart',
    },
    {
      id: 3,
      title: 'Initiation à l\'Intelligence Artificielle',
      description: 'Comprenez les concepts clés de l\'IA et son potentiel.',
      imageUrl: 'https://picsum.photos/seed/ai/600/400',
      imageHint: 'abstract network',
    },
  ];

  return (
    <div className="bg-[#020617] text-white min-h-screen font-sans">
      <nav className="flex justify-between items-center p-6 backdrop-blur-md border-b border-white/10 sticky top-0 z-50">
        <div className="text-2xl font-bold tracking-tighter">Ndara Afrique</div>
        <div className="flex items-center gap-6">
          <select className="bg-transparent border-none text-sm cursor-pointer focus:outline-none">
            <option value="fr">Français</option>
            <option value="sg">Sango</option>
          </select>
          <Button asChild variant="outline" className="px-4 py-2 text-sm font-medium rounded-lg bg-transparent border-white/20 hover:bg-white/10 hover:text-white transition">
            <Link href="/login">Se connecter</Link>
          </Button>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 pt-20 pb-10 text-center">
        <h1 className="text-5xl md:text-7xl font-extrabold mb-6 leading-tight hero-text">
          L'excellence numérique <br />
          <span className="text-blue-500">pour l'Afrique</span>
        </h1>
        <p className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto mb-10 hero-text" style={{ animationDelay: '0.2s' }}>
          Rejoignez la première plateforme panafricaine dédiée aux métiers de demain. Apprenez, pratiquez et certifiez vos compétences.
        </p>
        <Button asChild size="lg" className="px-8 py-4 h-auto bg-blue-600 hover:bg-blue-700 text-white rounded-full font-bold shadow-lg shadow-blue-500/20 transition-all transform hover:scale-105 hero-text" style={{ animationDelay: '0.4s' }}>
          <Link href="/register">Commencer l'inscription</Link>
        </Button>
      </main>

      <section className="py-20 max-w-6xl mx-auto px-6">
        <div className="flex justify-between items-end mb-10">
          <div>
            <h2 className="text-3xl font-bold mb-2">Explorez nos cours gratuits</h2>
          </div>
          <Link href="/search" className="text-blue-400 hover:text-blue-300 font-medium transition">
            Voir tout →
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {publicCourses.map((course) => (
            <div key={course.id} className="benefit-card group">
              <div className="relative h-48 rounded-lg overflow-hidden mb-6">
                <Image
                  src={course.imageUrl}
                  alt={course.title}
                  data-ai-hint={course.imageHint}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <div className="flex-grow">
                <span className="bg-blue-600/20 text-blue-400 text-xs font-bold px-3 py-1 rounded-full uppercase">Gratuit</span>
                <h3 className="text-xl font-semibold mt-4 mb-2 text-white">{course.title}</h3>
                <p className="text-gray-400 text-sm mb-4">{course.description}</p>
              </div>
              <Button className="w-full mt-4 bg-white/10 hover:bg-blue-600 rounded-xl font-medium transition-colors">
                Consulter
              </Button>
            </div>
          ))}
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default LandingPage;
