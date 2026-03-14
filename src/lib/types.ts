import type { Timestamp, FieldValue } from "firebase/firestore";

export type UserRole = 'student' | 'instructor' | 'admin';

export interface NotificationPreferences {
  newPayouts?: boolean;
  newApplications?: boolean;
  newSupportTickets?: boolean;
  financialAnomalies?: boolean;
}

export interface Role {
  id: string;
  name: string;
  permissions: { [key: string]: boolean };
}

export interface FAQ {
  id: string;
  question_fr: string;
  answer_fr: string;
  tags: string[];
  isActive: boolean;
  order: number;
  createdAt: Timestamp | FieldValue;
  updatedAt?: Timestamp | FieldValue;
}

export interface CarouselSlide {
  id: string;
  imageUrl: string;
  link?: string;
  order: number;
  createdAt?: Timestamp | FieldValue;
}

export interface CourseTemplate {
  id: string;
  imageUrl: string;
  description: string;
  createdAt?: Timestamp | FieldValue;
}

export interface AdminGrant {
  id: string;
  studentId: string;
  courseId: string;
  grantedBy: string;
  reason: string;
  createdAt: Timestamp | FieldValue;
  expiresAt?: Timestamp | FieldValue;
}

export interface PromoCode {
  id: string;
  code: string;
  discountPercentage: number;
  isActive: boolean;
  createdAt: Timestamp | FieldValue;
  expiresAt?: Timestamp | FieldValue;
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
  expiresAt: Timestamp | FieldValue;
  createdAt: Timestamp | FieldValue;
}

export interface FCMToken {
  tokens: string[];
  createdAt: Timestamp | FieldValue;
}

export interface TeamMember {
  name: string;
  role: string;
  imageUrl: string;
  bio: string;
}

