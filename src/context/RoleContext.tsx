
"use client";

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import type { Dispatch, SetStateAction, ReactNode } from 'react';
import { useUser } from '@/firebase/provider';
import { doc, onSnapshot, getFirestore, Timestamp, setDoc, serverTimestamp } from 'firebase/firestore';
import { User, onIdTokenChanged, signOut } from 'firebase/auth';
import i18n from '@/i18n';
import { getAuth } from 'firebase/auth';

export type UserRole = 'student' | 'instructor' | 'admin';

export interface FormaAfriqueUser {
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
        interestDomain?: string; // This is the category for matchmaking
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
}

interface RoleContextType {
  role: UserRole;
  setRole: Dispatch<SetStateAction<UserRole>>;
  availableRoles: UserRole[];
  setAvailableRoles: Dispatch<SetStateAction<UserRole[]>>;
  switchRole: (newRole: UserRole) => void;
  secureSignOut: () => Promise<void>;
  loading: boolean;
  formaAfriqueUser: FormaAfriqueUser | null;
  user: User | null; // From Firebase Auth
  isUserLoading: boolean; // From Firebase Auth
  setFormaAfriqueUser: React.Dispatch<React.SetStateAction<FormaAfriqueUser | null>>;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export function RoleProvider({ children }: { children: ReactNode }) {
  const { user, isUserLoading } = useUser();
  const [formaAfriqueUser, setFormaAfriqueUser] = useState<FormaAfriqueUser | null>(null);
  const [role, setRole] = useState<UserRole>('student');
  const [availableRoles, setAvailableRoles] = useState<UserRole[]>(['student']);
  const [loading, setLoading] = useState(true);
  const db = getFirestore();

   useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onIdTokenChanged(auth, async (user) => {
      if (user) {
        // Set user presence to online
        const userRef = doc(db, 'users', user.uid);
        await setDoc(userRef, { isOnline: true, lastSeen: serverTimestamp() }, { merge: true });

        // Set offline on disconnect
        const presenceRef = doc(db, 'users', user.uid);
        // This part needs a more robust solution like Cloud Functions + Realtime Database for production
        // For client-side, this is a best-effort approach
        window.addEventListener('beforeunload', () => {
            setDoc(presenceRef, { isOnline: false, lastSeen: serverTimestamp() }, { merge: true });
        });
      }
    });

    return () => unsubscribe();
  }, [db]);


  useEffect(() => {
    if (isUserLoading) {
      setLoading(true);
      return;
    }
    
    if (!user) {
      setFormaAfriqueUser(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const userDocRef = doc(db, 'users', user.uid);

    const unsubscribe = onSnapshot(userDocRef, (userDoc) => {
        if (userDoc.exists()) {
          const userData = userDoc.data() as Omit<FormaAfriqueUser, 'uid' | 'email' | 'availableRoles'>;
          
          const roles: UserRole[] = ['student'];
          if (userData.role === 'instructor' || userData.role === 'admin') {
              roles.push('instructor');
          }
           if (userData.role === 'admin') {
              roles.push('admin');
          }

          const resolvedUser: FormaAfriqueUser = {
              ...userData,
              uid: user.uid,
              email: user.email || '',
              username: userData.username || user.displayName?.replace(/\s/g, '_').toLowerCase() || 'user' + user.uid.substring(0,5),
              fullName: userData.fullName || user.displayName || 'Utilisateur Ndara',
              availableRoles: roles,
              profilePictureURL: user.photoURL || userData.profilePictureURL || `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(userData.fullName || 'A')}`,
              status: userData.status || 'active',
              isProfileComplete: !!(userData.username && userData.careerGoals?.interestDomain),
          };
          
          const currentLang = i18n.language;
          const preferredLang = resolvedUser.preferredLanguage;
          if (preferredLang && currentLang !== preferredLang && !currentLang.startsWith(preferredLang)) {
              i18n.changeLanguage(preferredLang);
          }


          setFormaAfriqueUser(resolvedUser);
          setAvailableRoles(roles);

          const lastRole = localStorage.getItem('ndaraafrique-role') as UserRole;
          
          let newRole: UserRole;
          
          if (lastRole && roles.includes(lastRole)) {
            newRole = lastRole;
          } else {
            newRole = userData.role;
          }

          setRole(newRole);
          localStorage.setItem('ndaraafrique-role', newRole);

        } else {
            console.warn("User document not found in Firestore for UID:", user.uid);
            const defaultUsername = user.displayName?.replace(/\s/g, '_').toLowerCase() || 'user' + user.uid.substring(0,5);
            const defaultUser: FormaAfriqueUser = {
                uid: user.uid,
                email: user.email || '',
                username: defaultUsername,
                fullName: user.displayName || 'Utilisateur Ndara',
                role: 'student',
                status: 'active',
                isInstructorApproved: false,
                availableRoles: ['student'],
                profilePictureURL: user.photoURL || '',
                isProfileComplete: false,
            };
            setFormaAfriqueUser(defaultUser);
            setAvailableRoles(['student']);
            setRole('student');
        }
        setLoading(false);
    }, (error) => {
        console.error("Error fetching user data:", error);
        setLoading(false);
    });

    return () => unsubscribe();
  }, [user, isUserLoading, db]);

  const switchRole = useCallback((newRole: UserRole) => {
    if (availableRoles.includes(newRole)) {
      setRole(newRole);
      localStorage.setItem('ndaraafrique-role', newRole);
    } else {
      console.warn(`Role switch to "${newRole}" denied. Not an available role.`);
    }
  }, [availableRoles]);

  const secureSignOut = async () => {
    const auth = getAuth();
    // The clearPersistence function is not available in all SDK versions and can cause issues.
    // A simple signOut is sufficient and more stable for this use case.
    await signOut(auth);
  };
  
  const value = useMemo(() => ({
    role,
    setRole,
    availableRoles,
    setAvailableRoles,
    switchRole,
    secureSignOut,
    loading: isUserLoading || loading,
    formaAfriqueUser,
    setFormaAfriqueUser,
    user,
    isUserLoading
  }), [role, availableRoles, switchRole, secureSignOut, loading, formaAfriqueUser, user, isUserLoading]);

  return (
    <RoleContext.Provider value={value}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const context = useContext(RoleContext);
  if (context === undefined) {
    throw new Error('useRole must be used within a RoleProvider');
  }
  return context;
}
