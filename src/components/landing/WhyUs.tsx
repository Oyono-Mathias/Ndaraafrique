'use client';

import { Smartphone, Wallet, Users } from 'lucide-react';
import Image from 'next/image';

export function WhyUs() {
  return (
    <section id="why-us" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                <div className="order-2 lg:order-1">
                    <div className="relative aspect-video lg:aspect-square w-full rounded-2xl overflow-hidden shadow-2xl">
                        <Image src="https://images.unsplash.com/photo-1531545514256-b1400bc00f31?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80" alt="Learning" fill className="object-cover" />
                    </div>
                </div>
                <div className="order-1 lg:order-2 space-y-8">
                    <h2 className="text-3xl font-heading font-bold text-ndara-dark uppercase tracking-tight leading-none">Pourquoi choisir Ndara ?</h2>
                    <p className="text-gray-600 text-lg leading-relaxed font-medium">Nous comprenons les défis uniques de l'apprentissage en Afrique. Notre plateforme est conçue pour vous.</p>
                    
                    <div className="space-y-8">
                        <div className="flex gap-5">
                            <div className="flex-shrink-0 w-12 h-12 bg-orange-100 rounded-2xl flex items-center justify-center text-ndara-orange">
                                <Smartphone size={24} />
                            </div>
                            <div>
                                <h4 className="text-lg font-bold text-ndara-dark uppercase tracking-tight">Mode Hors-Ligne</h4>
                                <p className="text-gray-500 text-sm mt-1 leading-relaxed">Téléchargez vos cours et apprenez sans connexion internet. Idéal pour les zones à faible connectivité.</p>
                            </div>
                        </div>
                        
                        <div className="flex gap-5">
                            <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600">
                                <Wallet size={24} />
                            </div>
                            <div>
                                <h4 className="text-lg font-bold text-ndara-dark uppercase tracking-tight">Paiements Locaux</h4>
                                <p className="text-gray-500 text-sm mt-1 leading-relaxed">Payez facilement avec Orange Money, MTN Mobile Money ou Wave. Simple et sécurisé.</p>
                            </div>
                        </div>

                        <div className="flex gap-5">
                            <div className="flex-shrink-0 w-12 h-12 bg-green-100 rounded-2xl flex items-center justify-center text-green-600">
                                <Users size={24} />
                            </div>
                            <div>
                                <h4 className="text-lg font-bold text-ndara-dark uppercase tracking-tight">Communauté Active</h4>
                                <p className="text-gray-500 text-sm mt-1 leading-relaxed">Échangez avec des milliers d'autres étudiants et professionnels à travers le continent.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </section>
  );
}
