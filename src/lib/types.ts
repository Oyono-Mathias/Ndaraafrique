import type { Timestamp } from "firebase/firestore";

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
  createdAt: Timestamp;
  updatedAt?: Timestamp;
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
  createdAt?: Timestamp;
  lastLogin?: Timestamp;
  isOnline?: boolean;
  lastSeen?: Timestamp;
  termsAcceptedAt?: Timestamp;
  isProfileComplete?: boolean;
  badges?: string[];
  permissions?: { [key: string]: boolean };
};

export interface Lecture {
  id: string;
  title: string;
  videoUrl?: string;
  description?: string;
  duration?: number;
  isFreePreview?: boolean;
  order?: number;
}

export interface Section {
  id: string;
  title: string;
  order: number;
  lectures?: Lecture[];
}

export interface Assignment {
  id: string;
  title: string;
  description?: string;
  courseId: string;
  correctionGuide?: string;
  createdAt: Timestamp;
}

export interface Submission {
    id: string;
    userId: string;
    fileURL: string;
    submittedAt: Timestamp;
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
    imageUrl?: string;
    createdAt?: Timestamp;
    updatedAt?: Timestamp;
    publishedAt?: Timestamp;
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
}

export interface CourseProgress {
  id: string; // Composite ID like userId_courseId
  userId: string;
  courseId: string;
  courseTitle: string;
  courseCover?: string;
  lastLessonId: string;
  lastLessonTitle: string;
  progressPercent: number;
  lastVideoTime?: number;
  updatedAt: Timestamp;
}


export interface Enrollment {
    id: string;
    studentId: string;
    courseId: string;
    instructorId: string;
    enrollmentDate: Timestamp;
    progress: number;
    priceAtEnrollment: number; // Price when the user enrolled
    completedLessons?: string[];
    lastWatchedLesson?: string;
    lastAccessedAt?: Timestamp;
    expiresAt?: Timestamp;
    enrollmentType?: 'paid' | 'admin_grant';
}

export interface Review {
    id: string;
    courseId: string;
    userId: string;
    instructorId: string; // Keep track of the instructor for easier querying
    rating: number;
    comment: string;
    createdAt: Timestamp;
}

export interface Message {
  id: string;
  senderId: string;
  text: string;
  createdAt: Timestamp;
  status: 'sent' | 'delivered' | 'read';
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
  createdAt: Timestamp;
  updatedAt: Timestamp;
  resolution?: string;
}

export interface CourseQuestion {
  id: string;
  courseId: string;
  studentId: string;
  instructorId: string;
  title: string;
  body: string;
  createdAt: Timestamp;
  status: 'answered' | 'unanswered';
  answerCount: number;
}

export interface CourseAnswer {
  id: string;
  questionId: string;
  userId: string; // ID of the user who answered (can be student or instructor)
  body: string;
  createdAt: Timestamp;
  isOfficial: boolean; // True if the answer is from the course instructor
}


export interface Notification {
  id: string;
  text: string;
  createdAt: Timestamp;
  read: boolean;
  link?: string;
  type?: 'success' | 'info' | 'reminder' | 'alert';
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
  createdAt: Timestamp;
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
  };
}

export interface Payment {
  id: string;
  userId: string;
  instructorId: string;
  courseId: string;
  amount: number;
  currency: string;
  date: any; // Firestore Timestamp
  status: 'Completed' | 'Pending' | 'Failed' | 'Refunded';
  fraudReview?: {
    isSuspicious: boolean;
    riskScore: number;
    reason: string;
    checkedAt: any;
    reviewed?: boolean;
  }
}

export interface SecurityLog {
  id: string;
  userId: string; // The user PERFORMING the action (e.g., admin UID)
  targetId: string; // The user or entity being affected
  eventType: 'suspicious_login' | 'failed_payment' | 'profile_change' | 'user_suspended' | 'user_reinstated' | 'course_approved' | 'course_rejected' | 'alert_resolved';
  details: string; // Human-readable description
  ipAddress?: string;
  timestamp: Timestamp;
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
  timestamp: Timestamp;
  details: string;
}

export interface Question {
  id: string;
  text: string;
  options: string[];
  correctOptionIndex: number;
}

export interface Quiz {
  id: string;
  title: string;
  description?: string;
  courseId: string;
  createdAt: Timestamp;
}

export interface QuizAttempt {
    id: string;
    userId: string;
    quizId: string;
    courseId: string;
    answers: Record<string, number>; // questionId: selectedOptionIndex
    score: number;
    submittedAt: Timestamp;
}

export interface Resource {
    id: string;
    courseId: string;
    instructorId: string;
    title: string;
    type: 'link' | 'file';
    url: string;
    createdAt: Timestamp;
}
