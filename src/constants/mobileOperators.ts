/**
 * @fileOverview Référentiel des opérateurs Mobile Money et moyens de paiement.
 * Basé sur les fichiers réels du dossier public/image/.
 */

export interface MobileOperator {
  id: string;
  name: string;
  logoUrl: string;
}

export const MOBILE_OPERATORS: Record<string, MobileOperator> = {
  mtn: {
    id: 'mtn',
    name: 'MTN MoMo',
    logoUrl: '/image/mtn-momo.png',
  },
  orange: {
    id: 'orange',
    name: 'Orange Money',
    logoUrl: '/image/orange-money.png',
  },
  wave: {
    id: 'wave',
    name: 'Wave',
    logoUrl: '/image/wave.png',
  },
  wallet: {
    id: 'wallet',
    name: 'Ndara Wallet',
    logoUrl: '/logo.png',
  },
  admin: {
    id: 'admin',
    name: 'Admin Recharge',
    logoUrl: '/logo.png',
  }
};
