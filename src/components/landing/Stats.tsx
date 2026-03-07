'use client';

/**
 * @fileOverview Statistiques de la landing page en temps réel.
 * Écoute Firestore pour afficher les compteurs réels.
 * ✅ RÉSOLU : Note moyenne calculée dynamiquement sur l'ensemble des avis réels.
 * ✅ RÉSOLU : Zéro simulation, uniquement des chiffres basés sur Firestore.
 */

import { useEffect, useState } from 'react';
import { getFirestore, collection, query, where, onSnapshot } from 'firebase/firestore';
import { cn } from "@/lib/utils";

export function Stats() {
    const [stats, setStats] = useState({ memberCount: 0, courseCount: 0, avgRating: 0 });
    const [isLoading, setIsLoading] = useState(true);
    const db = getFirestore();

    useEffect(() => {
        setIsLoading(true);
        
        // 1. Écouter TOUS les membres réels (Admin + Formateurs + Étudiants)
        const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
            setStats(prev => ({ ...prev, memberCount: snapshot.size }));
        }, (err) => {
            console.warn("Stats users error:", err);
        });

        // 2. Écouter les cours réellement publiés
        const unsubCourses = onSnapshot(query(collection(db, 'courses'), where('status', '==', 'Published')), (snapshot) => {
            setStats(prev => ({ ...prev, courseCount: snapshot.size }));
        }, (err) => {
            console.warn("Stats courses error:", err);
        });

        // 3. Calculer la note moyenne réelle sur TOUS les avis de la plateforme
        const unsubReviews = onSnapshot(collection(db, 'reviews'), (snapshot) => {
            const reviewsData = snapshot.docs.map(d => d.data());
            const total = reviewsData.length;
            const avg = total > 0 ? reviewsData.reduce((acc, curr) => acc + (curr.rating || 0), 0) / total : 0;
            setStats(prev => ({ ...prev, avgRating: avg }));
            setIsLoading(false);
        }, (err) => {
            console.warn("Stats reviews error:", err);
            setIsLoading(false);
        });

        return () => {
            unsubUsers();
            unsubCourses();
            unsubReviews();
        };
    }, [db]);

    const StatItem = ({ label, value, colorClass }: { label: string, value: string | number, colorClass?: string }) => (
        <div className="flex flex-col items-center gap-2">
            <p className={cn("text-3xl md:text-5xl font-black transition-all duration-700", colorClass || "text-brand-primary")}>
                {isLoading && stats.memberCount === 0 ? "..." : (typeof value === 'number' && value >= 1000 ? `${(value/1000).toFixed(1)}k+` : value)}
            </p>
            <p className="text-[10px] md:text-xs font-black uppercase tracking-[0.2em] text-slate-500">
                {label}
            </p>
        </div>
    );

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12 text-center animate-in fade-in duration-1000">
            <StatItem label="Membres Ndara" value={stats.memberCount} />
            <StatItem label="Formations Premium" value={stats.courseCount} />
            <StatItem 
                label="Note Moyenne" 
                value={stats.avgRating > 0 ? `${stats.avgRating.toFixed(1)}/5` : "N/A"} 
                colorClass="text-brand-primary" 
            />
            <StatItem label="Support Mentor" value="24/7" colorClass="text-brand-primary" />
        </div>
    );
}