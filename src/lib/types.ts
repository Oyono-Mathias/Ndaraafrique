import type { Timestamp, FieldValue } from "firebase/firestore";

/**
 * @fileOverview SOURCE DE VÉRITÉ UNIQUE - NDARA AFRIQUE v2.5
 * Contient toutes les interfaces partagées pour garantir la cohérence des données.
 */

export type UserRole = 'student' | 'instructor' | 'admin';

export interface NdaraUser {
  uid: string;
  email: string;
  username: string;
  fullName: string;
  profilePictureURL?: string;
  role: UserRole;
  availableRoles: UserRole[];
  status: 'active' | 'suspended';
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
    interestDomain: string;
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
    portfolioUrl?: string;
    linkedinUrl?: string;
    youtubeUrl?: string;
    submittedAt: Timestamp | FieldValue | Date;
    status: 'pending' | 'accepted' | 'rejected';
    decisionDate?: Timestamp | FieldValue | Date;
    feedback?: string;
  };
  buyoutSanctions?: {
    isSanctioned: boolean;
    reason: string;
    date: Timestamp | FieldValue | Date;
  };
  pedagogicalPreferences?: {
    aiAssistanceEnabled: boolean;
    aiInterventionLevel: 'low' | 'medium' | 'high';
  };
  instructorNotificationPreferences?: {
    newEnrollment: boolean;
    newMessage: boolean;
    newAssignmentSubmission: boolean;
    courseStatusUpdate: boolean;
    payoutUpdate: boolean;
  };
  notificationPreferences?: {
    newPayouts: boolean;
    newApplications: boolean;
    newSupportTickets: boolean;
    financialAnomalies: boolean;
  };
  permissions?: { [key: string]: boolean };
  isDemoAccount?: boolean;
}

/* --- SUPPORT UTILISATEUR --- */

export interface SupportTicket {
  id: string;
  userId: string;
  userName?: string;
  userEmail?: string;

  subject: string;
  message: string;

  status: 'open' | 'pending' | 'resolved' | 'closed';
  priority?: 'low' | 'medium' | 'high';

  adminResponse?: string;

  // 💬 mode chat (optionnel mais puissant)
  messages?: {
    senderId: string;
    text: string;
    createdAt: Timestamp | FieldValue | Date;
  }[];

  createdAt: Timestamp | FieldValue | Date;
  updatedAt?: Timestamp | FieldValue | Date;
  resolvedAt?: Timestamp | FieldValue | Date;
}

/* --- FINANCES --- */

export type TransactionStatus = 'pending' | 'completed' | 'failed' | 'cancelled' | 'approved' | 'paid' | 'rejected' | 'refunded';
export type TransactionType = 'deposit' | 'purchase' | 'commission' | 'payout' | 'wallet_topup' | 'course_purchase' | 'license_purchase';
export type PaymentProvider = 'mesomb' | 'moneroo' | 'cinetpay' | 'wallet' | 'admin_recharge' | 'manual' | 'orange' | 'mtn' | 'wave';

export interface WalletTransaction {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  type: TransactionType;
  status: TransactionStatus;
  provider: PaymentProvider;
  description: string;
  metadata?: any;
  createdAt: Timestamp | FieldValue | Date;
  updatedAt?: Timestamp | FieldValue | Date;
}

export interface Payment {
  id: string;
  userId: string;
  courseId?: string;
  courseTitle?: string;
  amount: number;
  currency: string;
  provider: string;
  status: 'completed' | 'pending' | 'failed' | 'refunded';
  date: Timestamp | FieldValue | Date;
  updatedAt?: Timestamp | FieldValue | Date;
  metadata?: {
    type?: string;
    adminId?: string;
    reason?: string;
    [key: string]: any;
  };
  fraudReview?: {
    isSuspicious: boolean;
    riskScore: number;
    reason: string;
    reviewed?: boolean;
  };
  platformFee?: number;
}

export interface PayoutRequest {
  id: string;
  instructorId: string;
  amount: number;
  method: 'mobile_money' | 'bank_transfer';
  status: 'pending' | 'approved' | 'paid' | 'rejected';
  createdAt: Timestamp | FieldValue | Date;
  processedAt?: Timestamp | FieldValue | Date;
  updatedAt?: Timestamp | FieldValue | Date;
}

export interface Payout {
  id: string;
  instructorId: string;
  amount: number;
  status: 'valide' | 'rejete' | 'en_attente';
  method: string;
  date: Timestamp | FieldValue | Date;
}

export interface AffiliateTransaction {
  id: string;
  affiliateId: string;
  buyerId: string;
  buyerName: string;
  courseId: string;
  courseTitle: string;
  amount: number;
  commissionAmount: number;
  status: 'pending' | 'approved' | 'paid' | 'cancelled';
  createdAt: Timestamp | FieldValue | Date;
  unlockDate: Timestamp | FieldValue | Date;
}

export interface NdaraPaymentDetails {
  transactionId: string | number;
  gatewayTransactionId?: string;
  provider: string;
  amount: number;
  currency: string;
  metadata: {
    userId: string;
    courseId: string;
    type?: string;
    [key: string]: any;
  };
}

export interface Coupon {
  id: string;
  code: string;
  courseId: string;
  courseTitle: string;
  instructorId: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  maxUses: number;
  usedCount: number;
  createdAt: Timestamp | FieldValue | Date;
  expiresAt: Timestamp | FieldValue | Date;
}

/* --- (le reste de ton fichier reste inchangé) --- */