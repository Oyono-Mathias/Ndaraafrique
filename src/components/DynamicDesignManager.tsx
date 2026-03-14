'use client';

import { useEffect } from 'react';
import { getFirestore, doc, onSnapshot } from 'firebase/firestore';
import type { Settings, DesignSettings } from '@/lib/types';

/**
 * @fileOverview Composant invisible injectant les styles dynamiques.
 * Transforme les choix de l'admin en variables CSS root.
 * ✅ RÉSOLU : Support du format HEX et des arrondis variables.
 */
export function DynamicDesignManager() {
  useEffect(() => {
    const db = getFirestore();
    const unsub = onSnapshot(doc(db, 'settings', 'global'), (snap) => {
      if (snap.exists()) {
        const settings = snap.data() as Settings;
        applyStyles(settings.appearance || {});
      }
    });
    return () => unsub();
  }, []);

  const applyStyles = (design: DesignSettings) => {
    const root = document.documentElement;

    // 1. Gestion des Couleurs (Conversion HEX vers HSL si nécessaire ou injection brute)
    if (design.primaryColor) {
        // Pour Tailwind HSL, on préfère injecter directement si c'est possible
        // Note: Ici on simplifie en injectant la couleur comme variable CSS
        root.style.setProperty('--primary-hex', design.primaryColor);
    }

    // 2. Style des Cartes (Radius)
    const radii = {
      none: "0px",
      md: "12px",
      lg: "24px",
      xl: "40px",
    };
    const radius = radii[design.borderRadius as keyof typeof radii] || radii.lg;
    root.style.setProperty('--radius', radius);
  };

  return null;
}
