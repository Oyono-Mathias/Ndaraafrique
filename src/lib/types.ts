import type { Timestamp, FieldValue } from "firebase-admin/firestore";

/**
 * @fileOverview SOURCE DE VÉRITÉ UNIQUE - NDARA AFRIQUE v2.5
 * Contient toutes les interfaces partagées pour garantir la cohérence des données.
 */

export type UserRole = 'student' | 'instructor' | 'admin';

export type PaymentProvider = 'mesomb' | 'cinetpay' | 'moneroo' | 'wallet' | 'admin' | 'orange' | 'mtn' | 'wave' | 'manual' | 'admin_recharge' | 'simulated' | 'withdrawal';

export type StorageProvider = 'r2' | 'bunny' | 'firebase';

export interface Role {
  id: string;
  name: string;
  permissions: { [key: string]: boolean };
  createdAt?: Timestamp | FieldValue | Date;
  updatedAt?: Timestamp | FieldValue | Date;
}

export interface NdaraUser {
  uid: string;
  email: string;
  username: string;
  fullName: string;
  profilePictureURL?: string;
  profilePictureFallbackURL?: string;
  role: UserRole;
  availableRoles: UserRole[];
  status: 'active' | 'suspended' | 'deleted';
  statusReason?: string;
  isSuspect?: boolean;
  suspectReason?: string;
  balance: number;
  affiliateBalance?: number;
  pendingAffiliateBalance?: number;
  virtualBalance?: number;
  aiCredits: number;
  hasAIAccess: boolean;
  qualityScore?: number;
  totalReviews?: number;
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
  certifiedMobileNumbers?: {
    [key: string]: string;
  };
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
    telegramUrl?: string;
    whatsappUrl?: string;
    instagramUrl?: string;
    facebookUrl?: string;
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
  restrictions?: {
    canWithdraw: boolean;
    canSendMessage: boolean;
    canBuyCourse: boolean;
    canSellCourse: boolean;
    canAccessPlatform: boolean;
  };
}

export interface Settings {
  general: {
    siteName: string;
    logoUrl?: string;
    contactEmail?: string;
    contactPhone?: string;
    defaultLanguage: 'fr' | 'en' | 'sg';
  };
  storage: {
    maxFileSizeMb: number;
    videosProvider: StorageProvider;
    documentsProvider: StorageProvider;
    assetsProvider: StorageProvider;
    userFilesProvider: 'firebase';
  };
  payments: {
    currency: string;
    minDeposit: number;
    transactionFeePercent: number;
    paymentsEnabled: boolean;
  };
  users: {
    allowRegistration: boolean;
    allowInstructorSignup: boolean;
    autoApproveInstructors: boolean;
  };
  courses: {
    allowCourseCreation: boolean;
    requireAdminApproval: boolean;
    instructorRevenuePercent: number;
    certificateEnabled: boolean;
  };
  marketplace: {
    enableMarketplace: boolean;
    allowCourseBuyout: boolean;
    allowResaleRights: boolean;
    minimumResalePrice: number;
    resaleCommissionPercent: number;
  };
  ai: {
    aiEnabled: boolean;
    autoCorrection: boolean;
    autonomousTutor: boolean;
    fraudDetection: boolean;
    maxRequestsPerUser: number;
  };
  notifications: {
    emailNotifications: boolean;
    pushNotifications: boolean;
    adminAlerts: {
      newUser: boolean;
      newPayment: boolean;
      systemError: boolean;
    };
  };
  security: {
    maintenanceMode: boolean;
    activityLogsEnabled: boolean;
  };
  marketing: {
    globalAnnouncement: string;
    promoCodesEnabled: boolean;
    referralProgramEnabled: boolean;
  };
  appearance: {
    primaryColor: string;
    borderRadius: 'none' | 'md' | 'lg' | 'xl';
  };
  social: {
    facebookUrl?: string;
    instagramUrl?: string;
    twitterUrl?: string;
    linkedinUrl?: string;
    youtubeUrl?: string;
    telegramUrl?: string;
  };
  content?: {
    landingPage?: any;
    aboutPage?: any;
  };
}

export interface Course {
  id: string;
  title: string;
  description: string;
  instructorId: string;
  category: string;
  price: number;
  imageUrl?: string;
  status: 'Draft' | 'Published' | 'Pending Review';
  rating?: number;
  participantsCount?: number;
  createdAt?: Timestamp | FieldValue | Date;
  resaleRightsAvailable?: boolean;
  resaleRightsPrice?: number;
  buyoutStatus?: 'none' | 'requested' | 'approved';
  buyoutPrice?: number;
  isPlatformOwned?: boolean;
}

export interface Section {
  id: string;
  title: string;
  order: number;
}

export interface Lecture {
  id: string;
  title: string;
  type: 'video' | 'youtube' | 'text' | 'pdf';
  contentUrl?: string;
  textContent?: string;
  duration?: number;
  order: number;
  isFreePreview?: boolean;
  requiresValidation?: boolean;
  associatedQuizId?: string;
}

export interface Enrollment {
  id: string;
  studentId: string;
  courseId: string;
  courseTitle?: string;
  instructorId: string;
  status: 'active' | 'completed' | 'suspended';
  accessStatus: 'active' | 'revoked';
  progress: number;
  enrollmentDate: Timestamp | FieldValue | Date;
  lastAccessedAt: Timestamp | FieldValue | Date;
  priceAtEnrollment?: number;
  paymentId?: string;
  revocationReason?: string;
}

export interface CourseProgress {
  id: string;
  userId: string;
  courseId: string;
  courseTitle: string;
  courseCover?: string;
  progressPercent: number;
  completedLessons: string[];
  lastLessonId?: string;
  lastLessonTitle?: string;
  updatedAt: Timestamp | FieldValue | Date;
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
  type: 'wallet_topup' | 'course_purchase' | 'payout' | 'license_purchase';
  isSimulated: boolean;
  date: Timestamp | FieldValue | Date;
  metadata?: any;
}

export interface PayoutRequest {
  id: string;
  instructorId: string;
  amount: number;
  method: string;
  status: 'pending' | 'approved' | 'paid' | 'rejected';
  createdAt: Timestamp | FieldValue | Date;
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

export interface Notification {
  id: string;
  text: string;
  link?: string;
  type: 'success' | 'info' | 'reminder' | 'alert';
  read: boolean;
  createdAt: Timestamp | FieldValue | Date;
}

export interface Chat {
  id: string;
  participants: string[];
  lastMessage: string;
  lastSenderId: string;
  unreadBy?: string[];
  status?: 'active' | 'blocked';
  updatedAt: Timestamp | FieldValue | Date;
}

export interface Message {
  id: string;
  senderId: string;
  text: string;
  createdAt: Timestamp | FieldValue | Date;
  status?: 'sent' | 'delivered' | 'read';
}
