'use client';

import { useEffect, useMemo } from 'react';
import { getFirestore, doc, onSnapshot } from 'firebase/firestore';
import type { Settings, DesignSettings } from '@/lib/types';

/**
 * @fileOverview Composant invisible injectant les styles dynamiques.
 * Transforme les choix de l'admin en variables CSS root.
 */
export function DynamicDesignManager() {
  useEffect(() => {
    const db = getFirestore();
    const unsub = onSnapshot(doc(db, 'settings', 'global'), (snap) => {
      if (snap.exists()) {
        const settings = snap.data() as Settings;
        applyStyles(settings.design || {});
      }
    });
    return () => unsub();
  }, []);

  const applyStyles = (design: DesignSettings) => {
    const root = document.documentElement;

    // 1. Gestion des Couleurs Primaires
    const colors = {
      emerald: "161 72% 40%", // Vert Ndara
      ocre: "32 70% 45%",    // Ocre Sahélien
      blue: "217 91% 60%",   // Tech Blue
      gold: "45 90% 50%",    // African Gold
    };
    const primary = colors[design.primaryColor as keyof typeof colors] || colors.emerald;
    root.style.setProperty('--primary', primary);

    // 2. Gestion de la Taille du Texte
    const scales = {
      small: "0.9rem",
      medium: "1rem",
      large: "1.1rem",
    };
    const fontSize = scales[design.fontScale as keyof typeof scales] || scales.medium;
    root.style.setProperty('font-size', fontSize);

    // 3. Style des Cartes (Radius)
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
