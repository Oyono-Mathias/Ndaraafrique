/**
 * @fileOverview Référentiel des logos par défaut.
 * Pointe exclusivement vers le dossier public/image/ avec des noms simplifiés.
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
    logoUrl: '/image/mtn.png',
  },
  orange: {
    id: 'orange',
    name: 'Orange Money',
    logoUrl: '/image/orange.png',
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
