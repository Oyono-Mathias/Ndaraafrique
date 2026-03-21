import type { Timestamp, FieldValue } from "firebase/firestore";

/**
 * @fileOverview SOURCE DE VÉRITÉ - NDARA AFRIQUE v2.5
 * Architecture hybride : Education + Fintech P2P
 */

/* =========================
   👤 UTILISATEURS & PROFILS
========================= */

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
  submittedAt?: Timestamp | Date;
  status?: 'pending' | 'approved' | 'rejected';
  decisionDate?: Timestamp | Date;
  feedback?: string;
}

export interface NdaraUser {
  uid: string;
  email: string;
  username: string;
  fullName: string;
  displayName: string; // Compatibilité Firebase Auth
  photoURL?: string;   // Compatibilité Firebase Auth
  profilePictureURL?: string;
  phoneNumber?: string;
  country?: string;
  countryCode?: string;
  countryName?: string;
  role: UserRole;
  status: 'active' | 'suspended';
  
  // Finance
  walletBalance: number; 
  balance?: number; // Alias compatibilité
  virtualBalance?: number;
  currency?: string;

  // Expert Mode
  isInstructorApproved: boolean;
  instructorApplication?: InstructorApplication;
  bio?: string;
  rating?: number;
  
  // Preferences & Meta
  preferredLanguage?: string;
  isProfileComplete: boolean;
  isOnline?: boolean;
  lastSeen?: Timestamp | FieldValue | Date;
  createdAt?: Timestamp | FieldValue | Date;
  
  notificationPreferences?: {
    newPayouts: boolean;
    newApplications: boolean;
    newSupportTickets: boolean;
    financialAnomalies: boolean;
  };

  careerGoals?: {
    currentRole: string;
    interestDomain: string;
    mainGoal: string;
  };

  badges?: string[];
  permissions?: Record<string, boolean>;
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
}

/* =========================
   📚 PÉDAGOGIE (COURS)
========================= */

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
  createdAt?: Timestamp | FieldValue | Date;
  updatedAt?: Timestamp | FieldValue | Date;
  learningObjectives?: string[];
  isPlatformOwned?: boolean;
  resaleRightsAvailable?: boolean;
  resaleRightsPrice?: number;
  buyoutStatus?: 'none' | 'requested' | 'approved';
  buyoutPrice?: number;
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
}

export interface Quiz {
  id: string;
  courseId: string;
  sectionId: string;
  instructorId: string;
  title: string;
  questionsCount: number;
  createdAt: Timestamp | FieldValue | Date;
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

/* =========================
   💳 FINANCES (TRANSACTIONS)
========================= */

export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded';

export interface Payment {
  id: string;
  userId: string;
  courseId?: string;
  courseTitle?: string;
  amount: number;
  currency: 'XAF' | 'XOF';
  method: 'MTN' | 'ORANGE' | 'WALLET';
  status: PaymentStatus;
  phoneNumber?: string;
  commissionAmount?: number; // Pour le profit direct plateforme
  createdAt?: Timestamp | Date;
  date?: Timestamp | FieldValue | Date; // Compatibilité Firestore
  metadata?: any;
}

export interface WalletTransaction {
  id: string;
  userId: string;
  type: 'deposit' | 'withdrawal' | 'purchase' | 'commission';
  amount: number;
  status: 'pending' | 'completed' | 'failed';
  reference?: string;
  createdAt?: Timestamp | Date;
}

export interface PayoutRequest {
  id: string;
  instructorId: string;
  amount: number;
  method: 'mobile_money' | 'bank_transfer';
  status: 'pending' | 'approved' | 'paid' | 'rejected';
  createdAt: Timestamp | FieldValue | Date;
}

/* =========================
   ❓ INTERACTIONS (Q&A / ANNONCES)
========================= */

export interface CourseQuestion {
  id: string;
  courseId: string;
  courseTitle?: string;
  studentId: string; // Obligatoire
  instructorId?: string;
  question: string; // Champ utilisé dans l'interface
  questionText?: string; // Alias compatibilité
  answer?: string;
  answerText?: string; // Alias compatibilité
  status: 'pending' | 'answered';
  createdAt?: Timestamp | Date;
}

export interface Announcement {
  id: string;
  courseId: string;
  instructorId: string;
  title: string;
  content: string;
  message?: string; // Alias compatibilité
  createdAt?: Timestamp | Date;
}

/* =========================
   ⚙️ RÉGLAGES (SETTINGS)
========================= */

export interface DesignSettings {
  primaryColor?: string;
  borderRadius?: string;
  fontScale?: 'small' | 'medium' | 'large';
}

export interface Settings {
  paymentMode: 'manual' | 'auto';
  general?: {
    siteName: string;
    contactEmail: string;
    logoUrl?: string;
  };
  appearance?: DesignSettings;
  courses?: {
    autoApproval: boolean;
    minPrice: number;
    maxPrice: number;
  };
  content?: {
    landingPage?: {
      securitySection_imageUrl?: string;
      heroTitle?: string;
      heroSubtitle?: string;
      [key: string]: any;
    };
  };
  payments?: {
      mesombEnabled: boolean;
      monerooEnabled: boolean;
      paymentMode: 'test' | 'live';
  };
  commercial?: {
      instructorShare: number;
      affiliatePercentage: number;
  };
}

/* =========================
   🔔 NOTIFICATIONS & AUTRES
========================= */

export interface Notification {
  id: string;
  text: string;
  type: 'success' | 'info' | 'reminder' | 'alert';
  read: boolean;
  link?: string;
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

export interface Review {
  id: string;
  courseId: string;
  studentId: string;
  instructorId: string;
  rating: number;
  comment: string;
  createdAt: Timestamp | FieldValue | Date;
}

export interface Enrollment {
  id: string;
  studentId: string;
  courseId: string;
  instructorId: string;
  status: 'active' | 'completed' | 'suspended';
  progress: number;
  enrollmentDate: Timestamp | FieldValue | Date;
}