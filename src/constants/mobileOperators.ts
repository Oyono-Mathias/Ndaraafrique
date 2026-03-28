/**
 * @fileOverview Référentiel des opérateurs Mobile Money et moyens de paiement.
 */

export interface MobileOperator {
  id: string;
  name: string;
  logoUrl: string;
  color: string;
  textColor: string;
}

export const MOBILE_OPERATORS: Record<string, MobileOperator> = {
  mtn: {
    id: 'mtn',
    name: 'MTN MoMo',
    logoUrl: 'https://ndara-assets.b-cdn.net/operators/mtn_logo.png',
    color: 'bg-[#FFCC00]',
    textColor: 'text-black'
  },
  orange: {
    id: 'orange',
    name: 'Orange Money',
    logoUrl: 'https://ndara-assets.b-cdn.net/operators/orange_logo.png',
    color: 'bg-[#FF7900]',
    textColor: 'text-white'
  },
  wave: {
    id: 'wave',
    name: 'Wave',
    logoUrl: 'https://ndara-assets.b-cdn.net/operators/wave_logo.png',
    color: 'bg-[#1DC0F1]',
    textColor: 'text-white'
  },
  wallet: {
    id: 'wallet',
    name: 'Ndara Wallet',
    logoUrl: 'https://ndara-assets.b-cdn.net/logo.png',
    color: 'bg-primary',
    textColor: 'text-slate-950'
  },
  admin: {
    id: 'admin',
    name: 'Admin Recharge',
    logoUrl: 'https://ndara-assets.b-cdn.net/logo.png',
    color: 'bg-slate-800',
    textColor: 'text-white'
  }
};
