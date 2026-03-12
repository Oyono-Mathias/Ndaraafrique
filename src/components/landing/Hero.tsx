'use client';

import { Button } from '@/components/ui/button';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useLocale } from 'next-intl';

export function Hero() {
  const locale = useLocale();

  return (
    <section className="pt-32 pb-20 bg-gradient-to-br from-[#FFF7ED] to-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-1000">
                    <div className="inline-flex items-center px-4 py-2 rounded-full bg-orange-100 text-ndara-orange text-sm font-semibold">
                        <span className="w-2 h-2 bg-ndara-orange rounded-full mr-2"></span>
                        La plateforme #1 pour les talents africains
                    </div>
                    <h1 className="text-5xl lg:text-6xl font-heading font-extrabold text-ndara-dark leading-tight">
                        Apprenez les compétences de <span className="text-ndara-orange">demain</span>, dès aujourd'hui.
                    </h1>
                    <p className="text-lg text-gray-600 max-w-lg">
                        De l'Agritech à la Fintech, en passant par le Trading et la Mécatronique. Ndara connecte les apprenants africains aux experts mondiaux.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4">
                        <Button asChild size="lg" className="rounded-full bg-ndara-orange hover:bg-orange-600 text-white font-bold h-14 px-8 shadow-lg shadow-orange-500/30">
                            <Link href={`/${locale}/search`}>
                                Explorer les cours
                                <ArrowRight className="ml-2 h-5 w-5" />
                            </Link>
                        </Button>
                        <Button asChild variant="outline" size="lg" className="rounded-full border-gray-300 text-gray-700 bg-white hover:bg-gray-50 h-14 px-8">
                            <Link href={`/${locale}/devenir-instructeur`}>
                                Devenir instructeur
                            </Link>
                        </Button>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-500 pt-4">
                        <div className="flex -space-x-2">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="relative w-8 h-8 rounded-full border-2 border-white overflow-hidden">
                                    <Image src={`https://i.pravatar.cc/100?img=${i+10}`} alt="User" fill className="object-cover" />
                                </div>
                            ))}
                            <div className="w-8 h-8 rounded-full border-2 border-white bg-gray-200 flex items-center justify-center text-xs font-bold">+5k</div>
                        </div>
                        <p>Rejoignez plus de 50,000 étudiants</p>
                    </div>
                </div>
                
                <div className="relative lg:h-full flex items-center justify-center animate-in fade-in zoom-in duration-1000 delay-300">
                    <div className="absolute inset-0 bg-gradient-to-tr from-orange-200 to-transparent opacity-30 rounded-full blur-3xl transform translate-x-10 translate-y-10"></div>
                    <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl transform rotate-2 hover:rotate-0 transition duration-500">
                        <Image 
                            src="https://image.qwenlm.ai/public_source/9aa2c1ec-a270-4c0a-bf02-2f39a4c5daed/18745b7c6-a2fe-47d6-9d72-32fc38ef42c1.png" 
                            alt="Étudiants africains" 
                            fill
                            className="object-cover"
                            priority
                        />
                    </div>
                    
                    {/* Floating Badge */}
                    <div className="absolute -bottom-6 -left-6 bg-white p-4 rounded-xl shadow-xl flex items-center gap-3 animate-bounce" style={{ animationDuration: '3s' }}>
                        <div className="bg-green-100 p-2 rounded-full text-green-600">
                            <CheckCircle2 className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-xs text-gray-500">Certification</p>
                            <p className="font-bold text-ndara-dark uppercase text-xs">Reconnue</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </section>
  );
}
