import type { Timestamp, FieldValue } from "firebase/firestore";

/**
 * SOURCE DE VÉRITÉ UNIQUE - NDARA AFRIQUE v3.3 (STABILISÉE)
 * ✅ Correctif : Ajout de learningObjectives et métadonnées manquantes dans Course.
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
  pedagogicalPreferences?: {
    aiAssistanceEnabled?: boolean;
    aiInterventionLevel?: 'low' | 'medium' | 'high';
  };
  instructorNotificationPreferences?: {
    newEnrollment?: boolean;
    newMessage?: boolean;
    newAssignmentSubmission?: boolean;
    courseStatusUpdate?: boolean;
    payoutUpdate?: boolean;
  };
  notificationPreferences?: {
    newPayouts?: boolean;
    newApplications?: boolean;
    newSupportTickets?: boolean;
    financialAnomalies?: boolean;
    [key: string]: boolean | undefined;
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
    linkedinUrl?: string;
    youtubeUrl?: string;
    portfolioUrl?: string;
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
  buyoutSanctions?: {
    isSanctioned: boolean;
    reason: string;
    date: Timestamp | FieldValue | Date;
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
  courseId?: string; // Aliases used in some actions
  creatorId?: string;
  title: string;
  description: string;
  instructorId: string;
  category: string;
  price: number;
  currency?: string;
  status: 'Draft' | 'Published' | 'Pending Review';
  imageUrl?: string;
  rating?: number;
  participantsCount?: number;
  learningObjectives?: string[];
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
  ownerId?: string;
  rightsChain?: string[];
}

export interface CourseQuestion {
  id: string;
  courseId: string;
  courseTitle: string;
  studentId: string;
  studentName: string;
  studentAvatarUrl?: string;
  instructorId: string;
  questionText: string;
  answerText?: string;
  status: 'pending' | 'answered';
  createdAt: Timestamp | FieldValue | Date;
  answeredAt?: Timestamp | FieldValue | Date;
}

export interface QuestionOption {
  text: string;
  isCorrect: boolean;
}

export interface Question {
  id: string;
  text: string;
  order: number;
  options: QuestionOption[];
}

export interface Quiz {
  id: string;
  title: string;
  description?: string;
  courseId: string;
  sectionId: string;
  instructorId: string;
  questionsCount?: number;
  createdAt?: Timestamp | FieldValue | Date;
}

export interface Coupon {
  id: string;
  code: string;
  courseTitle?: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  courseId: string;
  instructorId: string;
  maxUses: number;
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
  studentId: string;
  courseId: string;
  instructorId: string;
  enrollmentDate: Timestamp | FieldValue | Date;
  progress: number;
  status: 'active' | 'completed' | 'suspended';
  lastAccessedAt?: Timestamp | FieldValue | Date;
  priceAtEnrollment?: number;
}

export interface Assignment {
  id: string;
  courseId: string;
  courseTitle?: string;
  instructorId?: string;
  title: string;
  description: string;
  correctionGuide?: string;
  dueDate?: Timestamp | FieldValue | Date;
  attachments?: { name: string; url: string; }[];
  createdAt: Timestamp | FieldValue | Date;
}

export interface AssignmentSubmission {
  id: string;
  assignmentId: string;
  assignmentTitle: string;
  courseId: string;
  courseTitle: string;
  studentId: string;
  studentName: string;
  studentAvatarUrl?: string;
  instructorId: string;
  submissionContent?: string;
  submissionUrl?: string;
  status: 'submitted' | 'graded' | 'rejected';
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
  status: 'completed' | 'pending' | 'failed' | 'refunded';
  date: Timestamp | FieldValue | Date;
  metadata?: Record<string, any>;
  platformFee?: number;
  courseTitle?: string;
  fraudReview?: {
    isSuspicious: boolean;
    riskScore: number;
    reviewed: boolean;
  };
}

export interface Payout {
  id: string;
  instructorId: string;
  amount: number;
  status: 'en_attente' | 'valide' | 'rejete';
  date: Timestamp | FieldValue | Date;
  method?: string;
}

export interface PayoutRequest {
  id: string;
  instructorId: string;
  amount: number;
  method: 'mobile_money' | 'bank_transfer';
  status: 'pending' | 'approved' | 'paid' | 'rejected';
  createdAt: Timestamp | FieldValue | Date;
  updatedAt?: Timestamp | FieldValue | Date;
}

export interface RequestPayoutParams {
  instructorId: string;
  amount: number;
  method: 'mobile_money' | 'bank_transfer';
  requesterId: string;
}

/* =========================
   GEO & PAYS
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
   SETTINGS & NOTIFICATIONS
========================= */
export interface DesignSettings {
  primaryColor: string;
  borderRadius: 'none' | 'md' | 'lg' | 'xl';
  fontScale: 'small' | 'medium' | 'large';
}

