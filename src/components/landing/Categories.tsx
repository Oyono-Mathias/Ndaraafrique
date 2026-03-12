'use client';

import Image from 'next/image';
import { ChartLine } from 'lucide-react';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { cn } from "@/lib/utils";

const CATEGORIES = [
    {
        title: "Agritech",
        desc: "Agriculture moderne & Drones",
        bg: "bg-orange-50",
        bgHover: "group-hover:bg-orange-100",
        img: "https://image.qwenlm.ai/public_source/9aa2c1ec-a270-4c0a-bf02-2f39a4c5daed/1297e5785-c10d-439c-ae99-3319270e21d2.png"
    },
    {
        title: "Mecatech",
        desc: "Robotique & Ingénierie",
        bg: "bg-blue-50",
        bgHover: "group-hover:bg-blue-100",
        img: "https://image.qwenlm.ai/public_source/9aa2c1ec-a270-4c0a-bf02-2f39a4c5daed/1fce6513a-5761-491a-ab3d-00b7c0fca5f6.png"
    },
    {
        title: "Fintech",
        desc: "Finance Digitale & Mobile Money",
        bg: "bg-green-50",
        bgHover: "group-hover:bg-green-100",
        img: "https://image.qwenlm.ai/public_source/9aa2c1ec-a270-4c0a-bf02-2f39a4c5daed/1f234be34-cebd-4229-b469-bc9fc1315f00.png"
    },
    {
        title: "Trading",
        desc: "Forex, Crypto & Bourse",
        bg: "bg-indigo-50",
        bgHover: "group-hover:bg-indigo-100",
        icon: true
    }
];

export function Categories() {
  const locale = useLocale();

  return (
    <section id="categories" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
                <h2 className="text-3xl font-heading font-bold text-ndara-dark mb-4">Explorez par Secteur</h2>
                <p className="text-gray-600 max-w-2xl mx-auto">Des formations adaptées aux besoins spécifiques du marché africain et mondial.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {CATEGORIES.map((cat) => (
                    <Link key={cat.title} href={`/${locale}/search?category=${cat.title}`} className="group">
                        <div className={cn(cat.bg, cat.bgHover, "rounded-2xl p-8 mb-4 flex items-center justify-center h-48 transition duration-300")}>
                            {cat.icon ? (
                                <div className="text-6xl text-indigo-500">
                                    <ChartLine size={64} />
                                </div>
                            ) : (
                                <div className="relative h-32 w-full transition group-hover:scale-110 duration-300">
                                    <Image src={cat.img!} alt={cat.title} fill className="object-contain" />
                                </div>
                            )}
                        </div>
                        <h3 className="text-xl font-bold text-ndara-dark mb-1">{cat.title}</h3>
                        <p className="text-gray-500 text-sm">{cat.desc}</p>
                    </Link>
                ))}
            </div>
        </div>
    </section>
  );
}