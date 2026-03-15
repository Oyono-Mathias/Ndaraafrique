'use client';

import { useState } from 'react';
import { useRole } from '@/context/RoleContext';
import { useRouter, usePathname } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { initiateMeSombPayment } from '@/actions/meSombActions';
import type { Course } from '@/lib/types';
import { useLocale } from 'next-intl';

/**
 * @fileOverview Hook de gestion des achats pour la Landing Page et le Catalogue.
 * Permet de lier n'importe quel bouton de "Carte de Cours" au tunnel de paiement.
 */

export function usePurchase() {
  const { user, currentUser } = useRole();
  const router = useRouter();
  const pathname = usePathname();
  const locale = useLocale();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  /**
   * Initie le processus d'achat pour une formation.
   * @param course - L'objet Course à acheter.
   * @param gateway - La passerelle préférée ('moneroo' | 'mesomb').
   */
  const initiatePurchase = async (course: Course, gateway: 'moneroo' | 'mesomb' = 'moneroo') => {
    // 1. Vérification de l'authentification
    if (!user) {
      toast({
        title: "Connexion requise",
        description: "Veuillez vous connecter pour acquérir cette formation.",
      });
      // Redirection vers login avec retour automatique
      const redirectUrl = `/${locale}/login?tab=register&redirect=${encodeURIComponent(pathname)}`;
      router.push(redirectUrl);
      return;
    }

    // 2. Si le cours est gratuit, on redirige vers le détail pour l'inscription directe
    if (course.price === 0) {
      router.push(`/${locale}/course/${course.id}`);
      return;
    }

    // 3. Redirection vers le tunnel de checkout sécurisé (Préféré pour la conversion)
    router.push(`/${locale}/student/checkout/${course.id}?gateway=${gateway}`);
  };

  return {
    initiatePurchase,
    isProcessing,
  };
}
