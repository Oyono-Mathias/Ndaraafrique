import type { Timestamp, FieldValue } from "firebase/firestore";

/**
 * @fileOverview SOURCE DE VÉRITÉ UNIQUE - NDARA AFRIQUE v2.5
 * Contient toutes les interfaces partagées pour garantir la cohérence des données.
 */

export type UserRole = 'student' | 'instructor' | 'admin';

export type PaymentProvider = 'mesomb' | 'cinetpay' | 'moneroo' | 'wallet' | 'admin' | 'orange' | 'mtn' | 'wave' | 'manual' | 'admin_recharge' | 'simulated' | 'withdrawal' | 'moov' | 'mpesa';

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

export interface PaymentMethod {
  id: string;
  name: string;
  logo: string;
  provider: PaymentProvider;
  active: boolean;
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
  createdAt?: Timestamp | FieldValue | Date;
  updatedAt?: Timestamp | FieldValue | Date;
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
  platform?: {
    maintenanceMode?: boolean;
    allowInstructorSignup?: boolean;
    allowYoutube?: boolean;
    allowBunny?: boolean;
    announcementMessage?: string;
  };
}

export interface DesignSettings {
    primaryColor: string;
    borderRadius: 'none' | 'md' | 'lg' | 'xl';
    fontScale: 'small' | 'medium' | 'large';
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
  updatedAt?: Timestamp | FieldValue | Date;
  resaleRightsAvailable?: boolean;
  resaleRightsPrice?: number;
  buyoutStatus?: 'none' | 'requested' | 'approved';
  buyoutPrice?: number;
  isPlatformOwned?: boolean;
  isAiVerified?: boolean;
  lastAiAuditScore?: number;
  moderationFeedback?: string;
  learningObjectives?: string[];
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
  grantReason?: string;
  grantedBy?: string;
  expiresAt?: Timestamp | Date | null;
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
  updatedAt?: Timestamp | FieldValue | Date;
  createdAt?: Timestamp | FieldValue | Date;
  externalReference?: string;
  gatewayTransactionId?: string;
  manualValidationBy?: string;
  metadata?: any;
  fraudReview?: {
      isSuspicious: boolean;
      riskScore: number;
      reason: string;
      reviewed: boolean;
  };
}

export interface PayoutRequest {
  id: string;
  instructorId: string;
  amount: number;
  method: string;
  status: 'pending' | 'approved' | 'paid' | 'rejected';
  createdAt: Timestamp | FieldValue | Date;
  processedAt?: Timestamp | FieldValue | Date;
  updatedAt?: Timestamp | FieldValue | Date;
}

export interface Payout extends PayoutRequest {
    date: Timestamp | FieldValue | Date;
}

export interface RequestPayoutParams {
  instructorId: string;
  amount: number;
  method?: string;
  requesterId: string;
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

export interface Quiz {
  id: string;
  title: string;
  description?: string;
  courseId: string;
  sectionId: string;
  instructorId: string;
  questionsCount: number;
  createdAt?: Timestamp | FieldValue | Date;
  updatedAt?: Timestamp | FieldValue | Date;
}

export interface Question {
  id: string;
  text: string;
  order: number;
  options: {
    text: string;
    isCorrect: boolean;
  }[];
  createdAt?: Timestamp | FieldValue | Date;
}

export interface Assignment {
    id: string;
    title: string;
    description?: string;
    correctionGuide?: string;
    courseId: string;
    courseTitle?: string;
    sectionId: string;
    instructorId?: string;
    dueDate?: Timestamp | FieldValue | Date;
    attachments?: { name: string; url: string }[];
    createdAt?: Timestamp | FieldValue | Date;
}

export interface AssignmentSubmission {
    id: string;
    studentId: string;
    studentName: string;
    studentAvatarUrl?: string;
    instructorId: string;
    courseId: string;
    courseTitle: string;
    assignmentId: string;
    assignmentTitle: string;
    submissionContent?: string;
    submissionUrl?: string;
    grade?: number;
    feedback?: string;
    status: 'submitted' | 'graded';
    submittedAt: Timestamp | FieldValue | Date;
    gradedAt?: Timestamp | FieldValue | Date;
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

export interface Coupon {
    id: string;
    code: string;
    courseId: string;
    courseTitle: string;
    discountType: 'percentage' | 'fixed';
    discountValue: number;
    maxUses: number;
    usedCount: number;
    instructorId: string;
    expiresAt: Timestamp | FieldValue | Date;
    createdAt: Timestamp | FieldValue | Date;
}

export interface TrackingEvent {
    id: string;
    eventType: 'page_view' | 'cta_click' | 'payment_method_click' | 'affiliate_click';
    sessionId: string;
    pageUrl: string;
    metadata?: any;
    timestamp: Timestamp | FieldValue | Date;
}

export interface PushCampaign {
    id: string;
    message: string;
    target: 'all' | 'instructors' | 'students';
    status: 'sent' | 'scheduled';
    scheduledFor?: Timestamp | FieldValue | Date;
    sentAt?: Timestamp | FieldValue | Date;
    stats?: {
        delivered: number;
        clicked: number;
    };
    createdAt: Timestamp | FieldValue | Date;
}

export interface SecurityLog {
    id: string;
    eventType: string;
    userId?: string;
    targetId: string;
    details: string;
    status: 'open' | 'resolved';
    timestamp: Timestamp | FieldValue | Date;
}

export interface NdaraPaymentDetails {
    transactionId: string | number;
    gatewayTransactionId?: string;
    provider: PaymentProvider;
    amount: number;
    currency?: string;
    metadata: {
        userId: string;
        courseId?: string;
        courseTitle?: string;
        type?: 'wallet_topup' | 'course_purchase' | 'license_purchase' | 'deposit';
        isSimulated?: boolean;
        [key: string]: any;
    };
}

export interface NdaraTransaction {
    id: string;
    userId: string;
    type: 'deposit' | 'purchase' | 'payout' | 'affiliate_commission';
    amount: number;
    status: 'success' | 'failed' | 'pending';
    meta?: any;
    createdAt: Timestamp | FieldValue | Date;
}

export interface NdaraEarning {
    id: string;
    userId: string;
    type: 'course_sale' | 'license_sale' | 'affiliate_commission';
    amount: number;
    sourceId: string;
    createdAt: Timestamp | FieldValue | Date;
}

export interface UserActivity {
    id: string;
    userId: string;
    type: 'enrollment' | 'certificate' | 'review' | 'assignment' | 'payment';
    title: string;
    description?: string;
    link?: string;
    read: boolean;
    createdAt: Timestamp | FieldValue | Date;
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

export interface InvestorLead {
    id: string;
    fullName: string;
    email: string;
    organization?: string;
    message?: string;
    status: 'new' | 'contacted' | 'interested';
    createdAt: Timestamp | FieldValue | Date;
}
