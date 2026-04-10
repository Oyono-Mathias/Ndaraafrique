import type { Timestamp, FieldValue } from "firebase/firestore";

/**
 * SOURCE DE VÉRITÉ UNIQUE - NDARA AFRIQUE v3.1 (ULTIMATE STABLE)
 * ✅ Correctif : Export individuel de PaymentMethod pour countryActions.ts
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
   USER & ROLES
========================= */
export interface Role {
  id: string;
  name: string;
  permissions: Record<string, boolean>;
  createdAt?: Timestamp | FieldValue | Date;
  updatedAt?: Timestamp | FieldValue | Date;
}

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
  isPlatformOwned?: boolean; 
  resaleRightsAvailable?: boolean;
  resaleRightsPrice?: number;
  buyoutStatus?: 'none' | 'requested' | 'approved';
  buyoutPrice?: number;
  level?: 'beginner' | 'intermediate' | 'advanced';
  tags?: string[];
}

export interface Quiz {
  id: string;
  title: string;
  description?: string;
  courseId: string;
  questions?: {
    id: string;
    text: string;
    options: { text: string; isCorrect: boolean; }[];
  }[];
}

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
   LEARNING & SUBMISSIONS
========================= */
export interface Enrollment {
  id: string;
  userId: string;
  courseId: string;
  enrolledAt: Timestamp | FieldValue | Date;
  progress: number;
  completed: boolean;
  lastAccessedAt?: Timestamp | FieldValue | Date;
}

export interface Assignment {
  id: string;
  courseId: string;
  title: string;
  description: string;
  createdAt: Timestamp | FieldValue | Date;
}

export interface AssignmentSubmission {
  id: string;
  assignmentId: string;
  courseId: string;
  studentId: string;
  instructorId: string;
  contentURL?: string;
  status: 'pending' | 'graded' | 'rejected';
  grade?: number;
  feedback?: string;
  submittedAt: Timestamp | FieldValue | Date;
  gradedAt?: Timestamp | FieldValue | Date;
}

/* =========================
   FINANCE & TRANSACTIONS
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
}

export interface Transaction {
  id: string;
  userId: string;
  amount: number;
  type: 'deposit' | 'withdrawal' | 'purchase' | 'sale' | 'affiliate_commission' | 'refund';
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  createdAt: Timestamp | FieldValue | Date;
}

export interface PayoutRequest {
  id: string;
  instructorId: string;
  amount: number;
  method: 'mobile_money' | 'bank_transfer';
  status: 'pending' | 'approved' | 'paid' | 'rejected';
  createdAt: Timestamp | FieldValue | Date;
}

/* =========================
   GEO & PAYS (FIX EXPORT)
========================= */
// ✅ Sorti de l'interface pour être exportable individuellement
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
   SETTINGS & NOTIFICATIONS
========================= */
export interface Settings {
  general: { siteName: string; contactEmail: string; defaultLanguage: 'fr' | 'en' | 'sg'; };
  platform?: { allowInstructorSignup?: boolean; maintenanceMode?: boolean; [key: string]: any; };
  payments: {
    paymentsEnabled: boolean;
    currency: string;
    transactionFeePercent: number;
    minimumPayoutAmount: number;
    paymentMode: 'test' | 'live';
    [key: string]: any;
  };
}

export interface NdaraNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  createdAt: Timestamp | FieldValue | Date;
}
