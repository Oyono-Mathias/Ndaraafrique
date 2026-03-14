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

export interface ReferralCommission {
  id: string;
  instructorId: string;
  studentId: string;
  studentName: string;
  courseId: string;
  courseTitle: string;
  amount: number;
  commission: number;
  timestamp: Timestamp | FieldValue;
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

export interface CartItem {
  id: string; 
  courseId: string;
  title: string;
  price: number;
  imageUrl: string;
  addedAt: Timestamp | FieldValue;
}

export interface InvestorLead {
  id: string;
  fullName: string;
  email: string;
  organization?: string;
  message?: string;
  status: 'new' | 'contacted' | 'interested' | 'rejected';
  createdAt: Timestamp | FieldValue;
}

export interface Lecture {
  id: string;
  title: string;
  description?: string;
  order: number;
  type: 'video' | 'youtube' | 'text' | 'pdf';
  contentUrl?: string; 
  textContent?: string; 
  duration?: number; 
  isFreePreview?: boolean;
  createdAt?: Timestamp | FieldValue;
  updatedAt?: Timestamp | FieldValue;
}

export interface Section {
  id: string;
  title: string;
  order: number;
  createdAt?: Timestamp | FieldValue;
}

export interface Assignment {
  id: string;
  title: string;
  description: string;
  courseId: string;
  sectionId: string;
  instructorId?: string;
  courseTitle?: string;
  correctionGuide?: string;
  attachments?: { name: string; url: string }[];
  dueDate?: Timestamp | FieldValue;
  createdAt: Timestamp | FieldValue;
  updatedAt?: Timestamp | FieldValue;
}

export interface Course {
    id: string;
    courseId?: string; 
    title: string;
    description: string;
    instructorId: string;
    category: string;
    price: number;
    originalPrice?: number;
    status: 'Draft' | 'Published' | 'Pending Review';
    buyoutStatus?: 'none' | 'requested' | 'approved';
    buyoutPrice?: number;
    isPlatformOwned?: boolean;
    originalInstructorId?: string;
    resaleRightsAvailable?: boolean;
    resaleRightsPrice?: number;
    rightsChain?: string[]; 
    thumbnailUrl?: string;
    imageUrl?: string;
    createdAt?: Timestamp | FieldValue;
    updatedAt?: Timestamp | FieldValue;
    publishedAt?: Timestamp | FieldValue;
    currency?: string;
    learningObjectives?: string[];
    prerequisites?: string[];
    targetAudience?: string;
    sections?: Section[];
    isPopular?: boolean;
    contentType?: 'video' | 'ebook';
    ebookUrl?: string;
    language?: string;
    participantsCount?: number;
    rating?: number;
    previewVideoUrl?: string;
    moderationFeedback?: string;
}

export interface CourseProgress {
  id: string; 
  userId: string;
  courseId: string;
  courseTitle: string;
  courseCover?: string;
  completedLessons: string[];
  lastLessonId: string;
  lastLessonTitle: string;
  progressPercent: number;
  lastVideoTime?: number;
  updatedAt: Timestamp | FieldValue;
}


export interface Enrollment {
    id: string;
    studentId: string;
    courseId: string;
    instructorId: string;
    enrollmentDate: Timestamp | FieldValue;
    progress: number;
    priceAtEnrollment: number; 
    status?: 'pending' | 'active'; 
    completedLessons?: string[];
    lastWatchedLesson?: string;
    lastAccessedAt?: Timestamp | FieldValue;
    expiresAt?: Timestamp | FieldValue;
    enrollmentType?: 'paid' | 'admin_grant' | 'free';
    transactionId?: string;
    affiliateId?: string; 
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

export interface SupportTicket {
  id: string;
  userId: string;
  instructorId: string;
  courseId: string;
  subject: string;
  lastMessage: string;
  status: 'ouvert' | 'fermé';
  category: 'Paiement' | 'Technique' | 'Pédagogique';
  createdAt: Timestamp | FieldValue;
  updatedAt: Timestamp | FieldValue;
  resolution?: string;
}

export interface CourseQuestion {
  id: string;
  courseId: string;
  studentId: string;
  instructorId: string;
  questionText: string;
  answerText?: string;
  status: 'answered' | 'pending';
  createdAt: Timestamp | FieldValue;
  answeredAt?: Timestamp | FieldValue;
  courseTitle: string;
  studentName: string;
  studentAvatarUrl?: string;
}

export interface Notification {
  id: string;
  text: string;
  createdAt: Timestamp | FieldValue;
  read: boolean;
  link?: string;
  type?: 'success' | 'info' | 'reminder' | 'alert';
}

export interface Announcement {
  id: string;
  courseId: string;
  courseTitle?: string;
  instructorId: string;
  title: string;
  message: string;
  createdAt: Timestamp | FieldValue;
}

export interface UserActivity {
  id: string;
  userId: string;
  type: 'enrollment' | 'certificate' | 'review' | 'assignment';
  title: string;
  description?: string;
  relatedId?: string;
  link: string;
  read: boolean;
  createdAt: Timestamp | FieldValue;
}

export interface DesignSettings {
  primaryColor?: string;
  secondaryColor?: string;
  fontScale?: 'small' | 'medium' | 'large';
  borderRadius?: 'none' | 'md' | 'lg' | 'xl';
  cardStyle?: 'flat' | 'elevated' | 'glass';
  defaultTheme?: 'light' | 'dark' | 'system';
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
  platform?: {
    allowTeacherToTeacherResale?: boolean;
    allowCourseBuyout?: boolean;
    allowResaleRights?: boolean;
    maintenanceMode?: boolean;
    announcementMessage?: string;
    allowInstructorSignup?: boolean;
    allowYoutube?: boolean;
    allowBunny?: boolean;
    resaleRightsPercentage?: number;
  };
  commercial: {
    platformCommission: number;
    instructorShare: number;
    affiliatePercentage: number;
    minPayoutThreshold: number;
    withdrawalFee: number;
    payoutDelayDays: number;
    currency: string;
  };
  payments: {
    enableMtn: boolean;
    enableOrange: boolean;
    enableWave?: boolean;
    enableCard?: boolean;
    momoMerchantId?: string;
    momoApiKey?: string;
    paymentMode: 'test' | 'live';
  };
  courses: {
    autoApproval: boolean;
    minPrice: number;
    maxPrice: number;
    allowFree: boolean;
    maxLessons: number;
    maxVideoDuration: number;
  };
  instructors: {
    verificationRequired: boolean;
    autoApproval: boolean;
    maxCoursesPerUser: number;
    expertBadgeEnabled: boolean;
  };
  students: {
    allowRegistration: boolean;
    emailVerification: boolean;
    phoneVerification: boolean;
    dailyDownloadLimit: number;
  };
  affiliate: {
    enabled: boolean;
    commissionRate: number;
    cookieDurationDays: number;
    payoutThreshold: number;
  };
  notifications: {
    enableEmail: boolean;
    enableInApp: boolean;
    notifySales: boolean;
    notifyEnrollments: boolean;
    notifyMessages: boolean;
  };
  security: {
    enable2fa: boolean;
    maxLoginAttempts: number;
    ipBlacklist: string[];
    accountProtectionRules: string;
  };
  appearance: DesignSettings;
  analytics: {
    googleAnalyticsId?: string;
    facebookPixelId?: string;
    conversionTracking: boolean;
    internalAnalytics: boolean;
  };
  storage: {
    useBunnyCdn: boolean;
    bunnyZoneName?: string;
    bunnyApiKey?: string;
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
    templates: {
      welcome?: string;
      purchase?: string;
      certificate?: string;
    };
  };
  roles: {
    adminPermissions: string[];
    instructorPermissions: string[];
    studentPermissions: string[];
  };
  content?: {
    landingPage?: {
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
      ctaTitle?: string;
      teamMembers?: TeamMember[];
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
  refundedAt?: Timestamp | FieldValue;
  refundTicketId?: string;
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
  processedAt?: Timestamp | FieldValue;
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
