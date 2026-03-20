import type { Timestamp, FieldValue } from "firebase/firestore";

/**
 * @fileOverview Définitions des types et interfaces globaux pour Ndara Afrique.
 * ✅ CENTRALISÉ : Toutes les entités Firestore sont typées ici.
 */

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

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  billingCycle: 'monthly' | 'yearly';
  features: string[];
  isActive: boolean;
  targetRole: UserRole;
  createdAt: Timestamp | FieldValue;
}

export interface NdaraUser {
  uid: string;
  email: string;
  username: string;
  fullName: string;
  phoneNumber?: string;
  role: UserRole;
  availableRoles: UserRole[];
  isInstructorApproved: boolean;
  status?: 'active' | 'suspended';
  balance?: number; 
  currency?: string;
  countryCode?: string;
  countryName?: string;
  profilePictureURL?: string;
  createdAt?: Timestamp | FieldValue;
  lastLogin?: Timestamp | FieldValue;
  isProfileComplete?: boolean;
  preferredLanguage?: string;
  isOnline?: boolean;
  lastSeen?: Timestamp | FieldValue;
  affiliateBalance?: number;
  pendingAffiliateBalance?: number;
  referredBy?: string | null;
  referralCode?: string;
  bio?: string;
  isDemoAccount?: boolean;
  virtualBalance?: number;
  rating?: number;
  socialLinks?: {
    website?: string;
    twitter?: string;
    linkedin?: string;
    youtube?: string;
  };
  payoutInfo?: {
    mobileMoneyNumber?: string;
    bankInfo?: string;
  };
  careerGoals?: {
    currentRole?: string;
    interestDomain?: string;
    mainGoal?: string;
  };
  instructorApplication?: {
    specialty: string;
    professionalExperience: string;
    firstCourseTitle: string;
    firstCourseDescription: string;
    whatsappNumber: string;
    portfolioUrl?: string;
    linkedinUrl?: string;
    submittedAt?: Timestamp | FieldValue;
    status?: 'pending' | 'accepted' | 'rejected';
    decisionDate?: Timestamp | FieldValue;
    feedback?: string;
  };
  buyoutSanctions?: {
    isSanctioned: boolean;
    reason: string;
    date: Timestamp | FieldValue;
  };
  affiliateStats?: {
      clicks: number;
      registrations: number;
      sales: number;
      earnings: number;
  };
  permissions?: Record<string, boolean>;
  notificationPreferences?: {
    newPayouts?: boolean;
    newApplications?: boolean;
    newSupportTickets?: boolean;
    financialAnomalies?: boolean;
  };
  instructorNotificationPreferences?: {
    newEnrollment?: boolean;
    newMessage?: boolean;
    newAssignmentSubmission?: boolean;
    courseStatusUpdate?: boolean;
    payoutUpdate?: boolean;
  };
  pedagogicalPreferences?: {
    aiAssistanceEnabled?: boolean;
    aiInterventionLevel?: 'low' | 'medium' | 'high';
  };
  badges?: string[];
};

export interface Course {
  id: string;
  courseId: string;
  title: string;
  description: string;
  instructorId: string;
  category: string;
  price: number;
  status: 'Draft' | 'Published' | 'Pending Review';
  rating?: number;
  participantsCount?: number;
  imageUrl?: string;
  createdAt?: Timestamp | FieldValue;
  updatedAt?: Timestamp | FieldValue;
  learningObjectives?: string[];
  ownerId?: string;
  creatorId?: string;
  isPlatformOwned?: boolean;
  resaleRightsAvailable?: boolean;
  resaleRightsPrice?: number;
  buyoutStatus?: 'none' | 'requested' | 'approved';
  buyoutPrice?: number;
  rightsChain?: string[];
  moderationFeedback?: string;
}

export interface Section {
  id: string;
  title: string;
  order: number;
  createdAt: Timestamp | FieldValue;
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
  createdAt: Timestamp | FieldValue;
  description?: string;
}

export interface Quiz {
  id: string;
  courseId: string;
  sectionId: string;
  instructorId: string;
  title: string;
  description?: string;
  questionsCount: number;
  createdAt: Timestamp | FieldValue;
  updatedAt: Timestamp | FieldValue;
}

export interface Question {
  id: string;
  text: string;
  order: number;
  options: {
    text: string;
    isCorrect: boolean;
  }[];
  createdAt: Timestamp | FieldValue;
}

export interface Assignment {
  id: string;
  courseId: string;
  sectionId: string;
  instructorId?: string;
  courseTitle?: string;
  title: string;
  description?: string;
  correctionGuide?: string;
  dueDate?: Timestamp | FieldValue;
  attachments?: { name: string; url: string }[];
  createdAt: Timestamp | FieldValue;
}

export interface AssignmentSubmission {
  id: string;
  studentId: string;
  studentName: string;
  studentAvatarUrl: string;
  instructorId: string;
  courseId: string;
  courseTitle: string;
  assignmentId: string;
  assignmentTitle: string;
  submissionContent?: string;
  submissionUrl?: string;
  status: 'submitted' | 'graded';
  submittedAt: Timestamp | FieldValue;
  grade?: number;
  feedback?: string;
  gradedAt?: Timestamp | FieldValue;
}