export interface Settings {
  general: { 
    siteName: string; 
    contactEmail: string; 
    defaultLanguage: 'fr' | 'en' | 'sg';
    supportPhone?: string;
    address?: string;
    timezone?: string;
    logoUrl?: string;
    loginBackgroundImage?: string;
  };
  platform?: { 
    allowInstructorSignup?: boolean; 
    maintenanceMode?: boolean; 
    announcementMessage?: string;
    allowCourseBuyout?: boolean;
    allowResaleRights?: boolean;
    ai?: {
      autoCorrection: boolean;
      autonomousTutor: boolean;
      fraudDetection: boolean;
    };
    [key: string]: any; 
  };
  appearance?: DesignSettings;
  payments: {
    paymentsEnabled: boolean;
    currency: string;
    transactionFeePercent: number;
    minimumPayoutAmount: number;
    paymentMode: 'test' | 'live';
    minDeposit?: number;
    walletEnabled?: boolean;
    operatorCommission?: number;
    mesombEnabled?: boolean;
    [key: string]: any;
  };
  users?: {
    allowRegistration?: boolean;
    requireEmailVerification?: boolean;
    autoApproveInstructors?: boolean;
    maxAccountsPerUser?: number;
  };
  courses?: {
    allowCourseCreation?: boolean;
    requireAdminApproval?: boolean;
    minimumCoursePrice?: number;
    instructorRevenuePercent?: number;
    certificateEnabled?: boolean;
  };
  marketplace?: {
    enableMarketplace?: boolean;
    minimumResalePrice?: number;
    resaleCommissionPercent?: number;
    allowLicenseResale?: boolean;
  };
  ai: {
    aiEnabled: boolean;
    modelName: string;
    maxRequestsPerUser: number;
    contentGenerationEnabled: boolean;
  };
  notifications: {
    emailNotifications: boolean;
    pushNotifications: boolean;
    adminAlerts: {
      newUser: boolean;
      newPayment: boolean;
    };
  };
  security: {
    maintenanceMode: boolean;
    enable2fa: boolean;
    maxLoginAttempts: number;
  };
  localization: {
    autoDetectLanguage: boolean;
  };
  marketing: {
    globalAnnouncement: string;
    promoCodesEnabled: boolean;
    referralProgramEnabled: boolean;
  };
  finance: {
    minWithdrawal: number;
    withdrawalDelayDays: number;
    autoPayoutEnabled: boolean;
  };
  advanced: {
    debugMode: boolean;
  };
  commercial?: {
    instructorShare?: number;
    payoutDelayDays?: number;
  };
  affiliate?: {
    commissionRate?: number;
  };
  content?: {
    landingPage?: any;
    aboutPage?: any;
  };
  social?: {
    facebookUrl?: string;
    twitterUrl?: string;
    linkedinUrl?: string;
    instagramUrl?: string;
    youtubeUrl?: string;
    telegramUrl?: string;
  };
  legal?: {
    termsOfService?: string;
    privacyPolicy?: string;
  };
}

export interface Notification {
  id: string;
  text: string;
  link?: string;
  type: 'info' | 'success' | 'reminder' | 'alert';
  read: boolean;
  createdAt: Timestamp | FieldValue | Date;
}

export interface CartItem {
  id: string;
  courseId: string;
  title: string;
  price: number;
  imageUrl?: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  billingCycle: 'monthly' | 'yearly';
  features: string[];
  active: boolean;
  targetRole?: string;
  description?: string;
}

export interface Section {
  id: string;
  title: string;
  order: number;
  createdAt?: Timestamp | FieldValue | Date;
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
}

export interface Review {
  id: string;
  courseId: string;
  studentId: string;
  instructorId: string;
  rating: number;
  comment: string;
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

export interface Chat {
  id: string;
  participants: string[];
  lastMessage: string;
  updatedAt: Timestamp | FieldValue | Date;
  unreadBy?: string[];
  status?: 'active' | 'blocked';
}

export interface Message {
  id: string;
  senderId: string;
  text: string;
  createdAt: Timestamp | FieldValue | Date;
  status?: 'sent' | 'read';
}

export interface SupportTicket {
  id: string;
  userId: string;
  subject: string;
  category: 'Paiement' | 'Technique' | 'Pédagogique';
  status: 'ouvert' | 'fermé';
  lastMessage: string;
  courseId: string;
  instructorId: string;
  createdAt: Timestamp | FieldValue | Date;
  updatedAt: Timestamp | FieldValue | Date;
  resolution?: string;
}

export interface AdminAuditLog {
  id: string;
  adminId: string;
  eventType: string;
  target: { id: string; type: string };
  details: string;
  timestamp: Timestamp | FieldValue | Date;
}

export interface SecurityLog {
  id: string;
  userId?: string;
  eventType: string;
  details: string;
  timestamp: Timestamp | FieldValue | Date;
  status?: 'open' | 'resolved';
  targetId?: string;
}

export interface TrackingEvent {
  id: string;
  eventType: string;
  sessionId: string;
  pageUrl: string;
  timestamp: Timestamp | FieldValue | Date;
}

export interface RecommendedCourseItem {
  courseId: string;
  title: string;
  coverImage: string;
  instructorId: string;
  price: number;
  score: number;
}

export interface UserRecommendations {
  userId: string;
  courses: RecommendedCourseItem[];
  updatedAt: Timestamp | FieldValue | Date;
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
    type?: 'course_purchase' | 'wallet_topup';
    affiliateId?: string;
    couponId?: string;
    fraudScore?: number;
  };
}

export interface InvestorLead {
  id: string;
  fullName: string;
  email: string;
  organization?: string;
  message?: string;
  status: 'new' | 'contacted' | 'interested';
  createdAt: Timestamp | FieldValue | Date;
  updatedAt: Timestamp | FieldValue | Date;
}
