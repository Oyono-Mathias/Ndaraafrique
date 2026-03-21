import type { Timestamp, FieldValue } from "firebase/firestore";

/**
 * @fileOverview SOURCE DE VÉRITÉ UNIQUE - NDARA AFRIQUE v2.5
 * Ce fichier centralise l'intégralité des contrats de données du projet.
 * Groupé par domaines fonctionnels : Utilisateurs, Pédagogie, Finances, Support, Système.
 */

/* ==========================================================================
   👤 DOMAINE : UTILISATEURS & RÔLES
   ========================================================================== */

export type UserRole = 'student' | 'instructor' | 'admin';

export interface InstructorApplication {
  specialty: string;
  professionalExperience: string;
  firstCourseTitle: string;
  firstCourseDescription: string;
  whatsappNumber: string;
  portfolioUrl?: string;
  linkedinUrl?: string;
  youtubeUrl?: string;
  submittedAt?: Timestamp | FieldValue | Date;
  status?: 'pending' | 'approved' | 'rejected';
  decisionDate?: Timestamp | FieldValue | Date;
  feedback?: string;
}

export interface CareerGoals {
  currentRole: string;
  interestDomain: string;
  mainGoal: string;
}

export interface NdaraUser {
  uid: string;
  email: string;
  username: string;
  fullName: string;
  profilePictureURL?: string;
  photoURL?: string; // Alias pour compatibilité Firebase Auth
  phoneNumber?: string;
  countryCode?: string;
  countryName?: string;
  role: UserRole;
  status: 'active' | 'suspended';
  
  // -- Finance & Wallet --
  balance: number; // Solde réel (XOF)
  walletBalance?: number; // Alias pour compatibilité
  virtualBalance?: number; // Solde pour les tests/pubs
  isDemoAccount?: boolean;
  currency?: string;
  payoutInfo?: {
    mobileMoneyNumber?: string;
    bankName?: string;
    iban?: string;
  };

  // -- Expert / Instructor Info --
  isInstructorApproved: boolean;
  instructorApplication?: InstructorApplication;
  bio?: string;
  rating?: number;
  socialLinks?: {
    website?: string;
    twitter?: string;
    linkedin?: string;
    youtube?: string;
  };
  buyoutSanctions?: {
    isSanctioned: boolean;
    reason: string;
    date: Timestamp | FieldValue | Date;
  };

  // -- Affiliation --
  referredBy?: string | null;
  referralCode?: string;
  affiliateBalance?: number;
  pendingAffiliateBalance?: number;
  affiliateStats?: {
    clicks: number;
    registrations: number;
    sales: number;
    earnings: number;
  };

  // -- Préférences & Système --
  preferredLanguage?: 'fr' | 'en' | 'sg';
  isProfileComplete: boolean;
  isOnline?: boolean;
  lastSeen?: Timestamp | FieldValue | Date;
  lastLogin?: Timestamp | FieldValue | Date;
  createdAt?: Timestamp | FieldValue | Date;
  updatedAt?: Timestamp | FieldValue | Date;
  
  careerGoals?: CareerGoals;
  badges?: string[];
  permissions?: Record<string, boolean>;

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

  pedagogicalPreferences?: {
    aiAssistanceEnabled: boolean;
    aiInterventionLevel: 'low' | 'medium' | 'high';
  };
}

export interface UserActivity {
  id: string;
  userId: string;
  type: 'enrollment' | 'certificate' | 'review' | 'assignment' | 'payment' | 'login';
  title: string;
  description?: string;
  link?: string;
  read: boolean;
  createdAt: Timestamp | FieldValue | Date;
}

/* ==========================================================================
   📚 DOMAINE : PÉDAGOGIE & CONTENU
   ========================================================================== */

export type CourseStatus = 'Draft' | 'Published' | 'Pending Review';

export interface Course {
  id: string;
  courseId: string; // Alias pour compatibilité
  title: string;
  description: string;
  imageUrl?: string;
  instructorId: string;
  creatorId?: string; // ID de l'auteur original
  ownerId?: string;   // ID du détenteur actuel des droits
  category: string;
  price: number;
  currency: string;
  status: CourseStatus;
  rating: number;
  participantsCount: number;
  createdAt: Timestamp | FieldValue | Date;
  updatedAt: Timestamp | FieldValue | Date;
  learningObjectives?: string[];
  
  // -- Propriété & Bourse --
  isPlatformOwned?: boolean;
  resaleRightsAvailable?: boolean;
  resaleRightsPrice?: number;
  rightsChain?: string[]; // Historique des propriétaires
  buyoutStatus?: 'none' | 'requested' | 'approved';
  buyoutPrice?: number;
  moderationFeedback?: string;
  publishedAt?: Timestamp | FieldValue | Date | null;
}

export interface Section {
  id: string;
  title: string;
  order: number;
  createdAt: Timestamp | FieldValue | Date;
}

