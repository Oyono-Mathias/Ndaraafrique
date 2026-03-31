'use client';

import { useEffect } from 'react';
import { getFirestore, doc, onSnapshot } from 'firebase/firestore';
import type { Settings, DesignSettings } from '@/lib/types';

const DEFAULT_DESIGN: DesignSettings = {
  primaryColor: '#10b981',
  borderRadius: 'lg',
  fontScale: 'medium',
};

/**
 * @fileOverview Composant invisible injectant les styles dynamiques.
 * Transforme les choix de l'admin en variables CSS root.
 * ✅ RÉSOLU : Typage strict DesignSettings via fusion avec valeurs par défaut.
 */
export function DynamicDesignManager() {
  useEffect(() => {
    const db = getFirestore();
    const unsub = onSnapshot(doc(db, 'settings', 'global'), (snap) => {
      if (snap.exists()) {
        const settings = snap.data() as Settings;
        
        // On fusionne les réglages reçus avec les valeurs par défaut
        // pour garantir un objet DesignSettings complet à applyStyles.
        applyStyles({
          ...DEFAULT_DESIGN,
          ...settings.appearance,
        });
      } else {
        applyStyles(DEFAULT_DESIGN);
      }
    });
    return () => unsub();
  }, []);

  const applyStyles = (design: DesignSettings) => {
    const root = document.documentElement;

    // 1. Gestion des Couleurs
    if (design.primaryColor) {
        root.style.setProperty('--primary-hex', design.primaryColor);
    }

    // 2. Style des Cartes (Radius)
    const radii = {
      none: "0px",
      md: "12px",
      lg: "24px",
      xl: "40px",
    };
    const radius = radii[design.borderRadius] || radii.lg;
    root.style.setProperty('--radius', radius);
  };

  return null;
}
