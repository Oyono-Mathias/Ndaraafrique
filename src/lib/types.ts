import type { Timestamp, FieldValue } from "firebase/firestore";

/**
 * @fileOverview SOURCE DE VÉRITÉ UNIQUE - NDARA AFRIQUE v2.5
 * Contient toutes les interfaces partagées pour garantir la cohérence des données.
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
}

/* --- FINANCES --- */

export type TransactionStatus = 'pending' | 'completed' | 'failed' | 'cancelled' | 'approved' | 'paid' | 'rejected' | 'refunded';
export type TransactionType = 'deposit' | 'purchase' | 'commission' | 'payout' | 'wallet_topup' | 'course_purchase' | 'license_purchase';
export type PaymentProvider = 'mesomb' | 'moneroo' | 'cinetpay' | 'wallet' | 'admin_recharge' | 'manual' | 'orange' | 'mtn' | 'wave';

export interface WalletTransaction {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  type: TransactionType;
  status: TransactionStatus;
  provider: PaymentProvider;
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

export interface NdaraPaymentDetails {
  transactionId: string | number;
  gatewayTransactionId?: string;
  provider: string;
  amount: number;
  currency: string;
  metadata: {
    userId: string;
    courseId: string;
    type?: string;
    [key: string]: any;
  };
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

/* --- PÉDAGOGIE --- */

export interface Course {
  id: string;
  courseId: string;
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
  updatedAt?: Timestamp | FieldValue | Date;
  creatorId?: string;
  ownerId?: string;
  isPlatformOwned?: boolean;
  resaleRightsAvailable?: boolean;
  resaleRightsPrice?: number;
  buyoutStatus?: 'none' | 'requested' | 'approved';
  buyoutPrice?: number;
  rightsChain?: string[];
  learningObjectives?: string[];
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
  type: 'video' | 'youtube' | 'text' | 'pdf';
  contentUrl?: string;
  textContent?: string;
  duration?: number;
  order: number;
  isFreePreview?: boolean;
  createdAt: Timestamp | FieldValue | Date;
  description?: string;
}

export interface Quiz {
  id: string;
  title: string;
  description?: string;
  courseId: string;
  sectionId: string;
  instructorId: string;
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
}

export interface Enrollment {
  id: string;
  studentId: string;
  courseId: string;
  instructorId: string;
  progress: number;
  status: 'active' | 'completed';
  enrollmentDate: Timestamp | FieldValue | Date;
  lastAccessedAt?: Timestamp | FieldValue | Date;
  priceAtEnrollment?: number;
  expiresAt?: Timestamp | null;
}

export interface CourseProgress {
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

export interface Assignment {
  id: string;
  courseId: string;
  courseTitle: string;
  sectionId: string;
  instructorId: string;
  title: string;
  description?: string;
  correctionGuide?: string;
  dueDate?: Timestamp | FieldValue | Date;
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
  submissionContent: string;
  submissionUrl?: string;
  grade?: number;
  feedback?: string;
  status: 'submitted' | 'graded';
  submittedAt: Timestamp | FieldValue | Date;
  gradedAt?: Timestamp | FieldValue | Date;
}

export interface CourseQuestion {
  id: string;
  courseId: string;
  courseTitle: string;
  studentId: string;
  studentName: string;
  studentAvatarUrl: string;
  instructorId: string;
  questionText: string;
  answerText?: string;
  status: 'pending' | 'answered';
  createdAt: Timestamp | FieldValue | Date;
  answeredAt?: Timestamp | FieldValue | Date;
}

/* --- ADMINISTRATION & SYSTÈME --- */

export interface Settings {
  general: {
    siteName: string;
    siteDescription: string;
    contactEmail: string;
    supportPhone: string;
    defaultLanguage: string;
    defaultCountry: string;
    logoUrl?: string;
    loginBackgroundImage?: string;
  };
  social: {
    facebookUrl?: string;
    instagramUrl?: string;
    twitterUrl?: string;
    linkedinUrl?: string;
    youtubeUrl?: string;
    telegramUrl?: string;
    tiktokUrl?: string;
  };
  platform: {
    maintenanceMode: boolean;
    announcementMessage: string;
    allowTeacherToTeacherResale: boolean;
    allowCourseBuyout: boolean;
    allowResaleRights: boolean;
    allowInstructorSignup: boolean;
    allowYoutube: boolean;
    allowBunny: boolean;
    ai?: {
      autoCorrection: boolean;
      autonomousTutor: boolean;
      fraudDetection: boolean;
    };
  };
  commercial: {
    platformCommission: number;
    instructorShare: number;
    minPayoutThreshold: number;
    withdrawalFee: number;
    payoutDelayDays: number;
    currency: string;
    affiliatePercentage: number;
  };
  payments: {
    enableMtn: boolean;
    enableOrange: boolean;
    mesombEnabled: boolean;
    monerooEnabled: boolean;
    paymentMode: 'test' | 'live';
  };
  appearance?: DesignSettings;
  content?: {
    landingPage?: any;
    aboutPage?: any;
  };
}

export interface DesignSettings {
  primaryColor: string;
  borderRadius: 'none' | 'md' | 'lg' | 'xl';
  fontScale: 'small' | 'medium' | 'large';
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
  logo: string;
  provider: PaymentProvider;
  active: boolean;
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
}

export interface CourseTemplate {
  id: string;
  imageUrl: string;
  description: string;
  createdAt: Timestamp | FieldValue | Date;
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

export interface PushCampaign {
  id: string;
  message: string;
  target: 'all' | 'instructor' | 'student';
  status: 'scheduled' | 'sent';
  createdAt: Timestamp | FieldValue | Date;
  scheduledFor: Timestamp | FieldValue | Date;
  sentAt?: Timestamp | FieldValue | Date;
  stats?: {
    delivered: number;
    clicked: number;
  };
}

export interface AdminAuditLog {
  id: string;
  adminId: string;
  eventType: string;
  target: {
    id: string;
    type: string;
  };
  details: string;
  timestamp: Timestamp | FieldValue | Date;
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

/* --- AI & RECOMMANDATIONS --- */

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

/* --- MESSAGERIE --- */

export interface Chat {
  id: string;
  participants: string[];
  participantCategories: string[];
  lastMessage: string;
  lastSenderId: string;
  unreadBy: string[];
  updatedAt: Timestamp | FieldValue | Date;
  createdAt: Timestamp | FieldValue | Date;
  status?: 'active' | 'blocked';
}

export interface Message {
  id: string;
  senderId: string;
  text: string;
  status: 'sent' | 'delivered' | 'read';
  createdAt: Timestamp | FieldValue | Date;
}

/* --- I18N --- */

export interface TeamMember {
  name: string;
  role: string;
  bio: string;
  imageUrl: string;
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

export interface CartItem {
  id: string;
  courseId: string;
  title: string;
  price: number;
  imageUrl: string;
}

export interface Notification {
  id: string;
  text: string;
  link?: string;
  type: 'success' | 'info' | 'reminder' | 'alert';
  read: boolean;
  createdAt: Timestamp | FieldValue | Date;
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