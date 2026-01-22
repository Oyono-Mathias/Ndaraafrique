'use client';

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import type { Dispatch, SetStateAction, ReactNode } from 'react';
import { useUser } from '@/firebase';
import { doc, onSnapshot, getFirestore, Timestamp, setDoc, serverTimestamp, getDoc, updateDoc, DocumentData } from 'firebase/firestore';
import { User, onIdTokenChanged, signOut } from 'firebase/auth';
import { getAuth } from 'firebase/auth';
import type { NdaraUser, UserRole } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

interface RoleContextType {
  role: UserRole;
  setRole: Dispatch<SetStateAction<UserRole>>;
  availableRoles: UserRole[];
  setAvailableRoles: Dispatch<SetStateAction<UserRole[]>>;
  switchRole: (newRole: UserRole) => void;
  secureSignOut: () => Promise<void>;
  loading: boolean;
  currentUser: NdaraUser | null;
  ndaraUser: any;
  formaAfriqueUser: any;
  user: User | null;
  isUserLoading: boolean;
  setCurrentUser: React.Dispatch<React.SetStateAction<NdaraUser | null>>;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export function RoleProvider({ children }: { children: ReactNode }) {
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();
  const [currentUser, setCurrentUser] = useState<NdaraUser | null>(null);
  const [role, setRole] = useState<UserRole>('student');
  const [availableRoles, setAvailableRoles] = useState<UserRole[]>(['student']);
  const [loading, setLoading] = useState(true);
  const db = getFirestore();

  const secureSignOut = useCallback(async () => {
    const auth = getAuth();
    if (auth.currentUser) {
        const userDocRef = doc(db, 'users', auth.currentUser.uid);
        await setDoc(userDocRef, { isOnline: false, lastSeen: serverTimestamp() }, { merge: true }).catch(console.error);
    }
    await signOut(auth);
  }, [db]);

   useEffect(() => {
    const auth = getAuth();
    const handleBeforeUnload = () => {
        if (auth.currentUser) {
            const userDocRef = doc(db, 'users', auth.currentUser.uid);
            updateDoc(userDocRef, { isOnline: false, lastSeen: serverTimestamp() });
        }
    };
    const unsubscribe = onIdTokenChanged(auth, async (user) => {
      if (user) {
        const userRef = doc(db, 'users', user.uid);
        await setDoc(userRef, { isOnline: true, lastSeen: serverTimestamp() }, { merge: true });
        window.addEventListener('beforeunload', handleBeforeUnload);
      }
    });

    return () => {
        window.removeEventListener('beforeunload', handleBeforeUnload);
        unsubscribe();
    };
  }, [db]);


  useEffect(() => {
    if (isUserLoading) {
      setLoading(true);
      return;
    }
    
    if (!user) {
      setCurrentUser(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const userDocRef = doc(db, 'users', user.uid);

    const unsubscribe = onSnapshot(userDocRef, async (userDoc) => {
        if (userDoc.exists()) {
          const userData = userDoc.data() as NdaraUser;

          // --- LAZY MIGRATION: Ensure all fields exist for older documents ---
          const defaultFields: Partial<NdaraUser> = {
            phoneNumber: '',
            bio: '',
            socialLinks: { website: '', twitter: '', linkedin: '', youtube: '' },
            payoutInfo: {},
            instructorNotificationPreferences: { newEnrollment: true, newMessage: true, newAssignmentSubmission: true, courseStatusUpdate: true, payoutUpdate: true },
            pedagogicalPreferences: { aiAssistanceEnabled: true, aiInterventionLevel: 'medium' },
            notificationPreferences: { newPayouts: true, newApplications: true, newSupportTickets: true, financialAnomalies: true },
            careerGoals: { currentRole: '', interestDomain: '', mainGoal: '' },
            badges: [],
            permissions: {},
            status: 'active',
            isInstructorApproved: false,
          };
          
          const updatePayload: DocumentData = {};
          let needsUpdate = false;

          for (const key in defaultFields) {
              if (userData[key as keyof NdaraUser] === undefined) {
                  updatePayload[key] = defaultFields[key as keyof typeof defaultFields];
                  needsUpdate = true;
              }
          }
          
          if (userData.isProfileComplete === undefined) {
              updatePayload.isProfileComplete = !!(userData.username && userData.careerGoals?.interestDomain);
              needsUpdate = true;
          }
          
          if (needsUpdate) {
            try {
              await setDoc(userDocRef, updatePayload, { merge: true });
              // The snapshot listener will automatically re-fire with the updated data.
              // We return here to wait for the next snapshot, avoiding processing of partial data.
              return; 
            } catch (e) {
                console.error(`Failed to migrate user document for ${user.uid}:`, e);
                // If migration fails, we proceed with potentially partial data to not break the app.
            }
          }
          // --- END MIGRATION ---

          if (userData.status === 'suspended') {
            await secureSignOut();
            toast({
                variant: 'destructive',
                title: 'Compte suspendu',
                description: 'Votre compte a été suspendu. Veuillez contacter le support pour plus d\'informations.',
                duration: Infinity,
            });
            setLoading(false);
            return;
          }
          
          const roles: UserRole[] = ['student'];
          if (userData.role === 'instructor' || userData.role === 'admin') {
              roles.push('instructor');
          }
           if (userData.role === 'admin') {
              roles.push('admin');
          }

          let finalPermissions: { [key: string]: boolean } = {};
          if (userData.role) {
            try {
              const roleDocRef = doc(db, 'roles', userData.role);
              const roleDocSnap = await getDoc(roleDocRef);
              if (roleDocSnap.exists()) {
                  finalPermissions = roleDocSnap.data().permissions || {};
              }
            } catch (e) {
              console.error("Could not fetch role document:", e);
            }
          }

          if (userData.permissions) {
              finalPermissions = { ...finalPermissions, ...userData.permissions };
          }

          const resolvedUser: NdaraUser = {
              ...userData,
              uid: user.uid,
              email: user.email || '',
              username: userData.username || user.displayName?.replace(/\s/g, '_').toLowerCase() || 'user' + user.uid.substring(0,5),
              fullName: userData.fullName || user.displayName || 'Utilisateur Ndara',
              availableRoles: roles,
              profilePictureURL: user.photoURL || userData.profilePictureURL || `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(userData.fullName || 'A')}`,
              status: userData.status || 'active',
              isProfileComplete: !!(userData.username && userData.careerGoals?.interestDomain),
              permissions: finalPermissions,
          };
          
          setCurrentUser(resolvedUser);
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
            
            // This is where a new user doc is created (e.g., first Google sign-in)
            // Ensure this object is ALWAYS complete.
            const newUserDoc: Omit<NdaraUser, 'availableRoles'> = {
                uid: user.uid,
                email: user.email || '',
                username: defaultUsername,
                fullName: user.displayName || 'Utilisateur Ndara',
                role: 'student',
                status: 'active',
                isInstructorApproved: false,
                profilePictureURL: user.photoURL || `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(user.displayName || 'A')}`,
                isProfileComplete: false,
                createdAt: serverTimestamp() as Timestamp,
                lastLogin: serverTimestamp() as Timestamp,
                isOnline: true,
                lastSeen: serverTimestamp() as Timestamp,
                phoneNumber: '',
                bio: '',
                socialLinks: { website: '', twitter: '', linkedin: '', youtube: '' },
                payoutInfo: {},
                instructorNotificationPreferences: { newEnrollment: true, newMessage: true, newAssignmentSubmission: true, courseStatusUpdate: true, payoutUpdate: true },
                pedagogicalPreferences: { aiAssistanceEnabled: true, aiInterventionLevel: 'medium' },
                notificationPreferences: { newPayouts: true, newApplications: true, newSupportTickets: true, financialAnomalies: true },
                careerGoals: { currentRole: '', interestDomain: '', mainGoal: '' },
                badges: [],
                permissions: {},
            };
            
            setDoc(userDocRef, newUserDoc);
            // The snapshot listener will re-fire once the doc is created, so we don't need to do anything else here.
            return;
        }
        setLoading(false);
    }, (error) => {
        console.error("Error fetching user data:", error);
        setLoading(false);
    });

    return () => unsubscribe();
  }, [user, isUserLoading, db, secureSignOut, toast]);

  const switchRole = useCallback((newRole: UserRole) => {
    if (availableRoles.includes(newRole)) {
      setRole(newRole);
      localStorage.setItem('ndaraafrique-role', newRole);
    } else {
      console.warn(`Role switch to "${newRole}" denied. Not an available role.`);
    }
  }, [availableRoles]);
  
  const value = useMemo(() => ({
    role,
    setRole,
    availableRoles,
    setAvailableRoles,
    switchRole,
    secureSignOut,
    loading: isUserLoading || loading,
    currentUser,
    user,
    isUserLoading,
    setCurrentUser,
    ndaraUser: currentUser,
    formaAfriqueUser: currentUser,
  }), [role, availableRoles, switchRole, secureSignOut, isUserLoading, loading, currentUser, user]);

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