export interface UserActivity {
  id: string;
  userId: string;
  type: 'enrollment' | 'certificate' | 'review' | 'assignment' | 'payment';
  title: string;
  description?: string;
  link?: string;
  read: boolean;
  createdAt: Timestamp | FieldValue;
}

export interface Enrollment {
  id: string;
  studentId: string;
  courseId: string;
  instructorId: string;
  status: 'active' | 'completed' | 'suspended';
  progress: number;
  enrollmentDate: Timestamp | FieldValue;
  lastAccessedAt: Timestamp | FieldValue;
  priceAtEnrollment?: number;
  transactionId?: string;
  enrollmentType?: 'free' | 'paid';
  expiresAt?: Timestamp | null;
}

export interface Review {
  id: string;
  courseId: string;
  studentId: string;
  instructorId: string;
  rating: number;
  comment: string;
  createdAt: Timestamp | FieldValue;
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
  expiresAt: Timestamp | FieldValue | Date;
  instructorId: string;
  createdAt: Timestamp | FieldValue;
}

export interface CarouselSlide {
  id: string;
  imageUrl: string;
  link?: string;
  order: number;
  createdAt: Timestamp | FieldValue;
}

export interface FAQ {
  id: string;
  question_fr: string;
  answer_fr: string;
  tags: string[];
  order: number;
  isActive: boolean;
  createdAt: Timestamp | FieldValue;
  updatedAt: Timestamp | FieldValue;
}

export interface CourseTemplate {
  id: string;
  imageUrl: string;
  description: string;
  createdAt: Timestamp | FieldValue;
}

export interface Notification {
  id: string;
  text: string;
  link?: string;
  type: 'success' | 'info' | 'reminder' | 'alert';
  read: boolean;
  createdAt: Timestamp | FieldValue;
}

export interface SupportTicket {
  id: string;
  userId: string;
  subject: string;
  category: 'Paiement' | 'Technique' | 'Pédagogique';
  courseId: string;
  instructorId: string;
  status: 'ouvert' | 'fermé';
  lastMessage: string;
  resolution?: string;
  createdAt: Timestamp | FieldValue;
  updatedAt: Timestamp | FieldValue;
}

export interface Message {
  id: string;
  senderId: string;
  text: string;
  createdAt: Timestamp | FieldValue;
  status?: 'sent' | 'read';
}

export interface Chat {
  id: string;
  participants: string[];
  lastMessage: string;
  lastSenderId: string;
  updatedAt: Timestamp | FieldValue;
  createdAt: Timestamp | FieldValue;
  status?: 'active' | 'blocked';
  unreadBy?: string[];
}

export interface PushCampaign {
  id: string;
  message: string;
  target: 'all' | 'instructor' | 'student';
  status: 'sent' | 'scheduled';
  scheduledFor: Timestamp | FieldValue;
  sentAt?: Timestamp | FieldValue;
  createdAt: Timestamp | FieldValue;
  stats?: {
    delivered: number;
    clicked: number;
  };
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
  updatedAt: Timestamp | FieldValue;
}

export interface CourseProgress {
  userId: string;
  courseId: string;
  courseTitle: string;
  courseCover: string;
  progressPercent: number;
  completedLessons: string[];
  lastLessonId: string;
  lastLessonTitle: string;
  updatedAt: Timestamp | FieldValue;
}

export interface AffiliateTransaction {
  id: string;
  affiliateId: string;
  courseId: string;
  courseTitle: string;
  buyerId: string;
  buyerName: string;
  amount: number;
  commissionAmount: number;
  status: 'pending' | 'approved' | 'paid' | 'cancelled';
  createdAt: Timestamp | FieldValue;
  unlockDate: Timestamp | FieldValue;
}

export interface Payout {
  id: string;
  instructorId: string;
  amount: number;
  status: 'valide' | 'rejete' | 'en_attente';
  method: string;
  date: Timestamp | FieldValue;
}

export interface NdaraPaymentMetadata {
  userId: string;
  courseId: string;
  type: 'course_purchase' | 'wallet_topup' | 'license_purchase';
  affiliateId?: string;
  couponId?: string;
  reason?: string;
  adminId?: string;
}

export interface NdaraPaymentDetails {
  transactionId: string;
  gatewayTransactionId?: string;
  provider: PaymentProvider;
  amount: number;
  currency: string;
  metadata: NdaraPaymentMetadata;
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
  platformFee?: number;
  metadata?: NdaraPaymentMetadata;
  fraudReview?: {
    isSuspicious: boolean;
    riskScore: number;
    reviewed: boolean;
  };
}

export interface PayoutRequest {
  id: string;
  instructorId: string;
  amount: number;
  method: 'mobile_money' | 'bank_transfer';
  status: 'pending' | 'approved' | 'paid' | 'rejected';
  createdAt: Timestamp | FieldValue;
  processedAt?: Timestamp | FieldValue;
  updatedAt?: Timestamp | FieldValue;
}

