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

export interface FCMToken {
  tokens: string[];
  createdAt: Timestamp | FieldValue;
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

export interface InvestorLead {
  id: string;
  fullName: string;
  email: string;
  organization?: string;
  message?: string;
  createdAt: Timestamp | FieldValue;
  status: 'new' | 'contacted' | 'interested' | 'rejected';
}

export interface Lecture {
  id: string;
  title: string;
  description?: string;
  order: number;
  type: 'video' | 'text' | 'pdf';
  contentUrl?: string; // For video & PDF
  textContent?: string; // For text
  duration?: number; // in minutes
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
  correctionGuide?: string;
  attachments?: { name: string; url: string }[];
  dueDate?: Timestamp | FieldValue;
  createdAt: Timestamp | FieldValue;
  updatedAt?: Timestamp | FieldValue;
}

export interface Submission {
    id: string;
    userId: string;
    fileURL: string;
    submittedAt: Timestamp | FieldValue;
    grade?: number;
    feedback?: string;
    status: 'Envoyé' | 'Corrigé' | 'En retard';
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
    previewVideoUrl?: string;
    moderationFeedback?: string;
}

export interface CourseProgress {
  id: string; // Composite ID like userId_courseId
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
    priceAtEnrollment: number; // Price when the user enrolled
    status?: 'pending' | 'active'; // Added status for webhook management
    completedLessons?: string[];
    lastWatchedLesson?: string;
    lastAccessedAt?: Timestamp | FieldValue;
    expiresAt?: Timestamp | FieldValue;
    enrollmentType?: 'paid' | 'admin_grant';
    transactionId?: string;
}

export interface Review {
    id: string;
    courseId: string;
    userId: string;
    instructorId: string; // Keep track of the instructor for easier querying
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
  // Denormalized data for easier display
  courseTitle: string;
  studentName: string;
  studentAvatarUrl?: string;
}

export interface CourseAnswer {
  id: string;
  questionId: string;
  userId: string; // ID of the user who answered (can be student or instructor)
  body: string;
  createdAt: Timestamp | FieldValue;
  isOfficial: boolean; // True if the answer from the course instructor
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

export interface Settings {
  general: {
    siteName: string;
    logoUrl?: string;
    loginBackgroundImage?: string;
    contactEmail: string;
    supportPhone?: string;
  };
  commercial: {
    platformCommission: number;
    currency: string;
    minPayoutThreshold: number;
    featuredCourseId?: string;
  };
  platform: {
    announcementMessage?: string;
    maintenanceMode: boolean;
    allowInstructorSignup: boolean;
    autoApproveCourses: boolean;
    enableInternalMessaging: boolean;
  };
  legal: {
    termsOfService: string;
    privacyPolicy: string;
  };
  content?: {
    aboutPage?: {
      mainTitle: string;
      mainSubtitle: string;
      historyTitle: string;
      historyFrench: string;
      historySango: string;
      visionTitle: string;
      visionFrench: string;
      visionSango: string;
      ctaTitle: string;
      ctaSubtitle: string;
    };
    landingPage?: {
      heroTitle?: string;
      heroSubtitle?: string;
      heroCtaText?: string;
      howItWorksTitle?: string;
      howItWorksSubtitle?: string;
      howItWorks_step1_imageUrl?: string;
      howItWorks_step2_imageUrl?: string;
      howItWorks_step3_imageUrl?: string;
      securitySectionTitle?: string;
      securitySectionSubtitle?: string;
      securitySection_imageUrl?: string;
      finalCtaTitle?: string;
      finalCtaSubtitle?: string;
      finalCtaButtonText?: string;
      finalCta_imageUrl?: string;
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
  userId: string; // The user PERFORMING the action (e.g., admin UID)
  targetId: string; // The user or entity being affected
  eventType: 'suspicious_login' | 'failed_payment' | 'profile_change' | 'user_suspended' | 'user_reinstated' | 'course_approved' | 'course_rejected' | 'alert_resolved';
  details: string; // Human-readable description
  ipAddress?: string;
  timestamp: Timestamp | FieldValue;
  status?: 'open' | 'resolved';
}

export interface AdminAuditLog {
  id: string;
  adminId: string;
  eventType: 'user.status.update' | 'user.role.update' | 'course.moderation' | 'payout.process' | 'security.resolve' | 'role.permissions.update' | 'settings.update' | 'user.delete' | 'user.import' | 'instructor.application' | 'course.grant';
  target: {
    id: string;
    type: 'user' | 'course' | 'payout' | 'payment' | 'security_log' | 'role' | 'settings' | 'enrollment';
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

export interface QuizAttempt {
    id: string;
    userId: string;
    quizId: string;
    courseId: string;
    answers: Record<string, number>; // questionId: selectedOptionIndex
    score: number;
    submittedAt: Timestamp | FieldValue;
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
  eventType: 'page_view' | 'cta_click' | 'payment_method_click';
  sessionId: string;
  pageUrl: string;
  metadata?: Record<string, any>;
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