export interface NdaraUser {
  uid: string;
  email: string;
  username: string;
  fullName: string;
  phoneNumber?: string;
  role: UserRole;
  isInstructorApproved: boolean;
  availableRoles: UserRole[];
  status?: 'active' | 'suspended';
  bio?: string;
  preferredLanguage?: 'fr' | 'en';
  countryCode?: string;
  countryName?: string;
  rating?: number;
  // --- ECONOMY ---
  affiliateBalance?: number; 
  pendingAffiliateBalance?: number; 
  referralBalance?: number;
  virtualBalance?: number;
  isDemoAccount?: boolean; 
  referralCode?: string;
  referredBy?: string; 
  affiliateStats?: {
      clicks: number;
      registrations: number; 
      sales: number;
      earnings: number;
  };
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
  buyoutSanctions?: {
      isSanctioned: boolean;
      reason: string;
      date: Timestamp | FieldValue;
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
  notificationPreferences?: NotificationPreferences;
  videoPlaybackPreferences?: {
      defaultQuality: string;
      defaultSpeed: string;
  };
  careerGoals?: {
      currentRole?: string;
      interestDomain?: string; 
      mainGoal?: string;
  };
  profilePictureURL?: string;
  instructorApplication?: {
      specialty?: string;
      whatsappNumber?: string;
      youtubeUrl?: string;
      facebookUrl?: string;
      presentationVideoUrl?: string;
      professionalExperience?: string;
      linkedinUrl?: string;
      portfolioUrl?: string;
      firstCourseTitle?: string;
      firstCourseDescription?: string;
      hasEquipment?: boolean;
      submittedAt: Date;
  };
  createdAt?: Timestamp | FieldValue;
  lastLogin?: Timestamp | FieldValue;
  isOnline?: boolean;
  lastSeen?: Timestamp | FieldValue;
  termsAcceptedAt?: Timestamp | FieldValue;
  isProfileComplete?: boolean;
  badges?: string[];
  permissions?: { [key: string]: boolean };
};

export interface DesignSettings {
  primaryColor?: string;
  secondaryColor?: string;
  defaultTheme?: 'light' | 'dark' | 'system';
  fontFamily?: string;
  fontScale?: 'small' | 'medium' | 'large';
  borderRadius?: 'none' | 'md' | 'lg' | 'xl';
  cardStyle?: 'flat' | 'elevated' | 'glass';
  showSplashScreen?: boolean;
}

export interface Settings {
  general: {
    siteName: string;
    slogan?: string;
    siteDescription?: string;
    logoUrl?: string;
    logoMobileUrl?: string;
    faviconUrl?: string;
    contactEmail: string;
    supportPhone?: string;
    address?: string;
    defaultLanguage?: string;
    defaultCountry?: string;
    maintenanceMode: boolean;
  };
  financial: {
    platformCommission: number;
    instructorRevenueShare: number;
    affiliateCommission: number;
    minWithdrawalAmount: number;
    withdrawalFee: number;
    payoutDelayDays: number;
    currency: string;
  };
  payments: {
    mtnEnabled: boolean;
    orangeEnabled: boolean;
    waveEnabled: boolean;
    testMode: boolean;
    momoApiKey?: string;
    momoMerchantId?: string;
  };
  courses: {
    autoApproval: boolean;
    minPrice: number;
    maxPrice: number;
    allowFree: boolean;
    maxLessons: number;
    maxVideoDurationMinutes: number;
  };
  instructors: {
    verificationRequired: boolean;
    approvalWorkflow: 'auto' | 'manual';
    maxCoursesPerInstructor: number;
    showExpertBadge: boolean;
  };
  students: {
    allowRegistration: boolean;
    emailVerification: boolean;
    phoneVerification: boolean;
    downloadLimitPerDay: number;
  };
  affiliate: {
    enabled: boolean;
    commissionRate: number;
    cookieDurationDays: number;
    payoutThreshold: number;
  };
  notifications: {
    emailEnabled: boolean;
    inAppEnabled: boolean;
    notifySales: boolean;
    notifyEnrollments: boolean;
    notifyMessages: boolean;
  };
  security: {
    twoFactorEnabled: boolean;
    maxLoginAttempts: number;
    lockoutDurationMinutes: number;
    blockVpn: boolean;
    ipBlacklist?: string[];
  };
  branding: DesignSettings;
  analytics: {
    googleAnalyticsId?: string;
    facebookPixelId?: string;
    enableConversionTracking: boolean;
    enableInternalAnalytics: boolean;
  };
  storage: {
    bunnyCdnEnabled: boolean;
    bunnyStorageZone?: string;
    maxFileSizeMb: number;
    maxVideoSizeMb: number;
  };
  legal: {
    termsOfService: string;
    privacyPolicy: string;
    refundPolicy: string;
    legalNotices: string;
  };
  email: {
    smtpHost?: string;
    smtpPort?: number;
    senderEmail?: string;
    senderName?: string;
  };
  content?: {
    landingPage?: {
      heroTitle?: string;
      heroSubtitle?: string;
      heroImageUrl?: string;
      heroCtaText?: string;
      showHeroCta?: boolean;
      finalCtaTitle?: string;
      finalCtaButtonText?: string;
      showFinalCta?: boolean;
    };
  };
}

export interface Payment {
  id: string;
  userId: string;
  instructorId: string;
  courseId: string;
  courseTitle?: string;
  amount: number;
  currency: string;
  date: Timestamp | FieldValue;
  status: 'Completed' | 'Pending' | 'Failed' | 'Refunded';
  fraudReview?: {
    isSuspicious: boolean;
    riskScore: number;
    reason: string;
    checkedAt: Timestamp | FieldValue;
    reviewed?: boolean;
  }
}

export interface PayoutRequest {
  id: string;
  instructorId: string;
  amount: number;
  method: 'mobile_money' | 'bank_transfer';
  status: 'pending' | 'approved' | 'paid' | 'rejected';
  createdAt: Timestamp | FieldValue;
}

export interface Payout {
  id: string;
  instructorId: string;
  amount: number;
  method: 'Mobile Money' | 'Virement';
  status: 'en_attente' | 'valide' | 'rejete';
  date: Timestamp | FieldValue;
}

export interface SecurityLog {
  id: string;
  userId: string; 
  targetId: string; 
  eventType: 'suspicious_login' | 'failed_payment' | 'profile_change' | 'user_suspended' | 'user_reinstated' | 'course_approved' | 'course_rejected' | 'alert_resolved' | 'chat_blocked' | 'chat_unblocked';
  details: string; 
  ipAddress?: string;
  timestamp: Timestamp | FieldValue;
  status?: 'open' | 'resolved';
}

export interface AdminAuditLog {
  id: string;
  adminId: string;
  eventType: 'user.status.update' | 'user.role.update' | 'course.moderation' | 'payout.process' | 'security.resolve' | 'role.permissions.update' | 'settings.update' | 'user.delete' | 'user.import' | 'instructor.application' | 'course.grant' | 'chat.block';
  target: {
    id: string;
    type: 'user' | 'course' | 'payout' | 'payment' | 'security_log' | 'role' | 'settings' | 'enrollment' | 'chat';
  };
  timestamp: Timestamp | FieldValue;
  details: string;
}

export interface QuestionOption {
  text: string;
  isCorrect: boolean;
}

export interface Question {
  id: string;
  text: string;
  options: QuestionOption[];
  order: number;
  createdAt: Timestamp | FieldValue;
  updatedAt?: Timestamp | FieldValue;
}

export interface Quiz {
  id: string;
  title: string;
  description?: string;
  courseId: string;
  sectionId: string;
  createdAt: Timestamp | FieldValue;
  questionsCount?: number;
  updatedAt?: Timestamp | FieldValue;
}

export interface AssignmentSubmission {
    id: string;
    instructorId: string;
    studentId: string;
    studentName: string;
    studentAvatarUrl?: string;
    courseId: string;
    courseTitle: string;
    assignmentId: string;
    assignmentTitle: string;
    submissionUrl?: string;
    submissionContent?: string;
    status: 'submitted' | 'graded';
    grade?: number;
    feedback?: string;
    submittedAt: Timestamp | FieldValue;
    gradedAt?: Timestamp | FieldValue;
}

export interface Resource {
    id: string;
    courseId: string;
    instructorId: string;
    title: string;
    type: 'pdf' | 'video' | 'image' | 'link' | 'file';
    url: string;
    createdAt: Timestamp | FieldValue;
}

export interface TrackingEvent {
  eventType: 'page_view' | 'cta_click' | 'payment_method_click' | 'affiliate_click';
  sessionId: string;
  pageUrl: string;
  metadata?: Record<any, any>;
  timestamp: Timestamp | FieldValue;
}

export interface Chat {
    id: string;
    participants: string[];
    participantCategories: string[];
    lastMessage?: string;
    updatedAt: Timestamp | FieldValue;
    lastSenderId?: string;
    unreadBy?: string[];
    status?: 'active' | 'blocked';
    blockedBy?: string;
}

export interface Message {
  id: string;
  senderId: string;
  text: string;
  createdAt: Timestamp | FieldValue;
  status: 'sent' | 'delivered' | 'read';
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  billingCycle: 'monthly' | 'yearly';
  features: string[];
  isActive: boolean;
  targetRole: 'student' | 'instructor';
}

export interface UserSubscription {
  id: string;
  userId: string;
  planId: string;
  status: 'active' | 'canceled' | 'past_due' | 'expired';
  startDate: Timestamp | FieldValue;
  endDate: Timestamp | FieldValue;
  canceledAt?: Timestamp | FieldValue;
  paymentTransactionId?: string;
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
