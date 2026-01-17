
'use client';

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import type { Dispatch, SetStateAction, ReactNode } from 'react';
import { useUser } from '@/firebase/provider';
import { doc, onSnapshot, getFirestore, Timestamp, setDoc, serverTimestamp, getDoc, updateDoc } from 'firebase/firestore';
import { User, onIdTokenChanged, signOut } from 'firebase/auth';
import { getAuth } from 'firebase/auth';
import type { NdaraUser, UserRole } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useLocale } from 'next-intl';

interface RoleContextType {
  role: UserRole;
  setRole: Dispatch<SetStateAction<UserRole>>;
  availableRoles: UserRole[];
  setAvailableRoles: Dispatch<SetStateAction<UserRole[]>>;
  switchRole: (newRole: UserRole) => void;
  secureSignOut: () => Promise<void>;
  loading: boolean;
  currentUser: NdaraUser | null;
  ndaraUser: any; // Correction Maître pour la stabilité
  formaAfriqueUser: any; // Correction Maître pour la stabilité
  user: User | null; // From Firebase Auth
  isUserLoading: boolean; // From Firebase Auth
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
  const locale = useLocale();

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
            // This is a best-effort synchronous update. In a real app,
            // you might use navigator.sendBeacon or a Cloud Function for reliability.
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
          const userData = userDoc.data() as Omit<NdaraUser, 'uid' | 'email' | 'availableRoles'>;

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

           // Fetch role permissions
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

          // Apply user-specific overrides
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
              preferredLanguage: userData.preferredLanguage || 'fr',
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
            const defaultUser: NdaraUser = {
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
                preferredLanguage: locale as 'fr' | 'en',
            };
            setCurrentUser(defaultUser);
            setAvailableRoles(['student']);
            setRole('student');
        }
        setLoading(false);
    }, (error) => {
        console.error("Error fetching user data:", error);
        setLoading(false);
    });

    return () => unsubscribe();
  }, [user, isUserLoading, db, secureSignOut, toast, locale]);

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
    ndaraUser: currentUser, // Backwards compatibility
    formaAfriqueUser: currentUser, // Backwards compatibility
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
