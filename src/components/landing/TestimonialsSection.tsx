
'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';

const testimonials = [
  {
    name: 'Idriss B.',
    role: 'Développeur Mobile, KoloPay',
    avatar: 'https://i.postimg.cc/mD8zWqgD/idriss.jpg',
    quote: "Ndara Afrique a changé ma carrière. Les cours sont pertinents pour le marché africain et le paiement par Mobile Money a tout simplifié. J'ai pu monter en compétences sans barrière.",
  },
  {
    name: 'Fatou N.',
    role: 'Spécialiste Marketing Digital',
    avatar: 'https://i.postimg.cc/zXv5zZ2G/fatou.jpg',
    quote: "En tant que femme entrepreneure, trouver des formations de qualité et accessibles était un défi. Ndara Afrique a été la solution. La flexibilité des cours et le soutien de la communauté sont exceptionnels.",
  },
  {
    name: 'Kwame A.',
    role: 'Data Scientist Junior',
    avatar: 'https://i.postimg.cc/W1g4zB5g/kwame.jpg',
    quote: "Passer de la théorie à la pratique n'a jamais été aussi simple. Les projets concrets et l'expertise des formateurs locaux font toute la différence. Je recommande à 100%.",
  },
];

const TestimonialCard = ({ name, role, avatar, quote }: (typeof testimonials)[0]) => (
    <Card className="h-full flex flex-col justify-between p-6 bg-slate-800/50 border-slate-700/80">
        <CardContent className="p-0">
            <blockquote className="text-slate-300 italic">“{quote}”</blockquote>
        </CardContent>
        <div className="flex items-center gap-4 mt-6 pt-6 border-t border-slate-700">
            <Avatar>
                <AvatarImage src={avatar} alt={name} />
                <AvatarFallback>{name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
                <p className="font-bold text-white">{name}</p>
                <p className="text-sm text-slate-400">{role}</p>
            </div>
        </div>
    </Card>
);

export function TestimonialsSection() {
  return (
    <section className="py-24">
      <div className="text-center mb-12">
        <h2 className="text-3xl md:text-4xl font-extrabold text-white">
          Ils construisent l'avenir avec nous
        </h2>
        <p className="mt-4 text-lg text-slate-400 max-w-2xl mx-auto">
          Découvrez ce que notre communauté pense de Ndara Afrique.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {testimonials.map((testimonial, index) => (
            <TestimonialCard key={index} {...testimonial} />
        ))}
      </div>
    </section>
  );
}
