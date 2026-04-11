import type { Timestamp, FieldValue } from "firebase/firestore";

/**
 * @fileOverview SOURCE DE VÉRITÉ UNIQUE - NDARA AFRIQUE v2.5
 * Contient toutes les interfaces partagées pour garantir la cohérence des données.
 */

export type UserRole = 'student' | 'instructor' | 'admin';

export type PaymentProvider = 'mesomb' | 'cinetpay' | 'moneroo' | 'wallet' | 'admin' | 'orange' | 'mtn' | 'wave' | 'manual' | 'admin_recharge';

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
  role: UserRole;
  availableRoles: UserRole[];
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
    interestDomain: string;
    mainGoal?: string;
  };
  socialLinks?: {
    website?: string;
    twitter?: string;
    linkedin?: string;
    youtube?: string;
    telegramUrl?: string;
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
  sanctions?: {
    isSanctioned: boolean;
    reason: string;
    imposedBy: string;
    date: Timestamp | FieldValue | Date;
    expiresAt?: Timestamp | FieldValue | Date | null;
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
  badges?: string[];
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  billingCycle: 'monthly' | 'yearly';
  features: string[];
  isActive: boolean;
  targetRole: UserRole;
}

export interface CartItem {
  id: string;
  courseId: string;
  price: number;
  imageUrl?: string;
  title: string;
  addedAt?: Timestamp | FieldValue | Date;
}

export interface Course {
  id: string;
  courseId: string;
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
  publishedAt?: Timestamp | FieldValue | Date | null;
  currency?: string;
  learningObjectives?: string[];
  ownerId?: string;
  creatorId?: string;
  resaleRightsAvailable?: boolean;
  resaleRightsPrice?: number;
  isPlatformOwned?: boolean;
  buyoutStatus?: 'none' | 'requested' | 'approved';
  buyoutPrice?: number;
  rightsChain?: string[];
  moderationFeedback?: string;
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
  description?: string;
  createdAt?: Timestamp | FieldValue | Date;
  updatedAt?: Timestamp | FieldValue | Date;
}

export interface Quiz {
  id: string;
  courseId: string;
  sectionId: string;
  instructorId: string;
  title: string;
  description?: string;
  questionsCount?: number;
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

export interface Enrollment {
  id: string;
  studentId: string;
  courseId: string;
  instructorId: string;
  status: 'active' | 'completed' | 'suspended';
  progress: number;
  enrollmentDate: Timestamp | FieldValue | Date;
  lastAccessedAt: Timestamp | FieldValue | Date;
  priceAtEnrollment?: number;
  expiresAt?: Timestamp | null;
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

export interface UserActivity {
  id: string;
  userId: string;
  type: 'enrollment' | 'certificate' | 'review' | 'assignment';
  title: string;
  description?: string;
  link?: string;
  read: boolean;
  createdAt: Timestamp | FieldValue | Date;
}

export interface SupportTicket {
  id: string;
  userId: string;
  subject: string;
  category: 'Paiement' | 'Technique' | 'Pédagogique';
  status: 'ouvert' | 'pending' | 'resolved' | 'fermé';
  lastMessage?: string;
  createdAt: Timestamp | FieldValue | Date;
  updatedAt: Timestamp | FieldValue | Date;
  resolution?: string;
  courseId: string;
  instructorId: string;
  courseTitle?: string;
}

export interface Message {
  id: string;
  senderId: string;
  text: string;
  createdAt: Timestamp | FieldValue | Date;
  status?: 'sent' | 'delivered' | 'read';
}

export interface Resource {
  id: string;
  title: string;
  description?: string;
  url: string;
  type: 'pdf' | 'video' | 'image' | 'link' | 'file';
  courseId: string;
  instructorId: string;
  createdAt: Timestamp | FieldValue | Date;
}

export interface Payment {
  id: string;
  userId: string;
  courseId?: string;
  courseTitle?: string;
  amount: number;
  currency: string;
  provider: PaymentProvider | string;
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

export interface RequestPayoutParams {
  instructorId: string;
  amount: number;
  method: 'mobile_money' | 'bank_transfer';
  requesterId: string;
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

export interface PaymentMethod {
  id: string;
  name: string;
  logo?: string;
  provider: PaymentProvider | string;
  active: boolean;
}

export interface DesignSettings {
  primaryColor: string;
  borderRadius: 'none' | 'md' | 'lg' | 'xl';
  fontScale: 'small' | 'medium' | 'large';
}

/**
 * STRUCTURE DE CONFIGURATION GLOBALE NDARA - v3.0 (Strict Execution)
 */
export interface Settings {
  general: {
    siteName: string;
    logoUrl: string;
    faviconUrl: string;
    contactEmail: string;
    contactPhone: string;
    address: string;
    defaultLanguage: 'fr' | 'en' | 'sg';
    timezone: string;
  };
  payments: {
    paymentsEnabled: boolean;
    currency: string;
    paymentMethods: string[];
    transactionFeePercent: number;
    minDeposit: number;
    maxDeposit: number;
    walletEnabled: boolean;
    operatorCommission: number;
    paymentMode: 'test' | 'live';
  };
  users: {
    allowRegistration: boolean;
    allowInstructorSignup: boolean;
    requireEmailVerification: boolean;
    autoApproveInstructors: boolean;
    defaultRole: string;
    maxAccountsPerUser: number;
  };
  courses: {
    allowCourseCreation: boolean;
    requireAdminApproval: boolean;
    minimumCoursePrice: number;
    instructorRevenuePercent: number;
    allowDownload: boolean;
    certificateEnabled: boolean;
  };
  marketplace: {
    enableMarketplace: boolean;
    minimumResalePrice: number;
    resaleCommissionPercent: number;
    allowLicenseResale: boolean;
    allowCourseBuyout?: boolean;
    allowResaleRights?: boolean;
  };
  ai: {
    aiEnabled: boolean;
    modelName: string;
    maxRequestsPerUser: number;
    contentGenerationEnabled: boolean;
    autoCorrection?: boolean;
    autonomousTutor?: boolean;
    fraudDetection?: boolean;
  };
  notifications: {
    emailNotifications: boolean;
    pushNotifications: boolean;
    smsNotifications: boolean;
    adminAlerts: {
      newUser: boolean;
      newPayment: boolean;
      systemError: boolean;
    };
  };
  security: {
    maintenanceMode: boolean;
    enable2fa: boolean;
    maxLoginAttempts: number;
    blockedUsers: string[];
    activityLogsEnabled: boolean;
  };
  localization: {
    supportedLanguages: string[];
    defaultLanguage: string;
    autoDetectLanguage: boolean;
  };
  marketing: {
    globalAnnouncement: string;
    promoCodesEnabled: boolean;
    referralProgramEnabled: boolean;
    seo: {
      title: string;
      description: string;
    };
  };
  finance: {
    platformRevenuePercent: number;
    minWithdrawal: number;
    withdrawalDelayDays: number;
    autoPayoutEnabled: boolean;
  };
  advanced: {
    apiKeys: Record<string, string>;
    firebaseConfig: Record<string, any>;
    webhookUrls: string[];
    debugMode: boolean;
  };
  appearance: DesignSettings;
  social?: {
    facebookUrl?: string;
    instagramUrl?: string;
    twitterUrl?: string;
    linkedinUrl?: string;
    youtubeUrl?: string;
    telegramUrl?: string;
  };
  platform?: {
    maintenanceMode?: boolean;
    announcementMessage?: string;
    allowYoutube?: boolean;
    allowBunny?: boolean;
    allowInstructorSignup?: boolean;
  };
  commercial?: {
    instructorShare?: number;
    payoutDelayDays?: number;
  };
  affiliate?: {
    commissionRate?: number;
  };
  content?: {
    landingPage?: {
      heroBadge?: string;
      heroTitle?: string;
      heroSubtitle?: string;
      heroImageUrl?: string;
      badge_card_title?: string;
      badge_card_subtitle?: string;
      securitySection_imageUrl?: string;
      showFinalCta?: boolean;
      finalCtaTitle?: string;
      finalCtaSubtitle?: string;
      finalCtaButtonText?: string;
    };
    aboutPage?: {
      mainTitle?: string;
      mainSubtitle?: string;
      historyTitle?: string;
      historyFrench?: string;
      historySango?: string;
      visionTitle?: string;
      visionFrench?: string;
      visionSango?: string;
      teamMembers?: TeamMember[];
      ctaTitle?: string;
    };
  };
  storage?: {
    maxFileSizeMb: number;
  };
  pwa?: {
    appName?: string;
    shortName?: string;
    iconUrl?: string;
    appDescription?: string;
  };
}

export interface FAQ {
  id: string;
  question_fr: string;
  answer_fr: string;
  tags: string[];
  order: number;
  isActive: boolean;
  createdAt?: Timestamp | FieldValue | Date;
  updatedAt?: Timestamp | FieldValue | Date;
}

export interface CarouselSlide {
  id: string;
  imageUrl: string;
  link?: string;
  order: number;
  createdAt?: Timestamp | FieldValue | Date;
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

export interface CourseQuestion {
  id: string;
  courseId: string;
  courseTitle?: string;
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
  status: 'submitted' | 'graded';
  grade?: number;
  feedback?: string;
  submittedAt: Timestamp | FieldValue | Date;
  gradedAt?: Timestamp | FieldValue | Date;
}

export interface Assignment {
  id: string;
  courseId: string;
  courseTitle?: string;
  sectionId: string;
  instructorId?: string;
  title: string;
  description?: string;
  correctionGuide?: string;
  dueDate?: Timestamp | FieldValue | Date;
  attachments?: { name: string; url: string }[];
  createdAt: Timestamp | FieldValue | Date;
}

export interface PushCampaign {
  id: string;
  message: string;
  target: 'all' | 'instructors' | 'students';
  status: 'sent' | 'scheduled' | 'draft';
  scheduledFor?: Timestamp | FieldValue | Date;
  sentAt?: Timestamp | FieldValue | Date;
  createdAt: Timestamp | FieldValue | Date;
  stats?: {
    delivered: number;
    clicked: number;
  };
}

export interface CourseTemplate {
  id: string;
  imageUrl: string;
  description: string;
  createdAt?: Timestamp | FieldValue | Date;
}

export interface TeamMember {
  name: string;
  role: string;
  bio: string;
  imageUrl: string;
}

export interface UserRecommendations {
  userId: string;
  courses: RecommendedCourseItem[];
  updatedAt: Timestamp | FieldValue | Date;
}

export interface RecommendedCourseItem {
  courseId: string;
  title: string;
  coverImage: string;
  instructorId: string;
  price: number;
  score: number;
}

export interface NdaraPaymentDetails {
  transactionId: string | number;
  gatewayTransactionId?: string;
  provider: PaymentProvider | string;
  amount: number;
  currency: string;
  metadata: {
    userId: string;
    courseId: string;
    type?: string;
    affiliateId?: string;
    couponId?: string;
    fraudScore?: number;
    [key: string]: any;
  };
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
  participantCategories?: string[];
  lastMessage: string;
  lastSenderId: string;
  unreadBy?: string[];
  status?: 'active' | 'blocked';
  blockedBy?: string;
  createdAt: Timestamp | FieldValue | Date;
  updatedAt: Timestamp | FieldValue | Date;
}

export interface Announcement {
  id: string;
  courseId: string;
  courseTitle?: string;
  instructorId: string;
  title: string;
  message: string;
  createdAt: Timestamp | FieldValue | Date;
}

export interface SecurityLog {
  id: string;
  eventType: string;
  userId?: string;
  targetId: string;
  details: string;
  timestamp: Timestamp | FieldValue | Date;
  status?: 'open' | 'resolved';
}

export interface AdminAuditLog {
  id: string;
  adminId: string;
  eventType: string;
  target: { id: string; type: string };
  details: string;
  timestamp: Timestamp | FieldValue | Date;
}

export interface TrackingEvent {
  eventType: 'page_view' | 'cta_click' | 'payment_method_click' | 'affiliate_click';
  sessionId: string;
  pageUrl: string;
  metadata?: Record<string, any>;
  timestamp: Timestamp | FieldValue | Date;
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