export interface Lecture {
  id: string;
  title: string;
  description?: string;
  type: 'video' | 'youtube' | 'text' | 'pdf';
  contentUrl?: string;
  textContent?: string;
  duration?: number;
  order: number;
  isFreePreview: boolean;
  createdAt: Timestamp | FieldValue | Date;
  updatedAt?: Timestamp | FieldValue | Date;
}

export interface Quiz {
  id: string;
  courseId: string;
  sectionId: string;
  instructorId: string;
  title: string;
  description?: string;
  questionsCount: number;
  createdAt: Timestamp | FieldValue | Date;
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
  lastAccessedAt?: Timestamp | FieldValue | Date;
  priceAtEnrollment?: number;
  transactionId?: string;
  enrollmentType?: 'free' | 'paid' | 'grant';
  expiresAt?: Timestamp | Date | null;
}

export interface CourseProgress {
  id: string;
  userId: string;
  courseId: string;
  courseTitle: string;
  courseCover: string;
  progressPercent: number;
  completedLessons: string[];
  lastLessonId?: string;
  lastLessonTitle?: string;
  updatedAt: Timestamp | FieldValue | Date;
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

export interface Resource {
  id: string;
  title: string;
  courseId: string;
  url: string;
  type: 'pdf' | 'video' | 'image' | 'link' | 'file';
  instructorId: string;
  createdAt: Timestamp | FieldValue | Date;
}

export interface CourseTemplate {
  id: string;
  imageUrl: string;
  description: string;
  createdAt: Timestamp | FieldValue | Date;
}

/* ==========================================================================
   💳 DOMAINE : FINANCES & TRANSACTIONS
   ========================================================================== */

export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded';
export type PaymentProvider = 'mesomb' | 'moneroo' | 'wallet' | 'admin_recharge';

export interface Payment {
  id: string;
  userId: string;
  courseId?: string;
  courseTitle?: string;
  instructorId?: string;
  amount: number;
  currency: string;
  provider: PaymentProvider;
  status: PaymentStatus;
  date: Timestamp | FieldValue | Date;
  updatedAt?: Timestamp | FieldValue | Date;
  
  // -- Répartition --
  instructorRevenue?: number;
  affiliateId?: string | null;
  affiliateCommission?: number;
  platformFee?: number;
  