export interface TrackingEvent {
  eventType: 'page_view' | 'cta_click' | 'payment_method_click' | 'affiliate_click';
  sessionId: string;
  pageUrl: string;
  timestamp: Timestamp | FieldValue;
  metadata?: Record<string, any>;
}

export interface DesignSettings {
  primaryColor?: string;
  borderRadius?: string;
  fontScale?: 'small' | 'medium' | 'large';
}

export interface SecurityLog {
  id: string;
  eventType: string;
  userId: string;
  targetId: string;
  details: string;
  timestamp: Timestamp | FieldValue;
  status?: 'open' | 'resolved';
}

export interface AdminAuditLog {
  id: string;
  adminId: string;
  eventType: string;
  target: { id: string; type: string };
  details: string;
  timestamp: Timestamp | FieldValue;
}

export interface InvestorLead {
  id: string;
  fullName: string;
  email: string;
  organization?: string;
  message?: string;
  status: 'new' | 'contacted' | 'interested';
  createdAt: Timestamp | FieldValue;
  updatedAt?: Timestamp | FieldValue;
}

export interface TeamMember {
  name: string;
  role: string;
  bio: string;
  imageUrl: string;
}

export interface AboutPageContent {
  mainTitle?: string;
  mainSubtitle?: string;
  historyTitle?: string;
  historyFrench?: string;
  historySango?: string;
  visionTitle?: string;
  visionFrench?: string;
  visionSango?: string;
  ctaTitle?: string;
  teamMembers?: TeamMember[];
}

export interface LandingPageContent {
  heroBadge?: string;
  heroTitle?: string;
  heroSubtitle?: string;
  heroImageUrl?: string;
  heroCtaText?: string;
  showHeroCta?: boolean;
  finalCtaTitle?: string;
  finalCtaSubtitle?: string;
  finalCtaButtonText?: string;
  showFinalCta?: boolean;
  securitySection_imageUrl?: string;
}

export interface Settings {
  general: {
    siteName: string;
    contactEmail: string;
    supportPhone?: string;
    logoUrl?: string;
    siteDescription?: string;
    defaultLanguage?: string;
    defaultCountry?: string;
    maintenanceMode?: boolean;
    announcementMessage?: string;
  };
  social?: {
    facebookUrl?: string;
    instagramUrl?: string;
    twitterUrl?: string;
    linkedinUrl?: string;
    youtubeUrl?: string;
    telegramUrl?: string;
    tiktokUrl?: string;
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
    platformCommission?: number;
    instructorShare?: number;
    minPayoutThreshold?: number;
    withdrawalFee?: number;
    affiliatePercentage?: number;
  };
  platform?: {
      maintenanceMode: boolean;
      announcementMessage?: string;
      allowTeacherToTeacherResale?: boolean;
      allowCourseBuyout?: boolean;
      allowResaleRights?: boolean;
      allowInstructorSignup?: boolean;
      allowYoutube?: boolean;
      allowBunny?: boolean;
      ai?: {
        autoCorrection?: boolean;
        autonomousTutor?: boolean;
        fraudDetection?: boolean;
      };
      market?: {
        minimumLicensePrice?: number;
      }
  };
  appearance?: DesignSettings;
  courses?: {
    autoApproval?: boolean;
    minPrice?: number;
    maxPrice?: number;
    allowFree?: boolean;
    maxLessons?: number;
    maxVideoDuration?: number;
  };
  instructors?: {
    verificationRequired?: boolean;
    autoApproval?: boolean;
    maxCoursesPerUser?: number;
    expertBadgeEnabled?: boolean;
  };
  students?: {
    allowRegistration?: boolean;
    emailVerification?: boolean;
    phoneVerification?: boolean;
    dailyDownloadLimit?: number;
  };
  affiliate?: {
    enabled?: boolean;
    commissionRate?: number;
    cookieDurationDays?: number;
    payoutThreshold?: number;
  };
  notifications?: {
    enableEmail?: boolean;
    enableInApp?: boolean;
    notifySales?: boolean;
    notifyEnrollments?: boolean;
    notifyMessages?: boolean;
  };
  security?: {
    enable2fa?: boolean;
    maxLoginAttempts?: number;
    ipBlacklist?: string[];
    accountProtectionRules?: string;
  };
  analytics?: {
    googleAnalyticsId?: string;
    facebookPixelId?: string;
    conversionTracking?: boolean;
    internalAnalytics?: boolean;
  };
  storage?: {
    useBunnyCdn?: boolean;
    maxFileSizeMb?: number;
    maxVideoSizeMb?: number;
  };
  legal?: {
    termsOfService?: string;
    privacyPolicy?: string;
    refundPolicy?: string;
    legalNotices?: string;
  };
  email?: {
    smtpHost?: string;
    senderName?: string;
    senderEmail?: string;
    templates?: Record<string, string>;
  };
  content?: {
    landingPage?: LandingPageContent;
    aboutPage?: AboutPageContent;
  }
}
