
import type { Timestamp, FieldValue } from "firebase/firestore";

export type UserRole = 'student' | 'instructor' | 'admin';
export type PaymentProvider = 'moneroo' | 'mesomb' | 'virtual' | 'wallet' | 'admin_recharge' | 'custom';

export interface PaymentMethod {
  id: string;
  name: string;
  logo: string;
  active: boolean;
  provider: PaymentProvider;
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
  createdAt?: Timestamp | FieldValue;
}

export interface NdaraUser {
  uid: string;
  email: string;
  username: string;
  fullName: string;
  phoneNumber?: string;
  role: UserRole;
  isInstructorApproved: boolean;
  status?: 'active' | 'suspended';
  balance?: number; 
  currency?: string;
  countryCode?: string;
  countryName?: string;
  profilePictureURL?: string;
  createdAt?: Timestamp | FieldValue;
  isProfileComplete?: boolean;
  preferredLanguage?: string;
  isOnline?: boolean;
  lastSeen?: Timestamp | FieldValue;
  affiliateBalance?: number;
  pendingAffiliateBalance?: number;
  affiliateStats?: {
      clicks: number;
      registrations: number;
      sales: number;
      earnings: number;
  };
};

export interface NdaraPaymentMetadata {
  userId: string;
  courseId: string;
  type: 'course_purchase' | 'wallet_topup' | 'license_purchase';
  affiliateId?: string;
  couponId?: string;
  reason?: string;
  adminId?: string;
}

export interface Payment {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  provider: PaymentProvider;
  status: 'Completed' | 'Pending' | 'Failed' | 'Refunded';
  date: Timestamp | FieldValue;
  courseTitle?: string;
  courseId?: string;
  instructorId?: string;
  metadata?: NdaraPaymentMetadata;
}

export interface PayoutRequest {
  id: string;
  instructorId: string;
  amount: number;
  method: 'mobile_money' | 'bank_transfer';
  status: 'pending' | 'approved' | 'paid' | 'rejected';
  createdAt: Timestamp | FieldValue;
}

export interface Settings {
  general: {
    siteName: string;
    contactEmail: string;
    supportPhone?: string;
    logoUrl?: string;
  };
  payments: {
    mesombEnabled: boolean;
    monerooEnabled: boolean;
    paymentMode: 'test' | 'live';
    enableMtn: boolean;
    enableOrange: boolean;
  };
  commercial: {
    currency: string;
    payoutDelayDays: number;
  };
  platform?: {
      maintenanceMode: boolean;
      announcementMessage?: string;
  };
}
