import type { Timestamp, FieldValue } from "firebase/firestore";

/**
 * SOURCE DE VÉRITÉ UNIQUE - NDARA AFRIQUE v2.8 (STABLE)
 * ✅ Inclus : Coupons, Transactions et Notifications pour éviter les erreurs de build en série.
 */

export type UserRole = 'student' | 'instructor' | 'admin';

export type PaymentProvider =
  | 'mesomb'
  | 'cinetpay'
  | 'moneroo'
  | 'wallet'
  | 'admin'
  | 'orange'
  | 'mtn'
  | 'wave'
  | 'manual'
  | 'admin_recharge';

/* =========================
   ROLES & PERMISSIONS
========================= */
export interface Role {
  id: string;
  name: string;
  permissions: Record<string, boolean>;
  createdAt?: Timestamp | FieldValue | Date;
  updatedAt?: Timestamp | FieldValue | Date;
}

/* =========================
   USER
========================= */
export interface NdaraUser {
  uid: string;
  email: string;
  username: string;
  fullName: string;
  role: UserRole;
  availableRoles?: UserRole[];
  profilePictureURL?: string;
  status: 'active' | 'suspended' | 'deleted';
  balance: number;
  affiliateBalance?: number;
  pendingAffiliateBalance?: number;
  virtualBalance?: number;
  isInstructorApproved: boolean;
  preferredLanguage?: 'fr' | 'en' | 'sg';
  isProfileComplete: boolean;
  createdAt?: Timestamp | FieldValue | Date;
  lastSeen?: Timestamp | FieldValue | Date;
  lastLogin?: Timestamp | FieldValue | Date;
  isOnline?: boolean;
  phoneNumber?: string;
  countryName?: string;
  countryCode?: string;
  bio?: string;
  rating?: number;
  referralCode?: string;
  referredBy?: string | null;
  affiliateStats?: {
    clicks: number;
    registrations: number;
    sales: number;
    earnings: number;
  };
  payoutInfo?: {
    mobileMoneyNumber?: string;
  };
  careerGoals?: {
    currentRole?: string;
    interestDomain?: string;
    mainGoal?: string;
  };
  socialLinks?: {
    website?: string;
    twitter?: string;
    linkedin?: string;
    youtube?: string;
  };
  instructorApplication?: {
    specialty: string;
    professionalExperience: string;
    firstCourseTitle: string;
    firstCourseDescription: string;
    whatsappNumber: string;
    submittedAt: Timestamp | FieldValue | Date;
    status: 'pending' | 'accepted' | 'rejected';
    decisionDate?: Timestamp | FieldValue | Date;
    feedback?: string;
  };
  restrictions?: {
    canWithdraw?: boolean;
    canSendMessage?: boolean;
    canBuyCourse?: boolean;
    canSellCourse?: boolean;
    canAccessPlatform?: boolean;
  };
  sanctions?: {
    isSanctioned: boolean;
    reason: string;
    imposedBy: string;
    date: Timestamp | FieldValue | Date;
    expiresAt?: Timestamp | FieldValue | Date | null;
  };
  permissions?: Record<string, boolean>;
  badges?: string[];
  isDemoAccount?: boolean;
}

/* =========================
   COURSES, QUIZZES & COUPONS
========================= */
export interface Course {
  id: string;
  title: string;
  description: string;
  instructorId: string;
  category: string;
  price: number;
  status: 'Draft' | 'Published' | 'Pending Review';
  imageUrl?: string;
  rating?: number;
  participantsCount?: number;
  createdAt?: Timestamp | FieldValue | Date;
  updatedAt?: Timestamp | FieldValue | Date;
  publishedAt?: Timestamp | FieldValue | Date | null;
  resaleRightsAvailable?: boolean;
  resaleRightsPrice?: number;
  buyoutStatus?: 'none' | 'requested' | 'approved';
  buyoutPrice?: number;
}

export interface QuestionOption {
  text: string;
  isCorrect: boolean;
}

export interface Question {
  id: string;
  text: string;
  options: QuestionOption[];
}

export interface Quiz {
  id: string;
  title: string;
  description?: string;
  courseId: string;
  questions?: Question[];
}

// ✅ FIX : Ajout de l'interface Coupon demandée par Vercel
export interface Coupon {
  id: string;
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  courseId: string;
  instructorId: string;
  maxUses?: number;
  usedCount: number;
  isActive: boolean;
  expiresAt?: Timestamp | FieldValue | Date | null;
  createdAt: Timestamp | FieldValue | Date;
}

/* =========================
   PAYMENTS, PAYOUTS & TRANSACTIONS
========================= */
export interface Payment {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  provider: PaymentProvider | string;
  status: 'completed' | 'pending' | 'failed';
  date: Timestamp | FieldValue | Date;
  metadata?: Record<string, any>;
  platformFee?: number;
}

export interface Transaction {
  id: string;
  userId: string;
  amount: number;
  type: 'deposit' | 'withdrawal' | 'purchase' | 'sale' | 'affiliate_commission' | 'refund';
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  description?: string;
  createdAt: Timestamp | FieldValue | Date;
  metadata?: Record<string, any>;
}

export interface PayoutRequest {
  id: string;
  instructorId: string;
  amount: number;
  method: 'mobile_money' | 'bank_transfer';
  status: 'pending' | 'approved' | 'paid' | 'rejected';
  createdAt: Timestamp | FieldValue | Date;
  processedAt?: Timestamp | FieldValue | Date;
}

export interface RequestPayoutParams {
  instructorId: string;
  requesterId: string;
  amount: number;
  method: 'mobile_money' | 'bank_transfer';
}

/* =========================
   SETTINGS (CORRIGÉ POUR LE BUILD)
========================= */
export interface Settings {
  general: {
    siteName: string;
    contactEmail: string;
    defaultLanguage: 'fr' | 'en' | 'sg';
  };

  platform?: {
    allowInstructorSignup?: boolean;
    maintenanceMode?: boolean;
    [key: string]: any;
  };

  instructors?: {
    autoApproval?: boolean;
  };

  payments: {
    paymentsEnabled: boolean;
    currency: string;
    transactionFeePercent: number;
    operatorCommission: number;
    minDeposit: number;
    maxDeposit: number;
    walletEnabled: boolean;
    minimumPayoutAmount: number;
    paymentMode: 'test' | 'live';
  };

  marketplace?: {
    minimumResalePrice?: number;
  };

  security: {
    maintenanceMode: boolean;
  };
}

/* =========================
   GEO / COUNTRIES
========================= */
export interface PaymentMethod {
  id: string;
  name: string;
  provider: PaymentProvider | string;
  active: boolean;
  logo?: string;
}

export interface Country {
  id: string;
  name: string;
  code: string;
  currency: string;
  prefix: string;
  flagEmoji: string;
  active: boolean;
  paymentMethods: PaymentMethod[];
}

/* =========================
   NOTIFICATIONS (PRÉVENTION)
========================= */
export interface NdaraNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'transaction' | 'course';
  read: boolean;
  createdAt: Timestamp | FieldValue | Date;
  actionUrl?: string;
}
