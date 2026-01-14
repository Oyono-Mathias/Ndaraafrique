
import type { Timestamp } from "firebase/firestore";

export type UserRole = 'student' | 'instructor' | 'admin';

export interface NdaraUser {
  uid: string;
  email: string;
  username: string;
  fullName: string;
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
  };
  notificationPreferences?: {
    newPayouts: boolean;
    newApplications: boolean;
    newSupportTickets: boolean;
    financialAnomalies: boolean;
  };
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
  country?: string;
  countryCode?: string;
  isProfileComplete?: boolean;
  preferredLanguage?: 'fr' | 'en' | 'sg';
  badges?: string[];
};

export interface Lecture {
  id: string;
  title: string;
  videoUrl?: string;
  duration?: number;
  isFreePreview?: boolean;
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