  metadata?: {
    type: 'course_purchase' | 'wallet_topup' | 'license_purchase';
    adminId?: string;
    reason?: string;
    [key: string]: any;
  };
  fraudReview?: {
    isSuspicious: boolean;
    riskScore: number;
    reason: string;
    reviewed: boolean;
  };
}

export interface Payout {
  id: string;
  instructorId: string;
  amount: number;
  status: 'en_attente' | 'valide' | 'rejete' | 'paid';
  method: string;
  date: Timestamp | FieldValue | Date;
}

export interface PayoutRequest {
  id: string;
  instructorId: string;
  amount: number;
  method: 'mobile_money' | 'bank_transfer';
  status: 'pending' | 'approved' | 'paid' | 'rejected';
  createdAt: Timestamp | FieldValue | Date;
  processedAt?: Timestamp | FieldValue | Date;
}

export interface WalletTransaction {
  id: string;
  userId: string;
  type: 'deposit' | 'withdrawal' | 'purchase' | 'commission';
  amount: number;
  status: 'pending' | 'completed' | 'failed';
  reference?: string;
  createdAt: Timestamp | FieldValue | Date;
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
  unlockDate: Timestamp | Date;
  createdAt: Timestamp | FieldValue | Date;
}

export interface Coupon {
  id: string;
  code: string;
  courseId: string;
  courseTitle: string;
  instructorId: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  usedCount: number;
  maxUses: number;
  createdAt: Timestamp | FieldValue | Date;
  expiresAt: Timestamp | Date;
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
  provider: 'mesomb' | 'moneroo' | 'manual';
  active: boolean;
}

export interface NdaraPaymentDetails {
  transactionId: string;
  gatewayTransactionId?: string;
  provider: PaymentProvider;
  amount: number;
  currency: string;
  metadata: {
    userId: string;
    courseId: string;
    affiliateId?: string;
    couponId?: string;
    type: 'course_purchase' | 'wallet_topup' | 'license_purchase';
  };
}

/* ==========================================================================
   💬 DOMAINE : COMMUNICATION & SUPPORT
   ========================================================================== */

export interface Chat {
  id: string;
  participants: string[];
  participantCategories: string[];
  lastMessage: string;
  lastSenderId: string;
  unreadBy: string[];
  status?: 'active' | 'blocked';
  blockedBy?: string;
  updatedAt: Timestamp | FieldValue | Date;
  createdAt: Timestamp | FieldValue | Date;
}

export interface Message {
  id: string;
  senderId: string;
  text: string;
  status: 'sent' | 'read';
  createdAt: Timestamp | FieldValue | Date;
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
  createdAt: Timestamp | FieldValue | Date;
  updatedAt: Timestamp | FieldValue | Date;
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

export interface Announcement {
  id: string;
  courseId: string;
  courseTitle: string;
  instructorId: string;
  title: string;
  message: string;
  createdAt: Timestamp | FieldValue | Date;
}

export interface Notification {
  id: string;
  text: string;
  type: 'success' | 'info' | 'reminder' | 'alert';
  read: boolean;
  link?: string;
  createdAt: Timestamp | FieldValue | Date;
}

/* ==========================================================================
   ⚙️ DOMAINE : SYSTÈME & ADMIN
   ========================================================================== */

export interface DesignSettings {
  primaryColor?: string;
  borderRadius?: 'none' | 'md' | 'lg' | 'xl';
  fontScale?: 'small' | 'medium' | 'large';
}

export interface LandingPageContent {
  heroTitle?: string;
  heroSubtitle?: string;
  heroImageUrl?: string;
  heroBadge?: string;
  badge_card_title?: string;
  badge_card_subtitle?: string;
  finalCtaTitle?: string;
  finalCtaSubtitle?: string;
  finalCtaButtonText?: string;
  showFinalCta?: boolean;
  securitySection_imageUrl?: string;
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
}

export interface TeamMember {
  name: string;
  role: string;
  bio: string;
  imageUrl: string;
}

export interface Settings {
  id: string;
  general?: {
    siteName: string;
    siteDescription: string;
    contactEmail: string;
    supportPhone: string;
    defaultLanguage: string;
    defaultCountry: string;
    logoUrl?: string;
    loginBackgroundImage?: string;
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
  platform?: {
    maintenanceMode: boolean;
    announcementMessage: string;
    allowInstructorSignup: boolean;
    allowTeacherToTeacherResale: boolean;
    allowCourseBuyout: boolean;
    allowResaleRights: boolean;
    allowYoutube: boolean;
    allowBunny: boolean;
    ai?: {
      autoCorrection: boolean;
      autonomousTutor: boolean;
      fraudDetection: boolean;
    };
  };
  commercial?: {
    platformCommission: number;
    instructorShare: number;
    affiliatePercentage: number;
    minPayoutThreshold: number;
    withdrawalFee: number;
    payoutDelayDays: number;
    currency: string;
  };
  payments?: {
    enableMtn: boolean;
    enableOrange: boolean;
    mesombEnabled: boolean;
    monerooEnabled: boolean;
    paymentMode: 'test' | 'live';
  };
  appearance?: DesignSettings;
  content?: {
    landingPage?: LandingPageContent;
  };
  storage?: {
    useBunnyCdn: boolean;
    maxFileSizeMb: number;
  };
  legal?: {
    termsOfService: string;
    privacyPolicy: string;
    refundPolicy: string;
    legalNotices: string;
  };
}

export interface Role {
  id: string;
  name: string;
  permissions: Record<string, boolean>;
}

export interface AdminAuditLog {
  id: string;
  adminId: string;
  eventType: string;
  target: {
    id: string;
    type: 'user' | 'course' | 'payment' | 'payout' | 'settings' | 'role' | 'country';
  };
  details: string;
  timestamp: Timestamp | FieldValue | Date;
}

export interface SecurityLog {
  id: string;
  eventType: 'suspicious_login' | 'failed_payment' | 'chat_blocked' | 'course_approved' | 'course_rejected' | 'alert_resolved';
  userId: string;
  targetId: string;
  details: string;
  status: 'open' | 'resolved';
  timestamp: Timestamp | FieldValue | Date;
}

export interface TrackingEvent {
  id: string;
  eventType: 'page_view' | 'cta_click' | 'payment_method_click' | 'affiliate_click';
  sessionId: string;
  pageUrl: string;
  timestamp: Timestamp | FieldValue | Date;
  metadata?: Record<string, any>;
}

export interface PushCampaign {
  id: string;
  message: string;
  target: 'all' | 'instructor' | 'student';
  status: 'scheduled' | 'sent';
  scheduledFor: Timestamp | FieldValue | Date;
  sentAt?: Timestamp | FieldValue | Date;
  stats?: {
    delivered: number;
    clicked: number;
  };
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
  description: string;
  price: number;
  billingCycle: 'monthly' | 'yearly';
  features: string[];
  isActive: boolean;
  targetRole: 'student' | 'instructor';
}

export interface CarouselSlide {
  id: string;
  imageUrl: string;
  link?: string;
  order: number;
  createdAt: Timestamp | FieldValue | Date;
}

export interface FAQ {
  id: string;
  question_fr: string;
  answer_fr: string;
  tags: string[];
  order: number;
  isActive: boolean;
  createdAt: Timestamp | FieldValue | Date;
  updatedAt?: Timestamp | FieldValue | Date;
}

export interface Assignment {
  id: string;
  courseId: string;
  sectionId: string;
  instructorId?: string;
  courseTitle?: string;
  title: string;
  description: string;
  correctionGuide?: string;
  dueDate?: Timestamp | Date | null;
  attachments?: { name: string; url: string }[];
  createdAt: Timestamp | FieldValue | Date;
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
  grade?: number;
  feedback?: string;
  status: 'submitted' | 'graded';
  submittedAt: Timestamp | FieldValue | Date;
  gradedAt?: Timestamp | FieldValue | Date;
}
