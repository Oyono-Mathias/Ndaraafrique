import type { Timestamp, FieldValue } from "firebase/firestore";

/**
 * @fileOverview SOURCE DE VÉRITÉ UNIQUE - NDARA AFRIQUE v2.5
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
  isInstructorApproved: boolean;
  preferredLanguage?: 'fr' | 'en' | 'sg';
  isProfileComplete: boolean;
  createdAt?: Timestamp | FieldValue | Date;
  lastSeen?: Timestamp | FieldValue | Date;
  referralCode?: string;
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
    interestDomain: string;
  };
}

/* --- FINANCES --- */

export type TransactionStatus = 'pending' | 'completed' | 'failed' | 'cancelled';
export type TransactionType = 'deposit' | 'purchase' | 'commission' | 'payout';

export interface WalletTransaction {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  type: TransactionType;
  status: TransactionStatus;
  provider: string;
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
  metadata?: any;
}

export interface NdaraPaymentDetails {
  transactionId: string;
  gatewayTransactionId?: string;
  provider: string;
  amount: number;
  currency: string;
  metadata: {
    userId: string;
    courseId: string;
    type: 'course_purchase' | 'wallet_topup' | 'license_purchase';
    [key: string]: any;
  };
}

/* --- PÉDAGOGIE --- */

export interface Course {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
  instructorId: string;
  category: string;
  price: number;
  currency: string;
  status: 'Draft' | 'Published' | 'Pending Review';
  rating: number;
  participantsCount: number;
  createdAt: Timestamp | FieldValue | Date;
}

export interface Enrollment {
  id: string;
  studentId: string;
  courseId: string;
  progress: number;
  status: 'active' | 'completed';
  enrollmentDate: Timestamp | FieldValue | Date;
}
