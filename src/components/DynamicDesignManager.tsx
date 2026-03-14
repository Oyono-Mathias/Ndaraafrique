'use client';

import { useEffect } from 'react';
import { getFirestore, doc, onSnapshot } from 'firebase/firestore';
import type { Settings, DesignSettings } from '@/lib/types';

/**
 * @fileOverview Composant invisible injectant les styles dynamiques.
 * Transforme les choix de l'admin en variables CSS root.
 * ✅ RÉSOLU : Supporte les couleurs hexadécimales personnalisées.
 */
export function DynamicDesignManager() {
  useEffect(() => {
    const db = getFirestore();
    const unsub = onSnapshot(doc(db, 'settings', 'global'), (snap) => {
      if (snap.exists()) {
        const settings = snap.data() as Settings;
        applyStyles(settings.branding || {});
      }
    });
    return () => unsub();
  }, []);

  const applyStyles = (design: DesignSettings) => {
    const root = document.documentElement;

    // 1. Gestion des Couleurs Primaires
    if (design.primaryColor) {
        // Si c'est une couleur hex ou HSL
        root.style.setProperty('--primary', design.primaryColor);
    }

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
